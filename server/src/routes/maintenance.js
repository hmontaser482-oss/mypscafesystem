const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { broadcast } = require('../sockets/socketManager');
const { getLocalDateTimeString } = require('../utils/dateUtils');

// GET /api/maintenance
router.get('/', (req, res, next) => {
  try {
    const list = db.prepare(`
      SELECT m.*, d.name as device_name, d.device_number, u.full_name as created_by_name
      FROM device_maintenance m
      JOIN devices d ON m.device_id = d.id
      LEFT JOIN users u ON m.created_by = u.id
      ORDER BY m.start_date DESC
    `).all();
    res.json({ success: true, maintenance: list });
  } catch (err) {
    next(err);
  }
});

// POST /api/maintenance (Create maintenance ticket & set device status)
router.post('/', authenticate, (req, res, next) => {
  try {
    const { deviceId, problem, description, cost = 0, technician, notes } = req.body;
    if (!deviceId || !problem) {
      return res.status(400).json({ success: false, message: 'يرجى اختيار الجهاز وتحديد المشكلة' });
    }

    const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId);
    if (!device) return res.status(404).json({ success: false, message: 'الجهاز غير موجود' });

    if (device.status === 'running') {
      return res.status(400).json({ success: false, message: 'الجهاز قيد التشغيل في جلسة نشطة، يرجى إنهاء الجلسة أولاً' });
    }

    const id = 'mnt_' + uuidv4().slice(0, 8);
    const nowStr = getLocalDateTimeString();

    const runTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO device_maintenance (id, device_id, problem, description, cost, technician, status, start_date, notes, created_by)
        VALUES (?, ?, ?, ?, ?, ?, 'in_progress', ?, ?, ?)
      `).run(id, deviceId, problem, description || null, Number(cost), technician || null, nowStr, notes || null, req.user.id);

      db.prepare("UPDATE devices SET status = 'maintenance' WHERE id = ?").run(deviceId);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DEVICE_MAINTENANCE_START',
      entityType: 'maintenance',
      entityId: id,
      newValue: { deviceId, problem, technician },
      notes: `إدخال الجهاز (${device.name}) في وضع الصيانة: ${problem}`,
      req
    });

    broadcast('device:updated', { id: deviceId, status: 'maintenance' });

    res.json({ success: true, message: 'تم فتح أمر صيانة للجهاز بنجاح', maintenanceId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/maintenance/:id/resolve (Resolve ticket and restore device to available)
router.put('/:id/resolve', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { cost, notes } = req.body;

    const record = db.prepare('SELECT * FROM device_maintenance WHERE id = ?').get(id);
    if (!record) return res.status(404).json({ success: false, message: 'أمر الصيانة غير موجود' });

    const nowStr = getLocalDateTimeString();

    const runTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE device_maintenance
        SET status = 'completed', resolved_date = ?, cost = COALESCE(?, cost), notes = COALESCE(?, notes)
        WHERE id = ?
      `).run(nowStr, cost !== undefined ? Number(cost) : null, notes || null, id);

      db.prepare("UPDATE devices SET status = 'available' WHERE id = ?").run(record.device_id);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'DEVICE_MAINTENANCE_RESOLVE',
      entityType: 'maintenance',
      entityId: id,
      notes: `إنهاء الصيانة للجهاز (${record.device_id}) وإعادته للعمل كـ Available`,
      req
    });

    broadcast('device:updated', { id: record.device_id, status: 'available' });

    res.json({ success: true, message: 'تم إنهاء الصيانة وإعادة الجهاز للحالة المتاحة بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
