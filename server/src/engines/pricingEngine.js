const db = require('../db/database');
const { parseLocalDateTime, getLocalDateTimeString } = require('../utils/dateUtils');

/**
 * Authoritative Pricing Engine for PlayStation Gaming Center
 * Calculates session cost on the backend based on:
 * - Device Group & Room overrides
 * - Single vs Multiplayer intervals
 * - Pause durations deducted
 * - Rounding rules (Per minute, 15m, 30m, hour)
 * - Minimum charge threshold
 * - Peak hours surcharge
 */

function getDeviceEffectiveRates(deviceId) {
  const query = `
    SELECT 
      d.id as device_id,
      d.name as device_name,
      d.group_id,
      d.room_id,
      g.default_single_price as group_single,
      g.default_multi_price as group_multi,
      r.single_price as room_single,
      r.multi_price as room_multi
    FROM devices d
    JOIN groups g ON d.group_id = g.id
    LEFT JOIN rooms r ON d.room_id = r.id
    WHERE d.id = ?
  `;
  const dev = db.prepare(query).get(deviceId);
  if (!dev) {
    throw new Error('Device not found');
  }

  // Room price overrides group price if set and > 0
  const singlePrice = (dev.room_single !== null && dev.room_single > 0) ? dev.room_single : dev.group_single;
  const multiPrice = (dev.room_multi !== null && dev.room_multi > 0) ? dev.room_multi : dev.group_multi;

  return {
    singlePrice: Number(singlePrice),
    multiPrice: Number(multiPrice),
    device: dev
  };
}

function getSystemSettings() {
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  return settings || {
    round_method: 'minute',
    min_charge_minutes: 15,
    peak_hours_enabled: 0,
    peak_start_time: '18:00',
    peak_end_time: '02:00',
    peak_surcharge_percent: 20
  };
}

function isPeakHour(dateObj, settings) {
  if (!settings.peak_hours_enabled) return false;
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const [startH, startM] = settings.peak_start_time.split(':').map(Number);
  const [endH, endM] = settings.peak_end_time.split(':').map(Number);
  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  if (startTotal <= endTotal) {
    return currentMinutes >= startTotal && currentMinutes < endTotal;
  } else {
    // Overnight peak period (e.g. 18:00 to 02:00)
    return currentMinutes >= startTotal || currentMinutes < endTotal;
  }
}

/**
 * Calculates gaming cost for a given duration in seconds and hourly rate
 */
function calculateIntervalCost(durationSeconds, hourlyRate, settings, startDate) {
  let minutes = Math.max(0, durationSeconds / 60);

  // Apply Minimum Charge
  if (settings.min_charge_minutes && minutes < settings.min_charge_minutes && minutes > 0) {
    minutes = settings.min_charge_minutes;
  }

  // Apply Rounding Rule
  let billedMinutes = minutes;
  switch (settings.round_method) {
    case '15m':
      billedMinutes = Math.ceil(minutes / 15) * 15;
      break;
    case '30m':
      billedMinutes = Math.ceil(minutes / 30) * 30;
      break;
    case 'hour':
      billedMinutes = Math.ceil(minutes / 60) * 60;
      break;
    case 'minute':
    default:
      billedMinutes = minutes;
      break;
  }

  let rate = hourlyRate;
  if (isPeakHour(startDate || new Date(), settings)) {
    rate += rate * (settings.peak_surcharge_percent / 100);
  }

  const cost = (billedMinutes / 60) * rate;
  return Math.round(cost * 100) / 100; // 2 decimal places
}

/**
 * Full recalculation of an active or completed session
 */
function calculateSessionTotal(sessionId, customEndTime = null) {
  if (!sessionId || sessionId === 'undefined') {
    throw new Error('الجلسة غير موجودة');
  }
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
  if (!session) throw new Error('الجلسة غير موجودة: ' + sessionId);

  const settings = getSystemSettings();
  const now = customEndTime ? parseLocalDateTime(customEndTime) : new Date();

  // 1. Fetch total pause seconds
  const pauses = db.prepare('SELECT * FROM session_pauses WHERE session_id = ?').all(sessionId);
  let totalPausedSeconds = 0;
  for (const p of pauses) {
    if (p.resume_time) {
      totalPausedSeconds += p.pause_duration_seconds;
    } else {
      // Currently paused
      const pauseStart = parseLocalDateTime(p.pause_start);
      const currentPauseDuration = Math.floor((now.getTime() - pauseStart.getTime()) / 1000);
      totalPausedSeconds += Math.max(0, currentPauseDuration);
    }
  }

  // 2. Fetch intervals (Single/Multi segments)
  const intervals = db.prepare('SELECT * FROM session_intervals WHERE session_id = ? ORDER BY start_time ASC').all(sessionId);

  let gamingCost = 0;
  let totalPlayedSeconds = 0;

  if (intervals.length > 0) {
    for (const inv of intervals) {
      const invStart = parseLocalDateTime(inv.start_time);
      const invEnd = inv.end_time ? parseLocalDateTime(inv.end_time) : now;
      let durationSec = Math.max(0, Math.floor((invEnd.getTime() - invStart.getTime()) / 1000));

      // Subtract pause if interval was active
      if (!inv.end_time && session.status === 'paused') {
        const lastPause = pauses.find(p => !p.resume_time);
        if (lastPause) {
          const pauseSec = Math.floor((now.getTime() - parseLocalDateTime(lastPause.pause_start).getTime()) / 1000);
          durationSec = Math.max(0, durationSec - pauseSec);
        }
      }

      totalPlayedSeconds += durationSec;
      const invCost = calculateIntervalCost(durationSec, inv.hourly_rate, settings, invStart);
      gamingCost += invCost;
    }
  } else {
    // Single continuous session
    const startTime = parseLocalDateTime(session.start_time);
    const endTime = session.end_time ? parseLocalDateTime(session.end_time) : now;
    let rawDurationSec = Math.max(0, Math.floor((endTime.getTime() - startTime.getTime()) / 1000));
    totalPlayedSeconds = Math.max(0, rawDurationSec - totalPausedSeconds);

    gamingCost = calculateIntervalCost(totalPlayedSeconds, session.base_hourly_rate, settings, startTime);
  }

  // 3. Fetch products added to session
  const orders = db.prepare('SELECT SUM(total_price) as total_products FROM session_orders WHERE session_id = ?').get(sessionId);
  const productsCost = Number(orders.total_products || 0);

  // 4. Calculate Final Grand Total
  const discount = Number(session.discount_amount || 0);
  const grandTotal = Math.max(0, Math.round((gamingCost + productsCost - discount) * 100) / 100);

  return {
    sessionId,
    status: session.status,
    totalPlayedSeconds,
    totalPausedSeconds,
    gamingCost: Math.round(gamingCost * 100) / 100,
    productsCost,
    discount,
    grandTotal,
    baseHourlyRate: session.base_hourly_rate
  };
}

module.exports = {
  getDeviceEffectiveRates,
  getSystemSettings,
  calculateIntervalCost,
  calculateSessionTotal
};
