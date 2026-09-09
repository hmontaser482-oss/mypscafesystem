const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');
const { getLocalDateTimeString } = require('../utils/dateUtils');

// GET /api/inventory/overview (Valuation and stock status)
router.get('/overview', (req, res, next) => {
  try {
    const products = db.prepare(`
      SELECT p.*, c.name as category_name
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      ORDER BY p.stock_quantity ASC
    `).all();

    let totalCostValue = 0;
    let totalRetailValue = 0;
    const lowStockItems = [];
    const outOfStockItems = [];

    products.forEach(p => {
      totalCostValue += p.stock_quantity * p.cost_price;
      totalRetailValue += p.stock_quantity * p.selling_price;
      if (p.stock_quantity <= 0) {
        outOfStockItems.push(p);
      } else if (p.stock_quantity <= p.min_stock_alert) {
        lowStockItems.push(p);
      }
    });

    res.json({
      success: true,
      stats: {
        totalProducts: products.length,
        totalCostValue: Math.round(totalCostValue * 100) / 100,
        totalRetailValue: Math.round(totalRetailValue * 100) / 100,
        estimatedProfit: Math.round((totalRetailValue - totalCostValue) * 100) / 100,
        lowStockCount: lowStockItems.length,
        outOfStockCount: outOfStockItems.length
      },
      lowStockItems,
      outOfStockItems,
      allProducts: products
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/inventory/transaction (Stock in, adjustment, waste, damage)
router.post('/transaction', authenticate, authorize('admin', 'manager'), (req, res, next) => {
  try {
    const { productId, type, quantity, unitCost, notes } = req.body;
    // type: 'stock_in', 'stock_out', 'adjustment', 'damaged', 'waste'

    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'بيانات حركة المخزون غير مكتملة' });
    }

    const qty = Number(quantity);
    if (qty <= 0) return res.status(400).json({ success: false, message: 'الكمية يجب أن تكون أكبر من الصفر' });

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) return res.status(404).json({ success: false, message: 'المنتج غير موجود' });

    let newStock = product.stock_quantity;
    if (type === 'stock_in') {
      newStock += qty;
    } else if (['stock_out', 'damaged', 'waste'].includes(type)) {
      if (product.stock_quantity < qty) {
        return res.status(400).json({ success: false, message: 'الكمية المراد خصمها أكبر من الرصيد المتوفر بالمخزن' });
      }
      newStock -= qty;
    } else if (type === 'adjustment') {
      newStock = qty; // direct adjustment to target
    }

    const txId = 'tx_' + uuidv4().slice(0, 8);
    const nowStr = getLocalDateTimeString();

    const runTransaction = db.transaction(() => {
      db.prepare('UPDATE products SET stock_quantity = ?, cost_price = COALESCE(?, cost_price) WHERE id = ?')
        .run(newStock, unitCost ? Number(unitCost) : null, productId);

      db.prepare(`
        INSERT INTO inventory_transactions (id, product_id, type, quantity, unit_cost, unit_price, notes, created_by, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(txId, productId, type, qty, unitCost ? Number(unitCost) : product.cost_price, product.selling_price, notes || null, req.user.id, nowStr);
    });

    runTransaction();

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'INVENTORY_TRANSACTION',
      entityType: 'inventory',
      entityId: txId,
      newValue: { productId, type, quantity: qty, newStock },
      notes: `حركة مخزنية (${type}) للمنتج ${product.name}`,
      req
    });

    res.json({
      success: true,
      message: 'تم تسجيل الحركة وتحديث رصيد المخزون بنجاح',
      newStockQuantity: newStock
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/inventory/transactions (List historical stock movements)
router.get('/transactions', (req, res, next) => {
  try {
    const { productId, type, limit = 50 } = req.query;
    let query = `
      SELECT t.*, p.name as product_name, u.full_name as created_by_name
      FROM inventory_transactions t
      JOIN products p ON t.product_id = p.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (productId) {
      query += " AND t.product_id = ?";
      params.push(productId);
    }
    if (type) {
      query += " AND t.type = ?";
      params.push(type);
    }

    query += " ORDER BY t.created_at DESC LIMIT ?";
    params.push(Number(limit));

    const transactions = db.prepare(query).all(...params);
    res.json({ success: true, transactions });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
