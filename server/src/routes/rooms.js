const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/rooms
router.get('/', (req, res, next) => {
  try {
    const rooms = db.prepare(`
      SELECT r.*, COUNT(d.id) as devices_count
      FROM rooms r
      LEFT JOIN devices d ON r.id = d.room_id
      GROUP BY r.id
      ORDER BY r.is_vip DESC, r.name ASC
    `).all();
    res.json({ success: true, rooms });
  } catch (err) {
    next(err);
  }
});

// POST /api/rooms
router.post('/', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { name, name_en, description, capacity, single_price, multi_price, is_vip } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم الغرفة' });
    }

    const id = 'room_' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO rooms (id, name, name_en, description, capacity, single_price, multi_price, is_vip, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(id, name, name_en || null, description || null, capacity || 4, single_price ? Number(single_price) : null, multi_price ? Number(multi_price) : null, is_vip ? 1 : 0);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'ROOM_CREATE',
      entityType: 'room',
      entityId: id,
      newValue: req.body,
      req
    });

    res.json({ success: true, message: 'تمت إضافة الغرفة بنجاح', roomId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/rooms/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, name_en, description, capacity, single_price, multi_price, is_vip, status } = req.body;

    const existing = db.prepare('SELECT * FROM rooms WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });

    db.prepare(`
      UPDATE rooms
      SET name = ?, name_en = ?, description = ?, capacity = ?, single_price = ?, multi_price = ?, is_vip = ?, status = ?
      WHERE id = ?
    `).run(name, name_en, description, capacity, single_price ? Number(single_price) : null, multi_price ? Number(multi_price) : null, is_vip ? 1 : 0, status || existing.status, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'ROOM_UPDATE',
      entityType: 'room',
      entityId: id,
      previousValue: existing,
      newValue: req.body,
      req
    });

    res.json({ success: true, message: 'تم تحديث بيانات الغرفة بنجاح' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/rooms/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const devCount = db.prepare('SELECT COUNT(*) as c FROM devices WHERE room_id = ?').get(id);
    if (devCount.c > 0) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف الغرفة لوجود أجهزة مرتبطة بها حالياً' });
    }

    db.prepare('DELETE FROM rooms WHERE id = ?').run(id);
    res.json({ success: true, message: 'تم حذف الغرفة بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
