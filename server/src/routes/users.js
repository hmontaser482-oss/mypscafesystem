const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/users
router.get('/', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const users = db.prepare('SELECT id, username, full_name, phone, role, is_active, created_at FROM users ORDER BY role ASC, full_name ASC').all();
    res.json({ success: true, users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users (Create user)
router.post('/', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { username, password, full_name, phone, role = 'cashier' } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور والاسم بالكامل' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) {
      return res.status(400).json({ success: false, message: 'اسم المستخدم مسجل مسبقاً' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const id = 'usr_' + uuidv4().slice(0, 8);

    db.prepare(`
      INSERT INTO users (id, username, password_hash, full_name, phone, role, is_active)
      VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(id, username, hash, full_name, phone || null, role);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'USER_CREATE',
      entityType: 'user',
      entityId: id,
      newValue: { username, full_name, role },
      notes: `إنشاء مستخدم جديد (${full_name}) بصلاحية (${role})`,
      req
    });

    res.json({ success: true, message: 'تم إنشاء المستخدم بنجاح', userId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id
router.put('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { password, full_name, phone, role, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id);
    }

    db.prepare(`
      UPDATE users 
      SET full_name = COALESCE(?, full_name), phone = COALESCE(?, phone),
          role = COALESCE(?, role), is_active = COALESCE(?, is_active),
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `).run(full_name, phone, role, is_active, id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'USER_UPDATE',
      entityType: 'user',
      entityId: id,
      previousValue: { username: existing.username, role: existing.role, is_active: existing.is_active },
      newValue: { full_name, role, is_active },
      req
    });

    res.json({ success: true, message: 'تم تحديث بيانات المستخدم بنجاح' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ success: false, message: 'لا يمكنك حذف حسابك الحالي' });
    }

    // Check if user has recorded shifts, invoices, or sessions
    const hasInvoices = db.prepare('SELECT COUNT(*) as c FROM invoices WHERE cashier_id = ?').get(id).c;
    const hasSessions = db.prepare('SELECT COUNT(*) as c FROM sessions WHERE cashier_id = ?').get(id).c;

    if (hasInvoices > 0 || hasSessions > 0) {
      db.prepare('UPDATE users SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ success: true, message: 'تم إيقاف تنشيط الحساب بدلاً من الحذف لوجود سجلات مالية مسجلة باسمه' });
    }

    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true, message: 'تم حذف المستخدم بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
