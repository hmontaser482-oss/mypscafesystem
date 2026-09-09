const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { broadcast } = require('../sockets/socketManager');
const { getLocalDateTimeString } = require('../utils/dateUtils');

// GET /api/invoices (List with filtering and pagination)
router.get('/', (req, res, next) => {
  try {
    const { startDate, endDate, search, paymentStatus, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = "WHERE 1=1";
    const params = [];

    if (startDate) {
      whereClause += " AND date(i.created_at) >= date(?)";
      params.push(startDate);
    }
    if (endDate) {
      whereClause += " AND date(i.created_at) <= date(?)";
      params.push(endDate);
    }
    if (paymentStatus) {
      whereClause += " AND i.payment_status = ?";
      params.push(paymentStatus);
    }
    if (search) {
      whereClause += " AND (i.invoice_number LIKE ? OR i.customer_name LIKE ? OR i.device_name LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    const invoices = db.prepare(`
      SELECT i.*, u.full_name as cashier_name
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      ${whereClause}
      ORDER BY i.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, Number(limit), offset);

    const count = db.prepare(`SELECT COUNT(*) as total FROM invoices i ${whereClause}`).get(...params);

    res.json({
      success: true,
      invoices,
      pagination: {
        total: count.total,
        page: Number(page),
        pages: Math.ceil(count.total / Number(limit))
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id (Detailed invoice with items and receipt store header/footer)
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = db.prepare(`
      SELECT i.*, u.full_name as cashier_name
      FROM invoices i
      LEFT JOIN users u ON i.cashier_id = u.id
      WHERE i.id = ? OR i.invoice_number = ?
    `).get(id, id);

    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
    const payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ?').all(invoice.id);
    const store = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    res.json({
      success: true,
      invoice: {
        ...invoice,
        items,
        payments,
        store
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices/standalone (Direct POS sale: drinks/snacks without session)
router.post('/standalone', authenticate, (req, res, next) => {
  try {
    const {
      customerId,
      customerName = 'Walk-in / كافيه',
      items, // array of { productId, quantity }
      paymentMethod = 'cash',
      paidAmount,
      discountAmount = 0,
      discountReason,
      notes
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'يرجى إضافة منتج واحد على الأقل للسلة' });
    }

    // Check active shift
    const activeShift = db.prepare(`SELECT * FROM shifts WHERE status = 'open' ORDER BY start_time DESC LIMIT 1`).get();
    const shiftId = activeShift ? activeShift.id : null;

    const now = new Date();
    const nowStr = getLocalDateTimeString(now);
    const datePart = nowStr.slice(0, 10).replace(/-/g, '');
    const countToday = db.prepare('SELECT COUNT(*) as c FROM invoices WHERE created_at LIKE ?').get(`${nowStr.slice(0, 10)}%`).c + 1;
    const invoiceNum = `INV-${datePart}-${String(countToday).padStart(4, '0')}`;
    const invoiceId = 'inv_' + uuidv4().slice(0, 8);

    let subtotal = 0;
    const processedItems = [];

    // Verify stock and prepare items
    for (const item of items) {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(item.productId);
      if (!prod) return res.status(400).json({ success: false, message: `المنتج غير موجود: ${item.productId}` });

      const qty = Math.max(1, Number(item.quantity));
      if (prod.stock_quantity < qty) {
        return res.status(400).json({ success: false, message: `الكمية المتوفرة من ${prod.name} بالمخزن (${prod.stock_quantity}) غير كافية` });
      }

      const itemTotal = prod.selling_price * qty;
      subtotal += itemTotal;
      processedItems.push({
        product: prod,
        quantity: qty,
        unitPrice: prod.selling_price,
        totalPrice: itemTotal
      });
    }

    const discount = Math.max(0, Number(discountAmount) || 0);
    const grandTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const paid = Number(paidAmount) || grandTotal;
    const change = Math.max(0, Math.round((paid - grandTotal) * 100) / 100);
    const remaining = Math.max(0, Math.round((grandTotal - paid) * 100) / 100);

    let paymentStatus = 'paid';
    if (remaining > 0) {
      if (paymentMethod !== 'credit') {
        return res.status(400).json({ success: false, message: `المبلغ المدفوع أقل من الإجمالي. يرجى سداد المبلغ كاملاً أو اختيار الدفع الآجل.` });
      }
      paymentStatus = 'partial';
    }

    const runTransaction = db.transaction(() => {
      // 1. Create Invoice
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, customer_id, customer_name, cashier_id, cashier_name,
          shift_id, device_name, room_name, products_subtotal, subtotal, discount_amount,
          discount_reason, grand_total, paid_amount, change_amount, remaining_amount,
          payment_method, payment_status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'مبيعات كافيه / مباشر', 'الكافيه', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        invoiceId, invoiceNum, customerId || null, customerName, req.user.id, req.user.full_name,
        shiftId, subtotal, subtotal, discount, discountReason || null, grandTotal, paid, change, remaining,
        paymentMethod, paymentStatus, notes || null, nowStr
      );

      // 2. Insert Invoice Items and decrement inventory
      for (const p of processedItems) {
        const itemId = 'itmp_' + uuidv4().slice(0, 8);
        db.prepare(`
          INSERT INTO invoice_items (id, invoice_id, item_type, product_id, item_name, quantity, unit_price, total_price)
          VALUES (?, ?, 'product', ?, ?, ?, ?, ?)
        `).run(itemId, invoiceId, p.product.id, p.product.name, p.quantity, p.unitPrice, p.totalPrice);

        db.prepare('UPDATE products SET stock_quantity = stock_quantity - ? WHERE id = ?').run(p.quantity, p.product.id);

        const txId = 'tx_' + uuidv4().slice(0, 8);
        db.prepare(`
          INSERT INTO inventory_transactions (id, product_id, type, quantity, unit_cost, unit_price, reference_id, notes, created_by)
          VALUES (?, ?, 'pos_sale', ?, ?, ?, ?, 'فاتورة كافيه مباشرة', ?)
        `).run(txId, p.product.id, p.quantity, p.product.cost_price, p.unitPrice, invoiceId, req.user.id);
      }

      // 3. Record Payment
      const paymentId = 'pay_' + uuidv4().slice(0, 8);
      db.prepare(`
        INSERT INTO payments (id, invoice_id, amount, payment_method, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(paymentId, invoiceId, paid > grandTotal ? grandTotal : paid, paymentMethod, `سداد فاتورة كافيه ${invoiceNum}`);

      // 4. Update Shift
      if (shiftId) {
        const cashAmount = paymentMethod === 'cash' ? (paid > grandTotal ? grandTotal : paid) : 0;
        const cardAmount = paymentMethod === 'card' ? grandTotal : 0;
        const walletAmount = paymentMethod === 'wallet' ? grandTotal : 0;

        db.prepare(`
          UPDATE shifts
          SET cash_sales = cash_sales + ?,
              card_sales = card_sales + ?,
              wallet_sales = wallet_sales + ?,
              total_sales = total_sales + ?,
              expected_cash = expected_cash + ?
          WHERE id = ?
        `).run(cashAmount, cardAmount, walletAmount, grandTotal, cashAmount, shiftId);
      }

      // 5. Update Customer stats
      if (customerId) {
        db.prepare(`
          UPDATE customers
          SET total_visits = total_visits + 1,
              total_spending = total_spending + ?,
              last_visit = ?
          WHERE id = ?
        `).run(grandTotal, nowStr, customerId);
      }
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'POS_SALE_CREATE',
      entityType: 'invoice',
      entityId: invoiceId,
      newValue: { invoiceNum, grandTotal, itemsCount: processedItems.length },
      notes: `فاتورة كافيه مباشرة ${invoiceNum}`,
      req
    });

    const fullInvoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId);
    const invoiceItems = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    const storeSettings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    res.json({
      success: true,
      message: `تم إنشاء الفاتورة رقم ${invoiceNum} بنجاح`,
      invoice: {
        ...fullInvoice,
        items: invoiceItems,
        store: storeSettings
      }
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/invoices/:id/refund (Refund full invoice or specific item)
router.post('/:id/refund', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, refundAmount } = req.body;

    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    if (!invoice) return res.status(404).json({ success: false, message: 'الفاتورة غير موجودة' });

    if (invoice.payment_status === 'refunded') {
      return res.status(400).json({ success: false, message: 'تم استرجاع هذه الفاتورة مسبقاً' });
    }

    const amountToRefund = Number(refundAmount) || invoice.paid_amount;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(id);

    const runTransaction = db.transaction(() => {
      // 1. Mark invoice as refunded
      db.prepare("UPDATE invoices SET payment_status = 'refunded', notes = COALESCE(notes || ' | ', '') || ? WHERE id = ?")
        .run(`تم الاسترجاع: ${reason || 'بطلب العميل'} بمبلغ ${amountToRefund} ج.م`, id);

      // 2. Restore products back to stock
      for (const itm of items) {
        if (itm.item_type === 'product' && itm.product_id) {
          db.prepare('UPDATE products SET stock_quantity = stock_quantity + ? WHERE id = ?').run(itm.quantity, itm.product_id);

          const txId = 'tx_' + uuidv4().slice(0, 8);
          db.prepare(`
            INSERT INTO inventory_transactions (id, product_id, type, quantity, unit_cost, unit_price, reference_id, notes, created_by)
            VALUES (?, ?, 'refund', ?, 0, ?, ?, ?, ?)
          `).run(txId, itm.product_id, itm.quantity, itm.unit_price, id, `استرجاع من الفاتورة ${invoice.invoice_number}`, req.user.id);
        }
      }

      // 3. Record Cash Drawer Refund if cash
      if (invoice.shift_id) {
        const cashTxId = 'ctx_' + uuidv4().slice(0, 8);
        db.prepare(`
          INSERT INTO cash_transactions (id, shift_id, type, amount, reason, user_id)
          VALUES (?, ?, 'refund', ?, ?, ?)
        `).run(cashTxId, invoice.shift_id, amountToRefund, `استرجاع فاتورة رقم ${invoice.invoice_number}: ${reason || ''}`, req.user.id);

        db.prepare(`
          UPDATE shifts
          SET cash_sales = MAX(0, cash_sales - ?),
              total_sales = MAX(0, total_sales - ?),
              expected_cash = MAX(0, expected_cash - ?)
          WHERE id = ?
        `).run(amountToRefund, amountToRefund, amountToRefund, invoice.shift_id);
      }
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'INVOICE_REFUND',
      entityType: 'invoice',
      entityId: id,
      notes: `استرجاع فاتورة ${invoice.invoice_number} بمبلغ ${amountToRefund} ج.م. السبب: ${reason || ''}`,
      req
    });

    res.json({ success: true, message: `تم استرجاع الفاتورة رقم ${invoice.invoice_number} بنجاح وإعادة المنتجات للمخزون` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
