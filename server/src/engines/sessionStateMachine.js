/**
 * PlayStation Session State Machine
 * Enforces strict transitions between session and device states
 */

const VALID_SESSION_TRANSITIONS = {
  // From: [Allowed To]
  'created': ['running'],
  'running': ['paused', 'time_expired', 'completed', 'cancelled'],
  'paused': ['running', 'completed', 'cancelled'],
  'time_expired': ['running', 'completed', 'cancelled'], // can be extended back to running!
  'completed': [], // terminal state
  'cancelled': []  // terminal state
};

function canTransitionSession(currentStatus, nextStatus) {
  const allowed = VALID_SESSION_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.includes(nextStatus);
}

function assertValidSessionTransition(currentStatus, nextStatus) {
  if (!canTransitionSession(currentStatus, nextStatus)) {
    throw new Error(`انتقال غير مسموح به في حالة الجلسة من "${currentStatus}" إلى "${nextStatus}"`);
  }
}

module.exports = {
  VALID_SESSION_TRANSITIONS,
  canTransitionSession,
  assertValidSessionTransition
};
