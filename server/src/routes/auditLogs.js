const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/audit-logs
router.get('/', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { action, entityType, limit = 50, page = 1 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let query = "SELECT * FROM audit_logs WHERE 1=1";
    const params = [];

    if (action) {
      query += " AND action = ?";
      params.push(action);
    }
    if (entityType) {
      query += " AND entity_type = ?";
      params.push(entityType);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(Number(limit), offset);

    const logs = db.prepare(query).all(...params);
    const count = db.prepare("SELECT COUNT(*) as total FROM audit_logs").get().total;

    res.json({
      success: true,
      logs,
      pagination: {
        total: count,
        page: Number(page),
        pages: Math.ceil(count / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
