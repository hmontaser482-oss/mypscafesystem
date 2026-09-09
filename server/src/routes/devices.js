const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { broadcast } = require('../sockets/socketManager');
const { calculateSessionTotal } = require('../engines/pricingEngine');

const { getLocalDateTimeString } = require('../utils/dateUtils');

// GET /api/devices (List all devices with group, room, and active session info)
router.get('/', (req, res, next) => {
  try {
    const todayStr = getLocalDateTimeString().slice(0, 10);
    const currentTimeStr = getLocalDateTimeString().slice(11, 16);

    const devices = db.prepare(`
      SELECT 
        d.*,
        g.name as group_name,
        g.name_en as group_name_en,
        g.default_single_price as group_single_price,
        g.default_multi_price as group_multi_price,
        r.name as room_name,
        r.name_en as room_name_en,
        r.single_price as room_single_price,
        r.multi_price as room_multi_price,
        r.is_vip as room_is_vip,
        s.id as active_session_id,
        s.customer_name as active_customer_name,
        s.session_type as active_session_type,
        s.time_mode as active_time_mode,
        s.target_duration_minutes as active_target_minutes,
        s.start_time as active_start_time,
        s.expected_end_time as active_expected_end_time,
        s.status as session_status,
        s.base_hourly_rate as active_hourly_rate,
        gm.name as active_game_name
      FROM devices d
      JOIN groups g ON d.group_id = g.id
      LEFT JOIN rooms r ON d.room_id = r.id
      LEFT JOIN sessions s ON d.current_session_id = s.id AND s.status IN ('running', 'paused', 'time_expired')
      LEFT JOIN games gm ON s.game_id = gm.id
      ORDER BY d.device_number ASC
    `).all();

    // Attach real-time computed totals for currently running sessions and active bookings
    const enrichedDevices = devices.map(dev => {
      // Effective prices (Room overrides Group)
      const effectiveSingle = (dev.room_single_price !== null && dev.room_single_price > 0)
        ? dev.room_single_price
        : dev.group_single_price;

      const effectiveMulti = (dev.room_multi_price !== null && dev.room_multi_price > 0)
        ? dev.room_multi_price
        : dev.group_multi_price;

      let sessionDetails = null;
      if (dev.active_session_id) {
        try {
          const calc = calculateSessionTotal(dev.active_session_id);
          sessionDetails = {
            id: dev.active_session_id,
            customerName: dev.active_customer_name,
            sessionType: dev.active_session_type,
            timeMode: dev.active_time_mode,
            targetMinutes: dev.active_target_minutes,
            startTime: dev.active_start_time,
            expectedEndTime: dev.active_expected_end_time,
            status: dev.session_status,
            gameName: dev.active_game_name,
            hourlyRate: dev.active_hourly_rate,
            totalPlayedSeconds: calc.totalPlayedSeconds,
            totalPausedSeconds: calc.totalPausedSeconds,
            gamingCost: calc.gamingCost,
            productsCost: calc.productsCost,
            grandTotal: calc.grandTotal
          };
        } catch (e) {
          // fallback if calculation fails
        }
      }

      // Check upcoming/active booking today for this device
      const activeBooking = db.prepare(`
        SELECT id, customer_name, phone, start_time, end_time, session_type
        FROM bookings
        WHERE device_id = ? 
          AND booking_date = ? 
          AND status IN ('confirmed', 'pending')
          AND end_time >= ?
        ORDER BY start_time ASC LIMIT 1
      `).get(dev.id, todayStr, currentTimeStr);

      const effectiveStatus = (dev.status === 'available' && activeBooking) ? 'reserved' : dev.status;

      return {
        ...dev,
        status: effectiveStatus,
        effectiveSinglePrice: effectiveSingle,
        effectiveMultiPrice: effectiveMulti,
        activeSession: sessionDetails,
        activeBooking: activeBooking || null
      };
    });

    res.json({ success: true, devices: enrichedDevices });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices/:id/set-status (Fast status toggle e.g. from maintenance to available)
router.post('/:id/set-status', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['available', 'maintenance', 'disabled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'حالة غير صالحة' });
    }

    const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    if (!dev) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    if (dev.current_session_id) {
      return res.status(400).json({ success: false, message: 'الجهاز قيد التشغيل في جلسة حالية ولا يمكن تعديل حالته' });
    }

    db.prepare('UPDATE devices SET status = ? WHERE id = ?').run(status, id);

    // If marked available, resolve any in_progress maintenance record
    if (status === 'available') {
      db.prepare(`
        UPDATE device_maintenance 
        SET status = 'completed', resolved_date = ?
        WHERE device_id = ? AND status = 'in_progress'
      `).run(getLocalDateTimeString(), id);
    }

    broadcast('device:updated', { id, status });
    res.json({ success: true, message: `تم تحديث حالة الجهاز بنجاح إلى (${status === 'available' ? 'متاح' : status})` });
  } catch (err) {
    next(err);
  }
});

// GET /api/devices/:id (Get single device details)
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const dev = db.prepare(`
      SELECT 
        d.*,
        g.name as group_name,
        g.default_single_price as group_single_price,
        g.default_multi_price as group_multi_price,
        r.name as room_name,
        r.single_price as room_single_price,
        r.multi_price as room_multi_price,
        r.is_vip as room_is_vip,
        s.id as active_session_id,
        s.customer_name as active_customer_name,
        s.session_type as active_session_type,
        s.time_mode as active_time_mode,
        s.status as session_status
      FROM devices d
      JOIN groups g ON d.group_id = g.id
      LEFT JOIN rooms r ON d.room_id = r.id
      LEFT JOIN sessions s ON d.current_session_id = s.id AND s.status IN ('running', 'paused', 'time_expired')
      WHERE d.id = ?
    `).get(id);

    if (!dev) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    res.json({ success: true, device: dev });
  } catch (err) {
    next(err);
  }
});

