/**
 * Database Cleanup Script
 * Completely removes all test and demo data (sessions, invoices, shifts, expenses, bookings, etc.)
 * Resets all PlayStation devices to clean 'available' status.
 * Leaves users, device groups, rooms, games, products, and settings intact.
 */

const db = require('./database');

function cleanAllDemoData() {
  console.log('Cleaning all demo/test data for a fresh start...');

  const runTransaction = db.transaction(() => {
    // 1. Clear sessions and related data
    db.prepare('DELETE FROM session_orders').run();
    db.prepare('DELETE FROM session_pauses').run();
    db.prepare('DELETE FROM session_transfers').run();
    db.prepare('DELETE FROM session_intervals').run();
    db.prepare('DELETE FROM sessions').run();

    // 2. Clear invoices and financial records
    db.prepare('DELETE FROM payments').run();
    db.prepare('DELETE FROM invoice_items').run();
    db.prepare('DELETE FROM invoices').run();

    // 3. Clear shifts and cash transactions
    db.prepare('DELETE FROM cash_transactions').run();
    db.prepare('DELETE FROM shifts').run();

    // 4. Clear expenses
    db.prepare('DELETE FROM expenses').run();

    // 5. Clear bookings and maintenance records
    db.prepare('DELETE FROM bookings').run();
    db.prepare('DELETE FROM device_maintenance').run();

    // 6. Clear audit logs and notifications
    db.prepare('DELETE FROM audit_logs').run();
    db.prepare('DELETE FROM notifications').run();

    // 7. Clear inventory transactions from demo sales
    db.prepare('DELETE FROM inventory_transactions').run();

    // 8. Clear demo customers
    db.prepare('DELETE FROM customers').run();

    // 9. Reset all devices to 'available' with no active session
    db.prepare(`
      UPDATE devices 
      SET status = 'available', 
          current_session_id = NULL
    `).run();

    console.log('Reset all devices to available.');
  });

  runTransaction();
  console.log('✅ All demo and test data has been successfully purged!');
  console.log('The system is completely clean and ready for real-world production use.');
}

if (require.main === module) {
  cleanAllDemoData();
}

module.exports = cleanAllDemoData;
