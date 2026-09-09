const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/customers (List and search)
router.get('/', (req, res, next) => {
  try {
    const { search, limit = 50 } = req.query;
    let query = "SELECT * FROM customers WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (name LIKE ? OR phone LIKE ? OR nickname LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += " ORDER BY total_spending DESC, total_visits DESC LIMIT ?";
    params.push(Number(limit));

    const customers = db.prepare(query).all(...params);
    res.json({ success: true, customers });
  } catch (err) {
    next(err);
  }
});

// GET /api/customers/:id (Full customer profile and history)
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!customer) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

    // Sessions history
    const sessions = db.prepare(`
      SELECT s.*, d.name as device_name
      FROM sessions s
      JOIN devices d ON s.device_id = d.id
      WHERE s.customer_id = ?
      ORDER BY s.start_time DESC
      LIMIT 15
    `).all(id);

    // Invoices history
    const invoices = db.prepare(`
      SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC LIMIT 15
    `).all(id);

    // Bookings history
    const bookings = db.prepare(`
      SELECT b.*, d.name as device_name
      FROM bookings b
      JOIN devices d ON b.device_id = d.id
      WHERE b.customer_id = ?
      ORDER BY b.booking_date DESC
      LIMIT 10
    `).all(id);

    res.json({
      success: true,
      customer: {
        ...customer,
        sessions,
        invoices,
        bookings
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/customers
router.post('/', authenticate, (req, res, next) => {
  try {
    const { name, phone, nickname, notes, favorite_game } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'يرجى إدخال اسم العميل ورقم هاتفه' });
    }

    const existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(phone);
    if (existing) {
      return res.status(400).json({ success: false, message: 'رقم الهاتف مسجل لعميل آخر بالفعل' });
    }

    const id = 'cust_' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO customers (id, name, phone, nickname, notes, favorite_game)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, name, phone, nickname || null, notes || null, favorite_game || null);

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'CUSTOMER_CREATE',
      entityType: 'customer',
      entityId: id,
      newValue: { name, phone, nickname },
      notes: `إضافة عميل جديد: ${name}`,
      req
    });

    res.json({ success: true, message: 'تم تسجيل العميل بنجاح', customerId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/customers/:id
router.put('/:id', authenticate, (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, nickname, notes, favorite_game } = req.body;

    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'العميل غير موجود' });

    db.prepare(`
      UPDATE customers
      SET name = ?, phone = ?, nickname = ?, notes = ?, favorite_game = ?
      WHERE id = ?
    `).run(name, phone, nickname, notes, favorite_game, id);

    res.json({ success: true, message: 'تم تحديث بيانات العميل بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
