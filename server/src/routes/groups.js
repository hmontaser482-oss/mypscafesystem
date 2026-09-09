const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/groups
router.get('/', (req, res, next) => {
  try {
    const groups = db.prepare(`
      SELECT g.*, COUNT(d.id) as devices_count
      FROM groups g
      LEFT JOIN devices d ON g.id = d.group_id
      GROUP BY g.id
      ORDER BY g.name ASC
    `).all();
    res.json({ success: true, groups });
  } catch (err) {
    next(err);
  }
});

// POST /api/groups
router.post('/', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { name, name_en, description, device_type, default_single_price, default_multi_price, fixed_price_1h_single, fixed_price_1h_multi } = req.body;
    if (!name || default_single_price === undefined || default_multi_price === undefined) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المجموعة وأسعار السينجل والمالتي' });
    }

    const id = 'grp_' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO groups (id, name, name_en, description, device_type, default_single_price, default_multi_price, fixed_price_1h_single, fixed_price_1h_multi)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, name_en || null, description || null, device_type || 'PS5', Number(default_single_price), Number(default_multi_price), fixed_price_1h_single || null, fixed_price_1h_multi || null);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'GROUP_CREATE',
      entityType: 'group',
      entityId: id,
      newValue: req.body,
      req
    });

    res.json({ success: true, message: 'تمت إضافة المجموعة بنجاح', groupId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/groups/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, name_en, description, device_type, default_single_price, default_multi_price, status } = req.body;

    const existing = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'المجموعة غير موجودة' });

    db.prepare(`
      UPDATE groups
      SET name = ?, name_en = ?, description = ?, device_type = ?, default_single_price = ?, default_multi_price = ?, status = ?
      WHERE id = ?
    `).run(name, name_en, description, device_type, Number(default_single_price), Number(default_multi_price), status || existing.status, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'GROUP_UPDATE',
      entityType: 'group',
      entityId: id,
      previousValue: existing,
      newValue: req.body,
      req
    });

    res.json({ success: true, message: 'تم تحديث المجموعة بنجاح' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/groups/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const devCount = db.prepare('SELECT COUNT(*) as c FROM devices WHERE group_id = ?').get(id);
    if (devCount.c > 0) {
      return res.status(400).json({ success: false, message: 'لا يمكن حذف المجموعة لوجود أجهزة مرتبطة بها' });
    }

    db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    res.json({ success: true, message: 'تم حذف المجموعة بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
