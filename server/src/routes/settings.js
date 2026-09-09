const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { authenticate, authorize } = require('../middleware/auth');
const { logAudit } = require('../middleware/audit');

// GET /api/settings
router.get('/', (req, res, next) => {
  try {
    const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, settings });
  } catch (err) {
    next(err);
  }
});

// PUT /api/settings
router.put('/', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const {
      store_name, store_name_en, logo_url, phone, address, tax_number, commercial_reg,
      currency, currency_symbol, round_method, min_charge_minutes, peak_hours_enabled,
      peak_start_time, peak_end_time, peak_surcharge_percent, thermal_width,
      show_logo_on_receipt, show_customer_on_receipt, show_cashier_on_receipt,
      invoice_footer_msg, language, theme, auto_refresh_interval
    } = req.body;

    const existing = db.prepare('SELECT * FROM settings WHERE id = 1').get();

    db.prepare(`
      UPDATE settings
      SET store_name = COALESCE(?, store_name),
          store_name_en = COALESCE(?, store_name_en),
          logo_url = ?,
          phone = COALESCE(?, phone),
          address = COALESCE(?, address),
          tax_number = ?,
          commercial_reg = ?,
          currency = COALESCE(?, currency),
          currency_symbol = COALESCE(?, currency_symbol),
          round_method = COALESCE(?, round_method),
          min_charge_minutes = COALESCE(?, min_charge_minutes),
          peak_hours_enabled = COALESCE(?, peak_hours_enabled),
          peak_start_time = COALESCE(?, peak_start_time),
          peak_end_time = COALESCE(?, peak_end_time),
          peak_surcharge_percent = COALESCE(?, peak_surcharge_percent),
          thermal_width = COALESCE(?, thermal_width),
          show_logo_on_receipt = COALESCE(?, show_logo_on_receipt),
          show_customer_on_receipt = COALESCE(?, show_customer_on_receipt),
          show_cashier_on_receipt = COALESCE(?, show_cashier_on_receipt),
          invoice_footer_msg = COALESCE(?, invoice_footer_msg),
          language = COALESCE(?, language),
          theme = COALESCE(?, theme),
          auto_refresh_interval = COALESCE(?, auto_refresh_interval),
          updated_at = datetime('now', 'localtime')
      WHERE id = 1
    `).run(
      store_name, store_name_en, logo_url || null, phone, address, tax_number || null,
      commercial_reg || null, currency, currency_symbol, round_method, Number(min_charge_minutes),
      peak_hours_enabled ? 1 : 0, peak_start_time, peak_end_time, Number(peak_surcharge_percent),
      Number(thermal_width), show_logo_on_receipt ? 1 : 0, show_customer_on_receipt ? 1 : 0,
      show_cashier_on_receipt ? 1 : 0, invoice_footer_msg, language, theme, Number(auto_refresh_interval)
    );

    logAudit({
      userId: req.user.id,
      userName: req.user.full_name,
      action: 'SETTINGS_UPDATE',
      entityType: 'settings',
      entityId: '1',
      previousValue: existing,
      newValue: req.body,
      notes: 'تحديث إعدادات النظام العامة',
      req
    });

    const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
    res.json({ success: true, message: 'تم حفظ الإعدادات بنجاح', settings: updated });
  } catch (err) {
    next(err);
  }
});

// GET /api/settings/backup/download (Download sqlite file copy)
router.get('/backup/download', authenticate, authorize('admin'), (req, res, next) => {
  try {
    const dbPath = path.resolve(__dirname, '../../data/ps_cafe.db');
    if (!fs.existsSync(dbPath)) {
      return res.status(404).json({ success: false, message: 'ملف قاعدة البيانات غير موجود' });
    }

    const timestamp = new Date().toISOString().slice(0, 10);
    res.download(dbPath, `ps_cafe_backup_${timestamp}.db`);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
