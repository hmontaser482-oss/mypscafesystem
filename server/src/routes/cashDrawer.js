const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { getLocalDateTimeString } = require('../utils/dateUtils');

// POST /api/cash-drawer/transaction (Cash in, Cash out, Petty Cash)
router.post('/transaction', authenticate, (req, res, next) => {
  try {
    const { type, amount, reason } = req.body; // type: 'cash_in', 'cash_out', 'petty_cash'
    if (!type || !amount || !reason) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال نوع الحركة والمبلغ والسبب' });
    }

    const amt = Number(amount);
    if (amt <= 0) return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون أكبر من الصفر' });

    const activeShift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    if (!activeShift) {
      return res.status(400).json({ success: false, message: 'لا يوجد شيفت مفتوح حالياً لتسجيل حركة الدرج' });
    }

    const txId = 'ctx_' + uuidv4().slice(0, 8);
    const nowStr = getLocalDateTimeString();

    const runTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO cash_transactions (id, shift_id, type, amount, reason, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(txId, activeShift.id, type, amt, reason, req.user.id, nowStr);

      if (type === 'cash_in') {
        db.prepare(`UPDATE shifts SET cash_in = cash_in + ?, expected_cash = expected_cash + ? WHERE id = ?`).run(amt, amt, activeShift.id);
      } else if (['cash_out', 'petty_cash'].includes(type)) {
        db.prepare(`UPDATE shifts SET cash_out = cash_out + ?, expected_cash = expected_cash - ? WHERE id = ?`).run(amt, amt, activeShift.id);
      }
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'CASH_DRAWER_TRANSACTION',
      entityType: 'cash_drawer',
      entityId: txId,
      newValue: { type, amount: amt, reason },
      notes: `حركة درج نقدية: ${type} بمبلغ ${amt} ج.م. السبب: ${reason}`,
      req
    });

    res.json({ success: true, message: 'تم تسجيل حركة الدرج بنجاح', transactionId: txId });
  } catch (err) {
    next(err);
  }
});

// GET /api/cash-drawer/transactions
router.get('/transactions', authenticate, (req, res, next) => {
  try {
    const { shiftId, limit = 50 } = req.query;
    let query = `
      SELECT ct.*, u.full_name as user_name
      FROM cash_transactions ct
      LEFT JOIN users u ON ct.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (shiftId) {
      query += " AND ct.shift_id = ?";
      params.push(shiftId);
    }

    query += " ORDER BY ct.created_at DESC LIMIT ?";
    params.push(Number(limit));

    const transactions = db.prepare(query).all(...params);
    res.json({ success: true, transactions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
