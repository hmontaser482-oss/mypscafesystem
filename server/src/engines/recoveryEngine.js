const db = require('../db/database');
const { parseLocalDateTime, getLocalDateTimeString } = require('../utils/dateUtils');
const { calculateSessionTotal } = require('./pricingEngine');

/**
 * PlayStation Lounge Crash Recovery Engine
 * Ensures that if the server stops, restarts, or crashes while devices are running:
 * 1. Downtime period is completely frozen so customers are never overcharged for server offline time.
 * 2. Each device resumes exactly at its last played/paused time and state.
 * 3. Fixed-time sessions preserve their remaining time to the exact second.
 */

function recoverActiveSessionsOnStartup() {
  try {
    const now = new Date();
    const nowStr = getLocalDateTimeString(now);

    const activeSessions = db.prepare(`
      SELECT * FROM sessions WHERE status IN ('running', 'paused', 'time_expired')
    `).all();

    if (!activeSessions || activeSessions.length === 0) {
      // Sync devices table to available if any orphaned devices exist
      db.prepare(`
        UPDATE devices 
        SET status = 'available', current_session_id = NULL 
        WHERE status IN ('running', 'paused', 'time_expired') 
          AND (current_session_id IS NULL OR current_session_id NOT IN (SELECT id FROM sessions WHERE status IN ('running', 'paused', 'time_expired')))
      `).run();
      return;
    }

    console.log(`[Crash Recovery] Recovering ${activeSessions.length} active session(s) after server restart...`);

    for (const s of activeSessions) {
      try {
        const lastActiveStr = s.updated_at || s.start_time;
        const lastActiveTime = parseLocalDateTime(lastActiveStr);
        const downtimeMs = now.getTime() - lastActiveTime.getTime();
        const downtimeSec = Math.floor(downtimeMs / 1000);

        // If offline for more than 2 seconds, freeze downtime
        if (downtimeSec > 2) {
          console.log(`[Crash Recovery] Session ${s.id} on Device ${s.device_id} was offline for ${downtimeSec}s. Freezing downtime and resuming from last exact state.`);

          // 1. Shift session start_time forward
          const origStart = parseLocalDateTime(s.start_time);
          const newStart = new Date(origStart.getTime() + downtimeMs);
          const newStartStr = getLocalDateTimeString(newStart);

          // 2. Shift active interval start_time forward
          const activeInterval = db.prepare(`
            SELECT * FROM session_intervals WHERE session_id = ? AND end_time IS NULL ORDER BY start_time DESC LIMIT 1
          `).get(s.id);

          if (activeInterval) {
            const origInvStart = parseLocalDateTime(activeInterval.start_time);
            const newInvStart = new Date(origInvStart.getTime() + downtimeMs);
            db.prepare(`UPDATE session_intervals SET start_time = ? WHERE id = ?`)
              .run(getLocalDateTimeString(newInvStart), activeInterval.id);
          }

          // 3. Shift active pause start_time forward if paused
          if (s.status === 'paused') {
            const activePause = db.prepare(`
              SELECT * FROM session_pauses WHERE session_id = ? AND resume_time IS NULL ORDER BY pause_start DESC LIMIT 1
            `).get(s.id);

            if (activePause) {
              const origPauseStart = parseLocalDateTime(activePause.pause_start);
              const newPauseStart = new Date(origPauseStart.getTime() + downtimeMs);
              db.prepare(`UPDATE session_pauses SET pause_start = ? WHERE id = ?`)
                .run(getLocalDateTimeString(newPauseStart), activePause.id);
            }
          }

          // 4. Shift expected_end_time forward if fixed time session
          let newExpectedEndStr = s.expected_end_time;
          if (s.time_mode === 'fixed' && s.expected_end_time) {
            const origExpected = parseLocalDateTime(s.expected_end_time);
            const newExpected = new Date(origExpected.getTime() + downtimeMs);
            newExpectedEndStr = getLocalDateTimeString(newExpected);
          }

          // 5. Update session in database
          db.prepare(`
            UPDATE sessions
            SET start_time = ?,
                expected_end_time = ?,
                updated_at = ?
            WHERE id = ?
          `).run(newStartStr, newExpectedEndStr, nowStr, s.id);
        }

        // 6. Ensure device matches session state
        db.prepare(`
          UPDATE devices 
          SET status = ?, current_session_id = ?
          WHERE id = ?
        `).run(s.status, s.id, s.device_id);

        console.log(`[Crash Recovery] Device ${s.device_id} restored to status "${s.status}" with session ${s.id}.`);
      } catch (sessErr) {
        console.error(`[Crash Recovery] Error restoring session ${s.id}:`, sessErr.message);
      }
    }
  } catch (err) {
    console.error('[Crash Recovery] Error in recoverActiveSessionsOnStartup:', err.message);
  }
}

function saveActiveSessionsHeartbeat() {
  try {
    const nowStr = getLocalDateTimeString();
    const activeSessions = db.prepare(`
      SELECT id, device_id, status FROM sessions WHERE status IN ('running', 'paused', 'time_expired')
    `).all();

    if (!activeSessions || activeSessions.length === 0) return;

    for (const s of activeSessions) {
      try {
        const calc = calculateSessionTotal(s.id);
        db.prepare(`
          UPDATE sessions 
          SET total_played_seconds = ?,
              total_paused_seconds = ?,
              gaming_amount = ?,
              total_amount = ?,
              updated_at = ?
          WHERE id = ?
        `).run(calc.totalPlayedSeconds, calc.totalPausedSeconds, calc.gamingCost, calc.grandTotal, nowStr, s.id);

        db.prepare(`
          UPDATE session_intervals 
          SET duration_seconds = ?
          WHERE session_id = ? AND end_time IS NULL
        `).run(calc.totalPlayedSeconds, s.id);
      } catch (calcErr) {
        // ignore
      }
    }
  } catch (err) {
    // ignore
  }
}

function registerShutdownHandlers() {
  const saveOnExit = () => {
    try {
      const nowStr = getLocalDateTimeString();
      db.prepare(`
        UPDATE sessions SET updated_at = ? WHERE status IN ('running', 'paused', 'time_expired')
      `).run(nowStr);
      console.log('[RecoveryEngine] Saved exact state for all active sessions before shutdown.');
    } catch (e) {}
  };

  process.on('SIGINT', () => {
    saveOnExit();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    saveOnExit();
    process.exit(0);
  });
}

module.exports = {
  recoverActiveSessionsOnStartup,
  saveActiveSessionsHeartbeat,
  registerShutdownHandlers
};
