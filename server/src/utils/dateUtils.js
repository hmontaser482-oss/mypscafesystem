/**
 * Date and Time Utilities for PlayStation Lounge Manager
 * Ensures all stored and calculated dates are 100% in local timezone (e.g. Cairo/Egypt UTC+3)
 * to avoid the classic 3-hour difference bug.
 */

function getLocalDateTimeString(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function parseLocalDateTime(str) {
  if (!str) return new Date();
  if (str instanceof Date) return str;
  // Standard format 'YYYY-MM-DD HH:mm:ss' is parsed in local timezone by new Date()
  return new Date(str);
}

module.exports = {
  getLocalDateTimeString,
  parseLocalDateTime
};
