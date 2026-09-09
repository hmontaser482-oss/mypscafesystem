const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { broadcast } = require('../sockets/socketManager');
const { getLocalDateTimeString } = require('../utils/dateUtils');

// GET /api/shifts/current (Get active shift details)
router.get('/current', authenticate, (req, res, next) => {
  try {
    const shift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    if (!shift) {
      return res.json({ success: true, activeShift: null });
    }

    // Check if any gaming sessions are currently running
    const activeSessionsCount = db.prepare(`SELECT COUNT(*) as c FROM sessions WHERE status IN ('running', 'paused', 'time_expired')`).get().c;

    // Fetch cash transactions during this shift
    const cashTx = db.prepare('SELECT * FROM cash_transactions WHERE shift_id = ? ORDER BY created_at DESC').all(shift.id);

    // Fetch expenses during this shift
    const expenses = db.prepare('SELECT * FROM expenses WHERE shift_id = ? ORDER BY created_at DESC').all(shift.id);

    res.json({
      success: true,
      activeShift: {
        ...shift,
        activeSessionsCount,
        cashTransactions: cashTx,
        expensesList: expenses
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/shifts/open (Open a new shift)
router.post('/open', authenticate, (req, res, next) => {
  try {
    const { notes } = req.body;

    const existingOpen = db.prepare(`SELECT * FROM shifts WHERE status = 'open'`).get();
    if (existingOpen) {
      return res.status(400).json({ success: false, message: `يوجد شيفت مفتوح حالياً للكاشير (${existingOpen.cashier_name})، يرجى إغلاقه أولاً` });
    }

    const shiftId = 'shf_' + uuidv4().slice(0, 8);
    const nowStr = getLocalDateTimeString();

    db.prepare(`
      INSERT INTO shifts (
        id, cashier_id, cashier_name, start_time, opening_cash, cash_sales, card_sales,
        wallet_sales, total_sales, total_expenses, cash_in, cash_out, expected_cash, status, notes
      ) VALUES (?, ?, ?, ?, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'open', ?)
    `).run(shiftId, req.user.id, req.user.full_name, nowStr, notes || null);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SHIFT_OPEN',
      entityType: 'shift',
      entityId: shiftId,
      newValue: {},
      notes: `بدء شيفت جديد للكاشير ${req.user.full_name}`,
      req
    });

    broadcast('shift:opened', { shiftId, cashierName: req.user.full_name });

    res.json({
      success: true,
      message: 'تم بدء الشيفت بنجاح',
      shiftId
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/shifts/close (Close active shift with counted cash)
router.post('/close', authenticate, (req, res, next) => {
  try {
    const { actualCash, notes, forceClose = false } = req.body;

    const shift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    if (!shift) {
      return res.status(400).json({ success: false, message: 'لا يوجد شيفت مفتوح حالياً لإغلاقه' });
    }

    // Active gaming sessions remain running smoothly into the next shift
    const activeSessions = db.prepare(`
      SELECT s.id, d.name as device_name, s.customer_name
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      WHERE s.status IN ('running', 'paused', 'time_expired')
    `).all();

    if (actualCash === undefined || actualCash === null || isNaN(actualCash)) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال الرصيد الفعلي المتواجد في الدرج' });
    }

    const counted = Number(actualCash);
    const expected = shift.expected_cash;
    const difference = Math.round((counted - expected) * 100) / 100;
    const nowStr = getLocalDateTimeString();

    db.prepare(`
      UPDATE shifts
      SET end_time = ?, actual_cash = ?, cash_difference = ?, status = 'closed', notes = COALESCE(notes || ' | ', '') || ?
      WHERE id = ?
    `).run(nowStr, counted, difference, notes || '', shift.id);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SHIFT_CLOSE',
      entityType: 'shift',
      entityId: shift.id,
      newValue: { expectedCash: expected, actualCash: counted, difference },
      notes: `إغلاق الشيفت. المتوقع: ${expected} ج.م، الفعلي: ${counted} ج.م، الفارق: ${difference} ج.م`,
      req
    });

    broadcast('shift:closed', { shiftId: shift.id, cashierName: shift.cashier_name });

    const closedShift = db.prepare('SELECT * FROM shifts WHERE id = ?').get(shift.id);
    const store = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    res.json({
      success: true,
      message: 'تم إغلاق الشيفت بنجاح وحساب تقرير التقفيل',
      shiftReport: {
        ...closedShift,
        store
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/shifts/history (List past shifts)
router.get('/history', authenticate, (req, res, next) => {
  try {
    const { limit = 30 } = req.query;
    const shifts = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM shifts s
      JOIN users u ON s.cashier_id = u.id
      ORDER BY s.start_time DESC
      LIMIT ?
    `).all(Number(limit));

    res.json({ success: true, shifts });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
