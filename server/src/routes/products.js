const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/products (List products with category info)
router.get('/', (req, res, next) => {
  try {
    const { categoryId, activeOnly, search } = req.query;
    let query = `
      SELECT p.*, c.name as category_name, c.name_en as category_name_en, c.icon as category_icon
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (activeOnly === 'true') {
      query += " AND p.is_active = 1";
    }
    if (categoryId) {
      query += " AND p.category_id = ?";
      params.push(categoryId);
    }
    if (search) {
      query += " AND (p.name LIKE ? OR p.name_en LIKE ? OR p.barcode LIKE ? OR p.sku LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += " ORDER BY c.sort_order ASC, p.name ASC";
    const products = db.prepare(query).all(...params);

    res.json({ success: true, products });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories
router.get('/categories', (req, res, next) => {
  try {
    const categories = db.prepare(`
      SELECT c.*, COUNT(p.id) as products_count
      FROM product_categories c
      LEFT JOIN products p ON c.id = p.category_id
      GROUP BY c.id
      ORDER BY c.sort_order ASC
    `).all();
    res.json({ success: true, categories });
  } catch (err) {
    next(err);
  }
});

// POST /api/products/categories
router.post('/categories', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { name, name_en, icon } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'يرجى إدخال اسم التصنيف' });

    const id = 'cat_' + uuidv4().slice(0, 8);
    const maxSort = db.prepare('SELECT MAX(sort_order) as m FROM product_categories').get().m || 0;

    db.prepare('INSERT INTO product_categories (id, name, name_en, icon, sort_order) VALUES (?, ?, ?, ?, ?)')
      .run(id, name, name_en || null, icon || 'Folder', maxSort + 1);

    res.json({ success: true, message: 'تمت إضافة التصنيف بنجاح', categoryId: id });
  } catch (err) {
    next(err);
  }
});

// POST /api/products
router.post('/', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { name, name_en, category_id, sku, barcode, selling_price, cost_price, stock_quantity, min_stock_alert, unit } = req.body;
    if (!name || !category_id || selling_price === undefined) {
      return res.status(400).json({ success: false, message: 'يرجى ملء الحقول الإلزامية للمنتج' });
    }

    const id = 'prod_' + uuidv4().slice(0, 8);
    db.prepare(`
      INSERT INTO products (id, name, name_en, category_id, sku, barcode, selling_price, cost_price, stock_quantity, min_stock_alert, unit)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, name, name_en || null, category_id, sku || null, barcode || null,
      Number(selling_price), Number(cost_price || 0), Number(stock_quantity || 0),
      Number(min_stock_alert || 5), unit || 'قطعة'
    );

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'PRODUCT_CREATE',
      entityType: 'product',
      entityId: id,
      newValue: req.body,
      req
    });

    res.json({ success: true, message: 'تمت إضافة المنتج بنجاح', productId: id });
  } catch (err) {
    next(err);
  }
});

// PUT /api/products/:id
router.put('/:id', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, name_en, category_id, sku, barcode, selling_price, cost_price, min_stock_alert, unit, is_active } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });

    db.prepare(`
      UPDATE products
      SET name = ?, name_en = ?, category_id = ?, sku = ?, barcode = ?, selling_price = ?, cost_price = ?,
          min_stock_alert = ?, unit = ?, is_active = ?
      WHERE id = ?
    `).run(
      name, name_en, category_id, sku, barcode, Number(selling_price), Number(cost_price),
      Number(min_stock_alert), unit, is_active !== undefined ? is_active : existing.is_active, id
    );

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'PRODUCT_UPDATE',
      entityType: 'product',
      entityId: id,
      previousValue: existing,
      newValue: req.body,
      req
    });

    res.json({ success: true, message: 'تم تحديث بيانات المنتج بنجاح' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/products/:id
router.delete('/:id', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const { id } = req.params;
    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });

    // Check if transactions or orders exist
    const ordersCount = db.prepare('SELECT COUNT(*) as c FROM session_orders WHERE product_id = ?').get(id);
    const invoiceItemsCount = db.prepare('SELECT COUNT(*) as c FROM invoice_items WHERE product_id = ?').get(id);

    if (ordersCount.c > 0 || invoiceItemsCount.c > 0) {
      // Soft disable
      db.prepare('UPDATE products SET is_active = 0 WHERE id = ?').run(id);
      return res.json({ success: true, message: 'تم إيقاف تنشيط المنتج بدلاً من حذفه لحفظ السجلات المالية' });
    }

    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    res.json({ success: true, message: 'تم حذف المنتج بنجاح' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
