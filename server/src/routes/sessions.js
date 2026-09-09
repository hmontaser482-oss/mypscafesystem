const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { broadcast } = require('../sockets/socketManager');
const { getDeviceEffectiveRates, calculateSessionTotal } = require('../engines/pricingEngine');
const { assertValidSessionTransition } = require('../engines/sessionStateMachine');
const { getLocalDateTimeString, parseLocalDateTime } = require('../utils/dateUtils');

// POST /api/sessions/start (Start a new session on an available device)
router.post('/start', authenticate, (req, res, next) => {
  try {
    const {
      deviceId,
      customerId,
      customerName,
      phone,
      bookingId,
      sessionType = 'single',
      timeMode = 'open',
      durationMinutes = 60,
      gameId,
      notes
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار الجهاز' });
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
    if (!device) {
      return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    }

    if (device.status === 'running' || device.status === 'paused') {
      return res.status(400).json({ success: false, message: 'الجهاز قيد التشغيل بالفعل ولا يمكن بدء جلسة جديدة عليه' });
    }

    if (device.status === 'maintenance') {
      return res.status(400).json({ success: false, message: 'الجهاز في وضع الصيانة الفنية حالياً ولا يمكن بدء جلسة عليه' });
    }

    if (device.status === 'disabled') {
      return res.status(400).json({ success: false, message: 'الجهاز معطل حالياً' });
    }

    // CHECK RESERVATION RULE:
    // If device is marked 'reserved' or has an active/pending booking today
    const nowLocal = getLocalDateTimeString();
    const todayStr = nowLocal.slice(0, 10);
    const currentTimeStr = nowLocal.slice(11, 16);

    const activeBooking = db.prepare(`
      SELECT * FROM bookings 
      WHERE device_id = ? 
        AND booking_date = ? 
        AND status IN ('confirmed', 'pending')
        AND end_time >= ?
      ORDER BY start_time ASC LIMIT 1
    `).get(deviceId, todayStr, currentTimeStr);

    let bookedCustomerMatch = false;
    let finalCustomerName = customerName || 'Walk-in / زائر';
    if (customerId) {
      const cust = db.prepare('SELECT name, phone FROM customers WHERE id = ?').get(customerId);
      if (cust) finalCustomerName = cust.name;
    }

    if (device.status === 'reserved' || activeBooking) {
      const b = activeBooking;
      if (b) {
        const reqName = (finalCustomerName || '').trim().toLowerCase();
        const bookName = (b.customer_name || '').trim().toLowerCase();
        const reqPhone = (phone || '').trim();
        const bookPhone = (b.phone || '').trim();

        if (
          (customerId && b.customer_id && customerId === b.customer_id) ||
          (reqPhone && bookPhone && reqPhone === bookPhone) ||
          (bookingId && bookingId === b.id) ||
          (reqName && bookName && (reqName === bookName || reqName.includes(bookName) || bookName.includes(reqName)))
        ) {
          bookedCustomerMatch = true;
          finalCustomerName = b.customer_name;
        } else {
          return res.status(400).json({
            success: false,
            message: `هذا الجهاز محجوز حالياً للعميل (${b.customer_name} - هاتف: ${b.phone}) من الساعة ${b.start_time} إلى ${b.end_time}. لا يمكن تشغيل الجهاز إلا لنفس العميل صاحب الحجز أو إلغاء الحجز أولاً.`
          });
        }
      }
    }

    // Enforce active shift requirement before starting any session
    const activeShift = db.prepare(`SELECT id, cashier_name FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    if (!activeShift) {
      return res.status(400).json({
        success: false,
        message: 'لا يمكن بدء تشغيل أي جهاز بدون فتح شيفت أولاً. يرجى فتح الشيفت أولاً من شاشة الشيفتات.'
      });
    }
    const shiftId = activeShift.id;

    // Determine hourly rate
    const rates = getDeviceEffectiveRates(deviceId);
    const hourlyRate = sessionType === 'multi' ? rates.multiPrice : rates.singlePrice;

    const sessionId = 'ses_' + uuidv4().slice(0, 8);
    const now = new Date();
    const startTimeStr = getLocalDateTimeString(now);

    let expectedEndTimeStr = null;
    let targetMins = null;
    if (timeMode === 'fixed') {
      targetMins = Number(durationMinutes) || 60;
      const expectedEnd = new Date(now.getTime() + targetMins * 60 * 1000);
      expectedEndTimeStr = getLocalDateTimeString(expectedEnd);
    }

    const runTransaction = db.transaction(() => {
      // 1. Insert session
      db.prepare(`
        INSERT INTO sessions (
          id, device_id, customer_id, customer_name, session_type, time_mode, target_duration_minutes,
          game_id, start_time, expected_end_time, status, base_hourly_rate, cashier_id, shift_id, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, ?, ?)
      `).run(
        sessionId, deviceId, customerId || null, finalCustomerName, sessionType, timeMode, targetMins,
        gameId || null, startTimeStr, expectedEndTimeStr, hourlyRate, req.user.id, shiftId, notes || null
      );

      // 2. Insert initial interval
      const intervalId = 'inv_' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO session_intervals (id, session_id, session_type, hourly_rate, start_time)
        VALUES (?, ?, ?, ?, ?)
      `).run(intervalId, sessionId, sessionType, hourlyRate, startTimeStr);

      // 3. Update device status to running
      db.prepare(`UPDATE devices SET status = 'running', current_session_id = ? WHERE id = ?`).run(sessionId, deviceId);

      // 4. If linked to an active booking, complete the booking
      if (activeBooking && (bookedCustomerMatch || bookingId)) {
        db.prepare(`UPDATE bookings SET status = 'completed', notes = COALESCE(notes || ' | ', '') || 'تم بدء الجلسة في الصالة' WHERE id = ?`).run(activeBooking.id);
      }
    });

    runTransaction();

    if (activeBooking && (bookedCustomerMatch || bookingId)) {
      broadcast('booking:updated', { id: activeBooking.id, status: 'completed' });
    }

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_START',
      entityType: 'session',
      entityId: sessionId,
      newValue: { deviceId, sessionType, timeMode, durationMinutes, customerName: finalCustomerName },
      notes: `بدء جلسة جديدة على جهاز ${device.name}`,
      req
    });

    broadcast('session:started', { sessionId, deviceId });
    broadcast('device:updated', { id: deviceId, status: 'running', current_session_id: sessionId });

    res.json({
      success: true,
      message: `تم بدء الجلسة بنجاح على ${device.name}`,
      sessionId,
      session: { id: sessionId }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/:id (Get full session details with live calculation)
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const session = db.prepare(`
      SELECT s.*, d.name as device_name, d.device_number, gm.name as game_name, u.full_name as cashier_name
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      LEFT JOIN games gm ON s.game_id = gm.id
      LEFT JOIN users u ON s.cashier_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    const calc = calculateSessionTotal(id);
    const intervals = db.prepare('SELECT * FROM session_intervals WHERE session_id = ? ORDER BY start_time ASC').all(id);
    const pauses = db.prepare('SELECT * FROM session_pauses WHERE session_id = ? ORDER BY pause_start ASC').all(id);
    const orders = db.prepare('SELECT * FROM session_orders WHERE session_id = ? ORDER BY created_at ASC').all(id);

    res.json({
      success: true,
      session: {
        ...session,
        liveCalculation: calc,
        intervals,
        pauses,
        orders
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/pause
router.post('/:id/pause', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    assertValidSessionTransition(session.status, 'paused');

    const now = getLocalDateTimeString();
    const pauseId = 'pau_' + uuidv4().slice(0, 8);

    const runTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO session_pauses (id, session_id, pause_start, reason, created_by)
        VALUES (?, ?, ?, ?, ?)
      `).run(pauseId, id, now, reason || 'إيقاف مؤقت بطلب العميل', req.user.id);

      db.prepare(`UPDATE sessions SET status = 'paused', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(id);
      db.prepare(`UPDATE devices SET status = 'paused' WHERE id = ?`).run(session.device_id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_PAUSE',
      entityType: 'session',
      entityId: id,
      notes: reason || 'إيقاف مؤقت للجلسة',
      req
    });

    broadcast('session:paused', { sessionId: id, deviceId: session.device_id });
    broadcast('device:updated', { id: session.device_id, status: 'paused' });

    res.json({ success: true, message: 'تم إيقاف الجلسة مؤقتاً بنجاح' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/resume
router.post('/:id/resume', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    assertValidSessionTransition(session.status, 'running');

    const now = new Date();
    const nowStr = getLocalDateTimeString(now);

    // Find last unclosed pause
    const lastPause = db.prepare('SELECT * FROM session_pauses WHERE session_id = ? AND resume_time IS NULL ORDER BY pause_start DESC LIMIT 1').get(id);

    const runTransaction = db.transaction(() => {
      let pauseSec = 0;
      if (lastPause) {
        const pauseStart = parseLocalDateTime(lastPause.pause_start);
        pauseSec = Math.max(0, Math.floor((now.getTime() - pauseStart.getTime()) / 1000));
        db.prepare(`UPDATE session_pauses SET resume_time = ?, pause_duration_seconds = ? WHERE id = ?`).run(nowStr, pauseSec, lastPause.id);
      }

      // If fixed session, extend expected_end_time by pauseSec
      if (session.time_mode === 'fixed' && session.expected_end_time && pauseSec > 0) {
        const exp = parseLocalDateTime(session.expected_end_time);
        const newExp = getLocalDateTimeString(new Date(exp.getTime() + pauseSec * 1000));
        db.prepare(`UPDATE sessions SET expected_end_time = ? WHERE id = ?`).run(newExp, id);
      }

      db.prepare(`UPDATE sessions SET status = 'running', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(id);
      db.prepare(`UPDATE devices SET status = 'running' WHERE id = ?`).run(session.device_id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_RESUME',
      entityType: 'session',
      entityId: id,
      notes: 'استئناف تشغيل الجلسة',
      req
    });

    broadcast('session:resumed', { sessionId: id, deviceId: session.device_id });
    broadcast('device:updated', { id: session.device_id, status: 'running' });

    res.json({ success: true, message: 'تم استئناف الجلسة بنجاح' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/extend (Extend fixed time session)
router.post('/:id/extend', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { extraMinutes = 30 } = req.body;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    const extra = Number(extraMinutes);
    if (extra <= 0) return res.status(400).json({ success: false, message: 'يرجى إدخال مدة تمديد صحيحة' });

    const now = new Date();
    let currentEnd = session.expected_end_time ? parseLocalDateTime(session.expected_end_time) : now;
    if (currentEnd < now) currentEnd = now; // if already expired, add from now

    const newEnd = new Date(currentEnd.getTime() + extra * 60 * 1000);
    const newEndStr = getLocalDateTimeString(newEnd);
    const newTargetMinutes = (session.target_duration_minutes || 0) + extra;

    db.prepare(`
      UPDATE sessions 
      SET expected_end_time = ?, target_duration_minutes = ?, status = 'running', updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(newEndStr, newTargetMinutes, id);

    db.prepare(`UPDATE devices SET status = 'running' WHERE id = ?`).run(session.device_id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_EXTEND',
      entityType: 'session',
      entityId: id,
      notes: `تمديد الجلسة بمقدار ${extra} دقيقة`,
      req
    });

    broadcast('session:extended', { sessionId: id, extraMinutes: extra, expectedEndTime: newEndStr });
    broadcast('device:updated', { id: session.device_id, status: 'running' });

    res.json({ success: true, message: `تم تمديد الجلسة بمقدار ${extra} دقيقة بنجاح` });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/change-type (Toggle Single <-> Multi player during session)
router.post('/:id/change-type', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { newType } = req.body; // 'single' or 'multi'

    if (!['single', 'multi'].includes(newType)) {
      return res.status(400).json({ success: false, message: 'نوع الجلسة غير صالح' });
    }

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    if (session.session_type === newType) {
      return res.status(400).json({ success: false, message: `الجلسة بالفعل على وضع ${newType === 'single' ? 'سينجل' : 'مالتي'}` });
    }

    const rates = getDeviceEffectiveRates(session.device_id);
    const newRate = newType === 'multi' ? rates.multiPrice : rates.singlePrice;

    const now = new Date();
    const nowStr = getLocalDateTimeString(now);

    const runTransaction = db.transaction(() => {
      // 1. Close current interval
      const lastInterval = db.prepare('SELECT * FROM session_intervals WHERE session_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1').get(id);
      if (lastInterval) {
        const invStart = parseLocalDateTime(lastInterval.start_time);
        const durationSec = Math.max(0, Math.floor((now.getTime() - invStart.getTime()) / 1000));
        db.prepare(`UPDATE session_intervals SET end_time = ?, duration_seconds = ? WHERE id = ?`).run(nowStr, durationSec, lastInterval.id);
      }

      // 2. Open new interval
      const newInvId = 'inv_' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO session_intervals (id, session_id, session_type, hourly_rate, start_time)
        VALUES (?, ?, ?, ?, ?)
      `).run(newInvId, id, newType, newRate, nowStr);

      // 3. Update session record
      db.prepare(`
        UPDATE sessions 
        SET session_type = ?, base_hourly_rate = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(newType, newRate, id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_CHANGE_TYPE',
      entityType: 'session',
      entityId: id,
      previousValue: session.session_type,
      newValue: newType,
      notes: `تغيير نمط اللعب إلى ${newType === 'single' ? 'Single' : 'Multiplayer'} بسعر ${newRate} ج/ساعة`,
      req
    });

    broadcast('session:updated', { sessionId: id, newType, newRate });

    res.json({
      success: true,
      message: `تم تغيير نمط الجلسة إلى ${newType === 'single' ? 'سينجل' : 'مالتي'} بنجاح`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/transfer (Transfer session to another available device)
router.post('/:id/transfer', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { targetDeviceId, reason } = req.body;

    if (!targetDeviceId) return res.status(400).json({ success: false, message: 'يرجى اختيار الجهاز الجديد المطلوب النقل إليه' });

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    if (session.device_id === targetDeviceId) {
      return res.status(400).json({ success: false, message: 'الجهاز الهدف هو نفس الجهاز الحالي للجلسة' });
    }

    const targetDevice = db.prepare('SELECT * FROM devices WHERE id = ?').get(targetDeviceId);
    if (!targetDevice) return res.status(404).json({ success: false, message: 'الجهاز الهدف غير موجود' });

    if (targetDevice.status !== 'available') {
      return res.status(400).json({ success: false, message: `الجهاز الهدف (${targetDevice.name}) غير متاح حالياً (حالته: ${targetDevice.status})` });
    }

    const fromDeviceId = session.device_id;
    const nowStr = getLocalDateTimeString();

    const runTransaction = db.transaction(() => {
      // 1. Insert session transfer record
      const transferId = 'trf_' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO session_transfers (id, session_id, from_device_id, to_device_id, transfer_time, reason, cashier_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(transferId, id, fromDeviceId, targetDeviceId, nowStr, reason || 'نقل بطلب العميل', req.user.id);

      // 2. Free old device
      db.prepare(`UPDATE devices SET status = 'available', current_session_id = NULL WHERE id = ?`).run(fromDeviceId);

      // 3. Occupy target device with current session status
      db.prepare(`UPDATE devices SET status = ?, current_session_id = ? WHERE id = ?`).run(session.status, id, targetDeviceId);

      // 4. Update session device_id
      db.prepare(`UPDATE sessions SET device_id = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(targetDeviceId, id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_TRANSFER',
      entityType: 'session',
      entityId: id,
      previousValue: fromDeviceId,
      newValue: targetDeviceId,
      notes: `نقل الجلسة من جهاز ${fromDeviceId} إلى ${targetDevice.name}. السبب: ${reason || 'غير محدد'}`,
      req
    });

    broadcast('session:transferred', { sessionId: id, fromDeviceId, targetDeviceId });
    broadcast('device:updated', { id: fromDeviceId, status: 'available', current_session_id: null });
    broadcast('device:updated', { id: targetDeviceId, status: session.status, current_session_id: id });

    res.json({
      success: true,
      message: `تم نقل الجلسة بنجاح إلى جهاز ${targetDevice.name}`
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/orders (Add drinks/snacks to session)
router.post('/:id/orders', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { productId, quantity = 1 } = req.body;

    const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    const qty = Math.max(1, Number(quantity));
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });

    if (product.stock_quantity < qty) {
      return res.status(400).json({ success: false, message: `الكمية المتوفرة في المخزن (${product.stock_quantity}) غير كافية` });
    }

    const totalPrice = product.selling_price * qty;
    const orderId = 'ord_' + uuidv4().slice(0, 8);
    const txId = 'tx_' + uuidv4().slice(0, 8);

    const runTransaction = db.transaction(() => {
      // 1. Insert order item
      db.prepare(`
        INSERT INTO session_orders (id, session_id, product_id, product_name, quantity, unit_price, total_price, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orderId, id, product.id, product.name, qty, product.selling_price, totalPrice, req.user.id);

      // 2. Decrement stock
      db.prepare(`UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?`).run(qty, product.id);

      // 3. Record inventory transaction
      db.prepare(`
        INSERT INTO inventory_transactions (id, product_id, type, quantity, unit_cost, unit_price, reference_id, notes, created_by)
        VALUES (?, ?, 'session_sale', ?, ?, ?, ?, 'إضافة طلب للجلسة', ?)
      `).run(txId, product.id, qty, product.cost_price, product.selling_price, id, req.user.id);

      // 4. Update session products_amount
      const sum = db.prepare('SELECT SUM(total_price) as total FROM session_orders WHERE session_id = ?').get(id);
      db.prepare(`UPDATE sessions SET products_amount = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(Number(sum.total || 0), id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_ADD_ORDER',
      entityType: 'session',
      entityId: id,
      newValue: { productId, productName: product.name, quantity: qty, totalPrice },
      notes: `إضافة ${qty} × ${product.name} لحساب الجلسة`,
      req
    });

    broadcast('session:orders_updated', { sessionId: id });

    res.json({
      success: true,
      message: `تمت إضافة ${product.name} إلى حساب الجلسة بنجاح`,
      orderId
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/sessions/:id/orders/:orderId (Remove order item from session)
router.delete('/:id/orders/:orderId', authenticate, (req, res, next) => {
  try {
    const { id, orderId } = req.params;

    const order = db.prepare('SELECT * FROM session_orders WHERE id = ? AND session_id = ?').get(orderId, id);
    if (!order) return res.status(404).json({ success: false, message: 'الطلب غير موجود في هذه الجلسة' });

    const runTransaction = db.transaction(() => {
      // 1. Restore product stock
      db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(order.quantity, order.product_id);

      // 2. Delete order
      db.prepare('DELETE FROM session_orders WHERE id = ?').run(orderId);

      // 3. Update session products total
      const sum = db.prepare('SELECT SUM(total_price) as total FROM session_orders WHERE session_id = ?').get(id);
      db.prepare(`UPDATE sessions SET products_amount = ?, updated_at = datetime('now', 'localtime') WHERE id = ?`).run(Number(sum?.total || 0), id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_REMOVE_ORDER',
      entityType: 'session',
      entityId: id,
      previousValue: order,
      notes: `إلغاء وإرجاع طلب (${order.product_name}) للمخزن`,
      req
    });

    broadcast('session:orders_updated', { sessionId: id });

    res.json({ success: true, message: 'تم حذف الطلب وإعادة الكمية للمخزون بنجاح' });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/calculate (Get authoritative price check)
router.post('/:id/calculate', (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined') {
      return res.status(400).json({ success: false, message: 'معرف الجلسة غير صالح' });
    }
    const calc = calculateSessionTotal(id);
    res.json({ success: true, calculation: calc });
  } catch (err) {
    next(err);
  }
});

// POST /api/sessions/:id/checkout (End session, create invoice, accept payment)
router.post('/:id/checkout', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      paidAmount,
      paymentMethod = 'cash', // 'cash', 'card', 'wallet', 'split', 'credit'
      discountAmount = 0,
      discountType = 'fixed',
      discountReason,
      splitDetails,
      notes
    } = req.body;

    const session = db.prepare(`
      SELECT s.*, d.name as device_name, r.name as room_name, c.phone as customer_phone
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      LEFT JOIN rooms r ON d.room_id = r.id
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.id = ?
    `).get(id);

    if (!session) return res.status(404).json({ success: false, message: 'الجلسة غير موجودة' });

    const now = new Date();
    const nowStr = getLocalDateTimeString(now);

    // Run authoritative calculation
    const calc = calculateSessionTotal(id, nowStr);

    const discount = Math.max(0, Number(discountAmount) || 0);
    const gamingCost = calc.gamingCost;
    const productsCost = calc.productsCost;
    const subtotal = gamingCost + productsCost;
    const grandTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);

    const paid = Number(paidAmount) || 0;
    const change = Math.max(0, Math.round((paid - grandTotal) * 100) / 100);
    const remaining = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);

    // Validation: if remaining > 0 and payment is not credit/on-account, warn or reject
    let paymentStatus = 'paid';
    if (remaining > 0) {
      if (paymentMethod !== 'credit') {
        return res.status(400).json({
          success: false,
          message: `المبلغ المدفوع (${paid} ج.م) أقل من إجمالي الفاتورة (${grandTotal} ج.م). المتبقي: ${remaining} ج.م. يرجى سداد المبلغ كاملاً أو اختيار الدفع الآجل.`
        });
      }
      paymentStatus = 'partial';
    }

    // Active shift
    const activeShift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    const shiftId = activeShift ? activeShift.id : (session.shift_id || null);

    // Format invoice number: INV-YYYYMMDD-XXXX
    const datePart = nowStr.slice(0, 10).replace(/-/g, '');
    const countToday = db.prepare('SELECT COUNT(*) as c FROM invoices WHERE created_at LIKE ?').get(`${nowStr.slice(0, 10)}%`).c + 1;
    const invoiceNum = `INV-${datePart}-${String(countToday).padStart(4, '0')}`;
    const invoiceId = 'inv_' + uuidv4().slice(0, 8);

    // Format duration string (HH:MM:SS)
    const hours = Math.floor(calc.totalPlayedSeconds / 3600);
    const minutes = Math.floor((calc.totalPlayedSeconds % 3600) / 60);
    const seconds = calc.totalPlayedSeconds % 60;
    const durationFormatted = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const runTransaction = db.transaction(() => {
      // 1. Close active intervals
      db.prepare(`
        UPDATE session_intervals 
        SET end_time = COALESCE(end_time, ?), 
            duration_seconds = CASE WHEN duration_seconds = 0 THEN ? ELSE duration_seconds END
        WHERE session_id = ? AND end_time IS NULL
      `).run(nowStr, calc.totalPlayedSeconds, id);

      // 2. Update session record as completed
      db.prepare(`
        UPDATE sessions
        SET status = 'completed', end_time = ?, total_played_seconds = ?, total_paused_seconds = ?,
            gaming_amount = ?, products_amount = ?, discount_amount = ?, discount_reason = ?,
            total_amount = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `).run(nowStr, calc.totalPlayedSeconds, calc.totalPausedSeconds, gamingCost, productsCost, discount, discountReason || null, grandTotal, id);

      // 3. Free device
      db.prepare(`UPDATE devices SET status = 'available', current_session_id = NULL WHERE id = ?`).run(session.device_id);

      // 4. Create Invoice
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, session_id, customer_id, customer_name, cashier_id, cashier_name,
          shift_id, device_name, room_name, session_start, session_end, session_duration, session_type,
          gaming_subtotal, products_subtotal, subtotal, discount_amount, discount_type, discount_reason,
          grand_total, paid_amount, change_amount, remaining_amount, payment_method, payment_status,
          split_details, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId, invoiceNum, id, session.customer_id, session.customer_name, req.user.id, req.user.full_name,
        shiftId, session.device_name, session.room_name || 'الصالة العامة', session.start_time, nowStr,
        durationFormatted, session.session_type, gamingCost, productsCost, subtotal, discount, discountType,
        discountReason || null, grandTotal, paid, change, remaining, paymentMethod, paymentStatus,
        splitDetails ? JSON.stringify(splitDetails) : null, notes || null, nowStr
      );

      // 5. Create Invoice Items
      // 5a. Gaming item
      const gamingItemId = 'itmg_' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO invoice_items (id, invoice_id, item_type, item_name, quantity, unit_price, total_price)
        VALUES (?, ?, 'gaming', ?, ?, ?, ?)
      `).run(gamingItemId, invoiceId, `وقت لعب (${session.session_type === 'multi' ? 'Multiplayer' : 'Single'} - ${durationFormatted})`, Math.round((calc.totalPlayedSeconds / 3600) * 100) / 100, session.base_hourly_rate, gamingCost);

      // 5b. Product items
      const orders = db.prepare('SELECT * FROM session_orders WHERE session_id = ?').all(id);
      for (const ord of orders) {
        const prodItemId = 'itmp_' + uuidv4().slice(0, 8);
        db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, item_type, product_id, item_name, quantity, unit_price, total_price)
          VALUES (?, ?, 'product', ?, ?, ?, ?, ?)
        `).run(prodItemId, invoiceId, ord.product_id, ord.product_name, ord.quantity, ord.unit_price, ord.total_price);
      }

      // 6. Record Payment
      const paymentId = 'pay_' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO payments (id, invoice_id, amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(paymentId, invoiceId, paid > grandTotal ? grandTotal : paid, paymentMethod, `سداد فاتورة ${invoiceNum}`);

      // 7. Update Shift Financials
      if (shiftId) {
        const cashAmount = paymentMethod === 'cash' ? (paid > grandTotal ? grandTotal : paid) : 0;
        const cardAmount = paymentMethod === 'card' ? grandTotal : 0;
        const walletAmount = paymentMethod === 'wallet' ? grandTotal : 0;

        db.prepare(`
          UPDATE shifts
          SET cash_sales = cash_sales + ?,
              card_sales = card_sales + ?,
              wallet_sales = wallet_sales + ?,
              total_sales = total_sales + ?,
              expected_cash = expected_cash + ?
          WHERE id = ?
        `).run(cashAmount, cardAmount, walletAmount, grandTotal, cashAmount, shiftId);
      }

      // 8. Update Customer History if registered customer
      if (session.customer_id) {
        db.prepare(`
          UPDATE customers
          SET total_visits = total_visits + 1,
              total_spending = total_spending + ?,
              last_visit = ?,
              favorite_device_id = ?
          WHERE id = ?
        `).run(grandTotal, nowStr, session.device_id, session.customer_id);
      }
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SESSION_CHECKOUT',
      entityType: 'session',
      entityId: id,
      newValue: { invoiceNum, grandTotal, paid, change, paymentMethod },
      notes: `إنهاء الجلسة وإصدار الفاتورة ${invoiceNum} بإجمالي ${grandTotal} ج.م`,
      req
    });

    broadcast('session:ended', { sessionId: id, invoiceNumber: invoiceNum, deviceId: session.device_id });
    broadcast('device:updated', { id: session.device_id, status: 'available', current_session_id: null });

    // Fetch complete invoice payload for thermal printing
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    const storeSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    res.json({
      success: true,
      message: `تم إنهاء الجلسة وإصدار الفاتورة رقم ${invoiceNum} بنجاح`,
      invoice: {
        ...invoice,
        items: invoiceItems,
        store: storeSettings
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/history (List past sessions)
router.get('/history/all', (req, res, next) => {
  try {
    const { deviceId, customerId, date, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "WHERE s.status IN ('completed', 'cancelled')";
    const params = [];

    if (deviceId) {
      whereClause += " AND s.device_id = ?";
      params.push(deviceId);
    }
    if (customerId) {
      whereClause += " AND s.customer_id = ?";
      params.push(customerId);
    }
    if (date) {
      whereClause += " AND s.start_time LIKE ?";
      params.push(`${date}%`);
    }

    const sessions = db.prepare(`
      SELECT s.*, d.name as device_name, u.full_name as cashier_name
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      LEFT JOIN users u ON s.cashier_id = u.id
      ${whereClause}
      ORDER BY s.start_time DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    const countResult = db.prepare(`SELECT COUNT(*) as total FROM sessions s ${whereClause}`).get(...params);

    res.json({
      success: true,
      sessions,
      pagination: {
        total: countResult.total,
        page: Number(page),
        pages: Math.ceil(countResult.total / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
