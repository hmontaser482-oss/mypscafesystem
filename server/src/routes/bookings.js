const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { broadcast } = require('../sockets/socketManager');

// GET /api/bookings (List bookings by date range or specific date)
router.get('/', (req, res, next) => {
  try {
    const { date, startDate, endDate, deviceId, status } = req.query;
    let query = `
      SELECT b.*, d.name as device_name, d.device_number, d.device_type, r.name as room_name, u.full_name as created_by_name
      FROM bookings b
      JOIN devices d ON b.device_id = d.id
      LEFT JOIN rooms r ON d.room_id = r.id
      LEFT JOIN users u ON b.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      query += " AND b.booking_date = ?";
      params.push(date);
    }
    if (startDate) {
      query += " AND b.booking_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND b.booking_date <= ?";
      params.push(endDate);
    }
    if (deviceId) {
      query += " AND b.device_id = ?";
      params.push(deviceId);
    }
    if (status) {
      query += " AND b.status = ?";
      params.push(status);
    }

    query += " ORDER BY b.booking_date ASC, b.start_time ASC";
    const bookings = db.prepare(query).all(...params);

    res.json({ success: true, bookings });
  } catch (err) {
    next(err);
  }
});

// POST /api/bookings (Create booking with double-booking prevention)
router.post('/', authenticate, (req, res, next) => {
  try {
    const {
      customerId,
      customerName,
      phone,
      deviceId,
      bookingDate, // YYYY-MM-DD
      startTime,   // HH:MM
      endTime,     // HH:MM
      sessionType = 'multi',
      depositAmount = 0,
      notes
    } = req.body;

    if (!customerName || !phone || !deviceId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'يرجى استكمال جميع بيانات الحجز الإلزامية' });
    }

    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: 'وقت بداية الحجز يجب أن يكون قبل وقت النهاية' });
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    // STRICT DOUBLE-BOOKING CONFLICT CHECK
    // Two intervals [S1, E1) and [S2, E2) overlap if and only if S1 < E2 and S2 < E1
    const conflict = db.prepare(`
      SELECT * FROM bookings
      WHERE device_id = ?
        AND booking_date = ?
        AND status IN ('confirmed', 'pending')
        AND start_time < ?
        AND end_time > ?
    `).get(deviceId, bookingDate, endTime, startTime);

    if (conflict) {
      return res.status(400).json({
        success: false,
        message: `تعارض في الحجز! الجهاز (${device.name}) محجوز بالفعل في هذا التوقيت للعميل (${conflict.customer_name}) من ${conflict.start_time} إلى ${conflict.end_time}.`
      });
    }

    const id = 'bk_' + uuidv4().slice(0, 8);
    const deposit = Math.max(0, Number(depositAmount) || 0);

    db.prepare(`
      INSERT INTO bookings (
        id, customer_id, customer_name, phone, device_id, booking_date, start_time,
        end_time, session_type, deposit_amount, status, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?)
    `).run(
      id, customerId || null, customerName, phone, deviceId, bookingDate,
      startTime, endTime, sessionType, deposit, notes || null, req.user.id
    );

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'BOOKING_CREATE',
      entityType: 'booking',
      entityId: id,
      newValue: { customerName, phone, deviceId, bookingDate, startTime, endTime, deposit },
      notes: `تسجيل حجز جديد لجهاز ${device.name} بتاريخ ${bookingDate} من ${startTime} إلى ${endTime}`,
      req
    });

    broadcast('booking:created', { id, deviceId, bookingDate, startTime, endTime });

    res.json({
      success: true,
      message: 'تم تأكيد الحجز بنجاح ومنع أي تعارض للأوقات',
      bookingId: id
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/bookings/:id/status
router.put('/:id/status', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body; // 'confirmed', 'pending', 'completed', 'cancelled', 'no_show'

    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });

    db.prepare('UPDATE bookings SET status = ?, notes = COALESCE(?, notes) WHERE id = ?').run(status, notes, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'BOOKING_STATUS_CHANGE',
      entityType: 'booking',
      entityId: id,
      previousValue: existing.status,
      newValue: status,
      req
    });

    broadcast('booking:updated', { id, status });

    res.json({ success: true, message: `تم تحديث حالة الحجز إلى (${status}) بنجاح` });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/bookings/:id
router.delete('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM bookings WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });

    db.prepare('DELETE FROM bookings WHERE id = ?').run(id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'BOOKING_DELETE',
      entityType: 'booking',
      entityId: id,
      previousValue: existing,
      req
    });

    res.json({ success: true, message: 'تم حذف الحجز بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
