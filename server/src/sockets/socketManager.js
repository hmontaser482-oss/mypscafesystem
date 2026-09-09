let io = null;
const db = require('../db/database');
const { calculateSessionTotal } = require('../engines/pricingEngine');

function initSockets(socketIoInstance) {
  io = socketIoInstance;

  io.on('connection', (socket) => {
    // console.log(`[Socket] Client connected: ${socket.id}`);

    socket.on('disconnect', () => {
      // console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // Background ticker to emit active sessions live calculations and check for expiring fixed sessions
  setInterval(() => {
    try {
      if (!io) return;
      const activeSessions = db.prepare(`
        SELECT s.id, s.device_id, s.status, s.time_mode, s.target_duration_minutes, s.start_time, s.expected_end_time
        FROM sessions s
        WHERE s.status IN ('running', 'paused', 'time_expired')
      `).all();

      const liveUpdates = [];
      const now = new Date();

      for (const s of activeSessions) {
        try {
          const calc = calculateSessionTotal(s.id);
          
          // Check for fixed time expiry
          if (s.time_mode === 'fixed' && s.status === 'running' && s.expected_end_time) {
            const expTime = new Date(s.expected_end_time);
            if (now >= expTime) {
              // Transition session to time_expired
              db.prepare(`UPDATE sessions SET status = 'time_expired', updated_at = datetime('now', 'localtime') WHERE id = ?`).run(s.id);
              db.prepare(`UPDATE devices SET status = 'time_expired' WHERE id = ?`).run(s.device_id);
              
              // Broadcast expiry notification
              const notifId = 'notif_' + Date.now();
              const notifMsg = `انتهى وقت الجلسة للجهاز المحدد (${s.device_id})`;
              db.prepare(`
                INSERT INTO notifications (id, type, title, message, reference_id)
                VALUES (?, 'session_expired', 'تنبيه انتهاء الوقت', ?, ?)
              `).run(notifId, notifMsg, s.device_id);

              io.emit('notification:new', {
                id: notifId,
                type: 'session_expired',
                title: 'تنبيه انتهاء الوقت',
                message: notifMsg,
                deviceId: s.device_id
              });

              io.emit('device:updated', { deviceId: s.device_id, status: 'time_expired' });
            }
          }

          // Persist heartbeat and live totals to DB for instant crash recovery
          const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
          db.prepare(`
            UPDATE sessions 
            SET total_played_seconds = ?,
                total_paused_seconds = ?,
                gaming_amount = ?,
                total_amount = ?,
                updated_at = datetime('now', 'localtime')
            WHERE id = ?
          `).run(calc.totalPlayedSeconds, calc.totalPausedSeconds, calc.gamingCost, calc.grandTotal, s.id);

          db.prepare(`
            UPDATE session_intervals 
            SET duration_seconds = ? 
            WHERE session_id = ? AND end_time IS NULL
          `).run(calc.totalPlayedSeconds, s.id);

          liveUpdates.push({
            sessionId: s.id,
            deviceId: s.device_id,
            status: s.status,
            totalPlayedSeconds: calc.totalPlayedSeconds,
            totalPausedSeconds: calc.totalPausedSeconds,
            gamingCost: calc.gamingCost,
            productsCost: calc.productsCost,
            grandTotal: calc.grandTotal
          });
        } catch (e) {
          // ignore transient calculation errors
        }
      }

      if (liveUpdates.length > 0) {
        io.emit('sessions:tick', liveUpdates);
      }
    } catch (err) {
      console.error('Socket Ticker Error:', err.message);
    }
  }, 1000); // ticks every 1 second for real-time responsiveness & crash tolerance
}

function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  }
}

module.exports = {
  initSockets,
  broadcast
};
