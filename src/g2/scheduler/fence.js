'use strict';

function parseTime(value) {
  const n = Date.parse(String(value || ''));
  return Number.isFinite(n) ? n : null;
}

function reconcileWake({
  observed_generation,
  durable_generation,
  observed_due_at,
  durable_due_at,
  tolerance_ms = 4 * 60 * 1000
} = {}) {
  const observedGeneration = Number(observed_generation);
  const durableGeneration = Number(durable_generation);

  if (!Number.isSafeInteger(observedGeneration) || observedGeneration < 0) {
    throw new Error('observed_generation must be a non-negative integer');
  }
  if (!Number.isSafeInteger(durableGeneration) || durableGeneration < 0) {
    throw new Error('durable_generation must be a non-negative integer');
  }

  if (observedGeneration < durableGeneration) {
    return Object.freeze({
      state: 'STALE_RECOVER_FORWARD',
      authoritative_generation: durableGeneration,
      authoritative_due_at: durable_due_at || '',
      allow_schedule_rollback: false,
      allow_authority_rollback: false
    });
  }

  if (observedGeneration > durableGeneration) {
    return Object.freeze({
      state: 'DURABLE_STATE_BEHIND',
      authoritative_generation: null,
      authoritative_due_at: '',
      allow_substantive_side_effects: false
    });
  }

  const observedDue = parseTime(observed_due_at);
  const durableDue = parseTime(durable_due_at);
  if (observedDue != null && durableDue != null && Math.abs(observedDue - durableDue) > Number(tolerance_ms)) {
    return Object.freeze({
      state: 'DUE_MISMATCH_RECONCILE',
      authoritative_generation: durableGeneration,
      authoritative_due_at: durable_due_at,
      allow_schedule_rollback: false
    });
  }

  return Object.freeze({
    state: 'VALID',
    authoritative_generation: durableGeneration,
    authoritative_due_at: durable_due_at || observed_due_at || ''
  });
}

function chooseNewestVerifiedContinuation(candidates = []) {
  const verified = candidates.filter(candidate =>
    candidate &&
    candidate.verified === true &&
    Number.isSafeInteger(Number(candidate.generation)) &&
    Number(candidate.generation) >= 0
  );
  if (!verified.length) return null;
  return verified.slice().sort((a,b) => {
    const generationDelta = Number(b.generation) - Number(a.generation);
    if (generationDelta !== 0) return generationDelta;
    return (Date.parse(b.due_at || 0) || 0) - (Date.parse(a.due_at || 0) || 0);
  })[0];
}

module.exports = { reconcileWake, chooseNewestVerifiedContinuation };