// POST /api/devices (Create device)
router.post('/', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { name, device_number, device_type, serial_number, group_id, room_id, notes } = req.body;
    if (!name || !device_number || !group_id) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم الجهاز ورقمه والمجموعة' });
    }

    const id = 'dev_' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO devices (id, name, device_number, device_type, serial_number, group_id, room_id, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'available', ?)
    `).run(id, name, device_number, device_type || 'PS5', serial_number || null, group_id, room_id || null, notes || null);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DEVICE_CREATE',
      entityType: 'device',
      entityId: id,
      newValue: req.body,
      req
    });

    broadcast('device:created', { id, name });
    res.json({ success: true, message: 'تمت إضافة الجهاز بنجاح', deviceId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/devices/:id (Update device)
router.put('/:id', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, device_number, device_type, serial_number, group_id, room_id, status, notes } = req.body;

    const existing = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    }

    // Don't allow changing group or room if device has active session
    if (existing.current_session_id && (group_id !== existing.group_id || room_id !== existing.room_id)) {
      return res.status(400).json({ success: false, message: 'لا يمكن تعديل غرفة أو مجموعة الجهاز أثناء وجود جلسة نشطة عليه' });
    }

    db.prepare(`
      UPDATE devices 
      SET name = ?, device_number = ?, device_type = ?, serial_number = ?, group_id = ?, room_id = ?, status = ?, notes = ?
      WHERE id = ?
    `).run(name, device_number, device_type, serial_number, group_id, room_id || null, status || existing.status, notes, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DEVICE_UPDATE',
      entityType: 'device',
      entityId: id,
      previousValue: existing,
      newValue: req.body,
      req
    });

    broadcast('device:updated', { id, name, status: status || existing.status });
    res.json({ success: true, message: 'تم تحديث بيانات الجهاز بنجاح' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/devices/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    if (!dev) {
      return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });
    }

    if (dev.current_session_id) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف الجهاز لوجود جلسة نشطة عليه حالياً' });
    }

    // Check if sessions history exists
    const hasHistory = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE device_id = ?').get(id);
    if (hasHistory.c > 0) {
      // Instead of hard delete which violates foreign keys, soft disable
      db.prepare("UPDATE devices SET status = 'disabled' WHERE id = ?").run(id);
      return res.json({ success: true, message: 'تم تعطيل الجهاز بنجاح وحفظ سجلاته التاريخية' });
    }

    db.prepare('DELETE FROM devices WHERE id = ?').run(id);
    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DEVICE_DELETE',
      entityType: 'device',
      entityId: id,
      previousValue: dev,
      req
    });

    broadcast('device:deleted', { id });
    res.json({ success: true, message: 'تم حذف الجهاز بنجاح' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/devices/:id/status (Set status e.g. maintenance, available, disabled)
router.put('/:id/status', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const dev = db.prepare('SELECT * FROM devices WHERE id = ?').get(id);
    if (!dev) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    if (dev.status === 'running' && status !== 'running') {
      return res.status(400).json({ success: false, message: 'الجهاز قيد التشغيل في جلسة نشطة، يجب إنهاء الجلسة أولاً' });
    }

    db.prepare('UPDATE devices SET status = ?, notes = COALESCE(?, notes) WHERE id = ?').run(status, notes, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DEVICE_STATUS_CHANGE',
      entityType: 'device',
      entityId: id,
      previousValue: dev.status,
      newValue: status,
      req
    });

    broadcast('device:updated', { id, status });
    res.json({ success: true, message: 'تم تغيير حالة الجهاز بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
