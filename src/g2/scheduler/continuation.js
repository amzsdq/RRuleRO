'use strict';

const DEFAULTS = Object.freeze({
  target_work_ms: 10 * 60 * 1000,
  provisional_safety_margin_ms: 3 * 60 * 1000,
  fast_continuation_delay_ms: 60 * 1000,
  expected_due_tolerance_ms: 4 * 60 * 1000
});

function finiteMs(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative finite number`);
  return n;
}

function iso(ms) {
  return new Date(ms).toISOString();
}

function nextGeneration(current = 0) {
  const n = Number(current);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('generation must be a non-negative integer');
  return n + 1;
}

function planProvisionalArm({
  reference_at,
  generation = 0,
  target_work_ms = DEFAULTS.target_work_ms,
  safety_margin_ms = DEFAULTS.provisional_safety_margin_ms
} = {}) {
  const reference = Date.parse(String(reference_at || ''));
  if (!Number.isFinite(reference)) throw new Error('reference_at must be a valid timestamp');
  const due = reference + finiteMs(target_work_ms, 'target_work_ms') + finiteMs(safety_margin_ms, 'safety_margin_ms');
  return Object.freeze({
    kind: 'PROVISIONAL_RESCUE',
    generation: nextGeneration(generation),
    due_at: iso(due),
    reference_at: iso(reference),
    verification_required: true
  });
}

function planFastContinuation({
  closed_at,
  generation = 0,
  delay_ms = DEFAULTS.fast_continuation_delay_ms
} = {}) {
  const closed = Date.parse(String(closed_at || ''));
  if (!Number.isFinite(closed)) throw new Error('closed_at must be a valid timestamp');
  const due = closed + finiteMs(delay_ms, 'delay_ms');
  return Object.freeze({
    kind: 'FAST_CONTINUATION',
    generation: nextGeneration(generation),
    due_at: iso(due),
    reference_at: iso(closed),
    verification_required: true
  });
}

function shouldExtendProvisional({
  now,
  provisional_due_at,
  minimum_remaining_ms
} = {}) {
  const nowMs = Date.parse(String(now || ''));
  const dueMs = Date.parse(String(provisional_due_at || ''));
  if (!Number.isFinite(nowMs) || !Number.isFinite(dueMs)) throw new Error('valid now and provisional_due_at required');
  const threshold = finiteMs(minimum_remaining_ms, 'minimum_remaining_ms');
  return dueMs - nowMs <= threshold;
}

module.exports = {
  DEFAULTS,
  nextGeneration,
  planProvisionalArm,
  planFastContinuation,
  shouldExtendProvisional
};
