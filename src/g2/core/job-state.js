'use strict';

const STATES = Object.freeze({
  AWAITING_WORK_ACK: 'AWAITING_WORK_ACK',
  CANCELLED: 'CANCELLED',
  TERMINAL_INVALID: 'TERMINAL_INVALID',
  RECONCILE_REQUIRED: 'RECONCILE_REQUIRED',
  RETRY_WAIT: 'RETRY_WAIT',
  RETRY_EXHAUSTED: 'RETRY_EXHAUSTED',
  REPAIR_REQUIRED: 'REPAIR_REQUIRED'
});

function nonNegativeInt(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

function retryBudgetExhausted(observation = {}) {
  const attempts = nonNegativeInt(observation.attempts);
  const maxAttempts = nonNegativeInt(observation.max_attempts);
  return maxAttempts > 0 && attempts >= maxAttempts;
}

function classifyJobState(observation = {}, now = Date.now()) {
  const effect = String(observation.effect_state || '').toUpperCase();
  const errorClass = String(observation.error_class || '').toUpperCase();

  if (effect === 'VERIFIED') {
    return { state: STATES.AWAITING_WORK_ACK, terminal: false, next_attempt_at: '' };
  }
  if (effect === 'CANCELLED') {
    return { state: STATES.CANCELLED, terminal: true, next_attempt_at: '' };
  }
  if (errorClass === 'INVALID_INPUT') {
    return { state: STATES.TERMINAL_INVALID, terminal: true, next_attempt_at: '' };
  }
  if (effect === 'AMBIGUOUS' || errorClass === 'EFFECT_AMBIGUOUS') {
    return { state: STATES.RECONCILE_REQUIRED, terminal: false, next_attempt_at: '' };
  }

  if (observation.retryable === true) {
    if (retryBudgetExhausted(observation)) {
      return { state: STATES.RETRY_EXHAUSTED, terminal: true, next_attempt_at: '' };
    }
    const delay = nonNegativeInt(observation.retry_delay_ms, 60_000);
    return {
      state: STATES.RETRY_WAIT,
      terminal: false,
      next_attempt_at: new Date(now + delay).toISOString()
    };
  }

  return { state: STATES.REPAIR_REQUIRED, terminal: false, next_attempt_at: '' };
}

module.exports = { STATES, nonNegativeInt, retryBudgetExhausted, classifyJobState };
