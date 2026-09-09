const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications
router.get('/', authenticate, (req, res, next) => {
  try {
    const notifications = db.prepare('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 30').all();
    const unreadCount = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE is_read = 0').get().c;
    res.json({ success: true, notifications, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', authenticate, (req, res, next) => {
  try {
    db.prepare('UPDATE notifications SET is_read = 1').run();
    res.json({ success: true, message: 'تم تعيين جميع الإشعارات كمقروءة' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/notifications/clear
router.delete('/clear', authenticate, (req, res, next) => {
  try {
    db.prepare('DELETE FROM notifications').run();
    res.json({ success: true, message: 'تم مسح الإشعارات' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
