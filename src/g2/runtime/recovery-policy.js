'use strict';

function integer(value, name, { min = 0 } = {}) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < min) throw new Error(`${name} must be an integer >= ${min}`);
  return n;
}

function recoveryDecision(input = {}) {
  const attempt = integer(input.attempt || 0, 'attempt');
  const max_attempts = integer(input.max_attempts == null ? 3 : input.max_attempts, 'max_attempts', { min: 1 });
  const base_delay_ms = integer(input.base_delay_ms == null ? 1000 : input.base_delay_ms, 'base_delay_ms', { min: 1 });
  const max_delay_ms = integer(input.max_delay_ms == null ? 60000 : input.max_delay_ms, 'max_delay_ms', { min: 1 });
  if (base_delay_ms > max_delay_ms) throw new Error('base_delay_ms must not exceed max_delay_ms');

  const retryable = input.retryable !== false;
  if (!retryable) return Object.freeze({ action: 'FAIL_CLOSED', reason: 'NON_RETRYABLE', attempt });
  if (attempt >= max_attempts) return Object.freeze({ action: 'FAIL_CLOSED', reason: 'RETRY_BUDGET_EXHAUSTED', attempt });

  const exponent = Math.min(attempt, 30);
  const delay_ms = Math.min(max_delay_ms, base_delay_ms * (2 ** exponent));
  return Object.freeze({ action: 'RETRY', reason: 'TRANSIENT_FAILURE', attempt: attempt + 1, delay_ms });
}

function idempotencyKey({ objective_id, work_id, effect } = {}) {
  const fields = [objective_id, work_id, effect].map((v) => String(v || '').trim());
  if (fields.some((v) => !v)) throw new Error('objective_id, work_id, and effect are required');
  return fields.join(':');
}

module.exports = { recoveryDecision, idempotencyKey };
