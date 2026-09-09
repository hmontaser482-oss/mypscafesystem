const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const { getDatabasePath } = require('../utils/vaultManager');

const dbPath = getDatabasePath();
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// If master database in hidden vault does not exist yet, migrate from local fallback if available
const localTemplate = path.resolve(__dirname, '../../data/ps_cafe.db');
if (!fs.existsSync(dbPath) && fs.existsSync(localTemplate)) {
  try {
    fs.copyFileSync(localTemplate, dbPath);
  } catch (e) {
    // Ignore and let schema initialization handle it
  }
}

const db = new Database(dbPath, {
  // verbose: console.log
});

// Enable WAL mode for high concurrency, fast reads & writes
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -64000'); // 64MB cache

// Initialize schema
const schemaPath = path.resolve(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

module.exports = db;
