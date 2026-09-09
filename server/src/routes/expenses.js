const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { getLocalDateTimeString } = require('../utils/dateUtils');

// GET /api/expenses (List expenses with date filtering)
router.get('/', (req, res, next) => {
  try {
    const { startDate, endDate, category, limit = 50 } = req.query;
    let query = `
      SELECT e.*, u.full_name as user_name
      FROM expenses e
      LEFT JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      query += " AND e.date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND e.date <= ?";
      params.push(endDate);
    }
    if (category) {
      query += " AND e.category = ?";
      params.push(category);
    }

    query += " ORDER BY e.date DESC, e.created_at DESC LIMIT ?";
    params.push(Number(limit));

    const expenses = db.prepare(query).all(...params);

    // Sum total
    let sumQuery = "SELECT SUM(amount) as total FROM expenses WHERE 1=1";
    const sumParams = [];
    if (startDate) { sumQuery += " AND date >= ?"; sumParams.push(startDate); }
    if (endDate) { sumQuery += " AND date <= ?"; sumParams.push(endDate); }
    if (category) { sumQuery += " AND category = ?"; sumParams.push(category); }
    const totalResult = db.prepare(sumQuery).get(...sumParams);

    res.json({
      success: true,
      expenses,
      totalExpenses: Number(totalResult?.total || 0)
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/expenses
router.post('/', authenticate, (req, res, next) => {
  try {
    const { category, amount, description, payment_method = 'cash', date } = req.body;
    if (!category || !amount || !description) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال التصنيف والمبلغ والوصف للمصروف' });
    }

    const amt = Number(amount);
    if (amt <= 0) return res.status(400).json({ success: false, message: 'المبلغ يجب أن يكون أكبر من الصفر' });

    // Active shift check
    const activeShift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    const shiftId = activeShift ? activeShift.id : null;

    const id = 'exp_' + uuidv4().slice(0, 8);
    const nowStr = getLocalDateTimeString();
    const dateStr = date || nowStr.slice(0, 10);

    const runTransaction = db.transaction(() => {
      db.prepare(`
        INSERT INTO expenses (id, shift_id, category, amount, description, payment_method, user_id, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, shiftId, category, amt, description, payment_method, req.user.id, dateStr, nowStr);

      if (payment_method === 'cash' && shiftId) {
        db.prepare(`
          UPDATE shifts
          SET total_expenses = total_expenses + ?,
              expected_cash = expected_cash - ?
          WHERE id = ?
        `).run(amt, amt, shiftId);
      }
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'EXPENSE_CREATE',
      entityType: 'expense',
      entityId: id,
      newValue: { category, amount: amt, description, payment_method },
      notes: `تسجيل مصروف (${category}) بمبلغ ${amt} ج.م`,
      req
    });

    res.json({ success: true, message: 'تم تسجيل المصروف بنجاح', expenseId: id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM expenses WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'المصروف غير موجود' });

    db.prepare('DELETE FROM expenses WHERE id = ?').run(id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'EXPENSE_DELETE',
      entityType: 'expense',
      entityId: id,
      previousValue: existing,
      req
    });

    res.json({ success: true, message: 'تم حذف المصروف بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
