const db = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function logAudit({ userId, userName, action, entityType, entityId, previousValue = null, newValue = null, notes = null, req = null }) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip) : null;
    const stmt = db.prepare(`
      INSERT INTO audit_logs (id, user_id, user_name, action, entity_type, entity_id, previous_value, new_value, ip_address, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      uuidv4(),
      userId || null,
      userName || 'System',
      action,
      entityType,
      entityId ? String(entityId) : null,
      previousValue ? (typeof previousValue === 'object' ? JSON.stringify(previousValue) : String(previousValue)) : null,
      newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : null,
      ipAddress,
      notes
    );
  } catch (err) {
    console.error('Audit Log Error:', err.message);
  }
}

module.exports = {
  logAudit
};
