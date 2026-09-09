const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');

// GET /api/reports/dashboard (Real-time executive summary for Dashboard)
router.get('/dashboard', authenticate, (req, res, next) => {
  try {
    const todayStr = new Date().toISOString().slice(0, 10);

    // Devices status counts
    const devicesCounts = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'paused' THEN 1 ELSE 0 END) as paused,
        SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) as reserved,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance,
        SUM(CASE WHEN status = 'disabled' THEN 1 ELSE 0 END) as disabled
      FROM devices
    `).get();

    // Active sessions count
    const activeSessionsCount = db.prepare(`
      SELECT COUNT(*) as c FROM sessions WHERE status IN ('running', 'paused', 'time_expired')
    `).get().c;

    // Today's financials from invoices
    const todaySales = db.prepare(`
      SELECT 
        COUNT(*) as invoice_count,
        COALESCE(SUM(grand_total), 0) as total_sales,
        COALESCE(SUM(gaming_subtotal), 0) as gaming_sales,
        COALESCE(SUM(products_subtotal), 0) as products_sales,
        COALESCE(SUM(paid_amount), 0) as total_collected,
        COALESCE(SUM(discount_amount), 0) as total_discounts
      FROM invoices
      WHERE date(created_at) = date(?) AND payment_status != 'refunded'
    `).get(todayStr);

    // Today's expenses
    const todayExpenses = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE date = date(?)
    `).get(todayStr);

    // Today's bookings count
    const todayBookingsCount = db.prepare(`
      SELECT COUNT(*) as c FROM bookings WHERE booking_date = date(?)
    `).get(todayStr).c;

    // Active Shift Info
    const currentShift = db.prepare(`
      SELECT s.*, u.full_name as cashier_name
      FROM shifts s
      JOIN users u ON s.cashier_id = u.id
      WHERE s.status = 'open'
      ORDER BY s.start_time DESC
      LIMIT 1
    `).get();

    // Net profit today
    const netProfit = Math.round((todaySales.total_sales - todayExpenses.total_expenses) * 100) / 100;

    // Hourly sales for today (for sparkline / chart)
    const hourlyDistribution = db.prepare(`
      SELECT strftime('%H:00', created_at) as hour, SUM(grand_total) as amount, COUNT(*) as count
      FROM invoices
      WHERE date(created_at) = date(?) AND payment_status != 'refunded'
      GROUP BY hour
      ORDER BY hour ASC
    `).all(todayStr);

    res.json({
      success: true,
      summary: {
        devices: devicesCounts,
        activeSessionsCount,
        todaySales: {
          ...todaySales,
          netProfit,
          expenses: todayExpenses.total_expenses
        },
        todayBookingsCount,
        currentShift: currentShift || null,
        hourlyDistribution
      }
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/sales (Sales report by date range)
router.get('/sales', authenticate, (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);

    const dailyBreakdown = db.prepare(`
      SELECT 
        date(created_at) as report_date,
        COUNT(*) as invoices_count,
        COALESCE(SUM(gaming_subtotal), 0) as gaming_revenue,
        COALESCE(SUM(products_subtotal), 0) as products_revenue,
        COALESCE(SUM(discount_amount), 0) as discounts,
        COALESCE(SUM(grand_total), 0) as grand_total
      FROM invoices
      WHERE date(created_at) BETWEEN date(?) AND date(?) AND payment_status != 'refunded'
      GROUP BY date(created_at)
      ORDER BY report_date DESC
    `).all(start, end);

    const paymentMethods = db.prepare(`
      SELECT payment_method, COUNT(*) as count, SUM(grand_total) as total
      FROM invoices
      WHERE date(created_at) BETWEEN date(?) AND date(?) AND payment_status != 'refunded'
      GROUP BY payment_method
    `).all(start, end);

    res.json({
      success: true,
      range: { startDate: start, endDate: end },
      dailyBreakdown,
      paymentMethods
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/gaming (Device, Room, Group, and Hourly usage)
router.get('/gaming', authenticate, (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);

    // Revenue per device
    const perDevice = db.prepare(`
      SELECT 
        d.id, d.name, d.device_type,
        COUNT(s.id) as sessions_count,
        COALESCE(SUM(s.total_played_seconds) / 3600.0, 0) as hours_played,
        COALESCE(SUM(s.gaming_amount), 0) as revenue
      FROM devices d
      LEFT JOIN sessions s ON d.id = s.device_id AND s.status = 'completed' AND date(s.start_time) BETWEEN date(?) AND date(?)
      GROUP BY d.id
      ORDER BY revenue DESC
    `).all(start, end);

    // Revenue per group
    const perGroup = db.prepare(`
      SELECT 
        g.name as group_name,
        COUNT(s.id) as sessions_count,
        COALESCE(SUM(s.gaming_amount), 0) as revenue
      FROM groups g
      LEFT JOIN devices d ON g.id = d.group_id
      LEFT JOIN sessions s ON d.id = s.device_id AND s.status = 'completed' AND date(s.start_time) BETWEEN date(?) AND date(?)
      GROUP BY g.id
      ORDER BY revenue DESC
    `).all(start, end);

    // Revenue per room
    const perRoom = db.prepare(`
      SELECT 
        r.name as room_name,
        COUNT(s.id) as sessions_count,
        COALESCE(SUM(s.gaming_amount), 0) as revenue
      FROM rooms r
      LEFT JOIN devices d ON r.id = d.room_id
      LEFT JOIN sessions s ON d.id = s.device_id AND s.status = 'completed' AND date(s.start_time) BETWEEN date(?) AND date(?)
      GROUP BY r.id
      ORDER BY revenue DESC
    `).all(start, end);

    // Single vs Multiplayer split
    const singleVsMulti = db.prepare(`
      SELECT 
        session_type,
        COUNT(*) as count,
        COALESCE(SUM(gaming_amount), 0) as revenue,
        COALESCE(SUM(total_played_seconds) / 3600.0, 0) as hours
      FROM sessions
      WHERE status = 'completed' AND date(start_time) BETWEEN date(?) AND date(?)
      GROUP BY session_type
    `).all(start, end);

    // Peak hours analysis (histogram by hour 00:00 to 23:00)
    const peakHours = db.prepare(`
      SELECT 
        strftime('%H:00', start_time) as hour,
        COUNT(*) as sessions_count,
        COALESCE(SUM(gaming_amount), 0) as revenue
      FROM sessions
      WHERE date(start_time) BETWEEN date(?) AND date(?)
      GROUP BY hour
      ORDER BY hour ASC
    `).all(start, end);

    res.json({
      success: true,
      perDevice,
      perGroup,
      perRoom,
      singleVsMulti,
      peakHours
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/products (Best selling products and margins)
router.get('/products', authenticate, (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);

    const topSelling = db.prepare(`
      SELECT 
        p.id, p.name, p.unit, p.stock_quantity,
        c.name as category_name,
        COALESCE(SUM(ii.quantity), 0) as total_sold,
        COALESCE(SUM(ii.total_price), 0) as total_revenue,
        COALESCE(SUM(ii.quantity * p.cost_price), 0) as total_cost,
        COALESCE(SUM(ii.total_price - (ii.quantity * p.cost_price)), 0) as total_profit
      FROM products p
      JOIN product_categories c ON p.category_id = c.id
      LEFT JOIN invoice_items ii ON p.id = ii.product_id
      LEFT JOIN invoices i ON ii.invoice_id = i.id AND date(i.created_at) BETWEEN date(?) AND date(?) AND i.payment_status != 'refunded'
      GROUP BY p.id
      ORDER BY total_sold DESC
    `).all(start, end);

    res.json({ success: true, topSelling });
  } catch (err) {
    next(err);
  }
});

// GET /api/reports/export-csv (Export invoices or gaming data as CSV)
router.get('/export-csv', authenticate, (req, res, next) => {
  try {
    const { type = 'invoices', startDate, endDate } = req.query;
    const start = startDate || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel Arabic support

    if (type === 'invoices') {
      const rows = db.prepare(`
        SELECT invoice_number, customer_name, device_name, gaming_subtotal, products_subtotal, discount_amount, grand_total, paid_amount, payment_method, payment_status, created_at
        FROM invoices
        WHERE date(created_at) BETWEEN date(?) AND date(?)
        ORDER BY created_at DESC
      `).all(start, end);

      csvContent += 'رقم الفاتورة,اسم العميل,الجهاز,حساب اللعب,حساب الكافيه,الخصم,الإجمالي,المدفوع,طريقة الدفع,الحالة,التاريخ والوقت\n';
      rows.forEach(r => {
        csvContent += `"${r.invoice_number}","${r.customer_name}","${r.device_name || ''}",${r.gaming_subtotal},${r.products_subtotal},${r.discount_amount},${r.grand_total},${r.paid_amount},"${r.payment_method}","${r.payment_status}","${r.created_at}"\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=invoices_${start}_to_${end}.csv`);
      return res.send(csvContent);
    } else {
      const rows = db.prepare(`
        SELECT d.name as device_name, s.customer_name, s.session_type, s.start_time, s.end_time, s.total_played_seconds / 60 as minutes_played, s.gaming_amount, s.products_amount, s.total_amount
        FROM sessions s
        JOIN devices d ON s.device_id = d.id
        WHERE date(s.start_time) BETWEEN date(?) AND date(?)
        ORDER BY s.start_time DESC
      `).all(start, end);

      csvContent += 'الجهاز,العميل,نوع اللعب,البداية,النهاية,الدقائق,حساب اللعب,الطلبات,الإجمالي\n';
      rows.forEach(r => {
        csvContent += `"${r.device_name}","${r.customer_name}","${r.session_type}","${r.start_time}","${r.end_time || ''}",${Math.round(r.minutes_played)},${r.gaming_amount},${r.products_amount},${r.total_amount}\n`;
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename=gaming_sessions_${start}_to_${end}.csv`);
      return res.send(csvContent);
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
