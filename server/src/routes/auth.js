const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db/database');
const { generateToken, authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم المستخدم وكلمة المرور' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'هذا الحساب معطل حالياً، يرجى مراجعة الإدارة' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
    }

    const token = generateToken(user);

    // Check if there is an active open shift
    const openShift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();

    logAudit({
      userId: user.id,
      userName: user.full_name,
      action: 'USER_LOGIN',
      entityType: 'user',
      entityId: user.id,
      notes: 'تسجيل دخول ناجح',
      req
    });

    res.json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token,
      user: {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role
      },
      openShift: openShift || null
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const openShift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
  res.json({
    success: true,
    user: req.user,
    openShift: openShift || null
  });
});

module.exports = router;
