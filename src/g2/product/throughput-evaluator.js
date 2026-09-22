'use strict';

const DECISIONS = Object.freeze({
  ADOPT: 'ADOPT',
  REVISE: 'REVISE',
  REJECT: 'REJECT',
  ROLLBACK: 'ROLLBACK',
  DO_NOTHING: 'DO_NOTHING'
});

function metric(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number`);
  return n;
}

function rate(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || n > 1) throw new Error(`${name} must be between 0 and 1`);
  return n;
}

function sample(input = {}) {
  const window_ms = metric(input.window_ms, 'window_ms');
  if (window_ms <= 0) throw new Error('window_ms must be positive');
  const useful_ms = metric(input.useful_ms, 'useful_ms');
  const idle_ms = metric(input.idle_ms || 0, 'idle_ms');
  const control_ms = metric(input.control_ms || 0, 'control_ms');
  const blocked_ms = metric(input.blocked_ms || 0, 'blocked_ms');
  if (useful_ms + idle_ms + control_ms + blocked_ms > window_ms) {
    throw new Error('sample durations exceed window');
  }

  return Object.freeze({
    window_ms,
    useful_ms,
    idle_ms,
    control_ms,
    blocked_ms,
    completion_rate: rate(input.completion_rate == null ? 1 : input.completion_rate, 'completion_rate'),
    duplicate_rate: rate(input.duplicate_rate || 0, 'duplicate_rate'),
    recovery_success_rate: rate(input.recovery_success_rate == null ? 1 : input.recovery_success_rate, 'recovery_success_rate'),
    correctness_regression: input.correctness_regression === true,
    security_regression: input.security_regression === true,
    recoverability_regression: input.recoverability_regression === true
  });
}

function normalized(s) {
  return Object.freeze({
    useful_ratio: s.useful_ms / s.window_ms,
    idle_ratio: s.idle_ms / s.window_ms,
    control_ratio: s.control_ms / s.window_ms,
    blocked_ratio: s.blocked_ms / s.window_ms,
    completion_rate: s.completion_rate,
    duplicate_rate: s.duplicate_rate,
    recovery_success_rate: s.recovery_success_rate
  });
}

function compareThroughput(baselineInput, candidateInput, options = {}) {
  const baseline = sample(baselineInput);
  const candidate = sample(candidateInput);
  const b = normalized(baseline);
  const c = normalized(candidate);

  if (candidate.correctness_regression || candidate.security_regression || candidate.recoverability_regression) {
    return Object.freeze({
      decision: DECISIONS.ROLLBACK,
      reason: 'PROTECTED_OUTCOME_REGRESSION',
      baseline: b,
      candidate: c
    });
  }

  const minUsefulGain = Number.isFinite(Number(options.min_useful_gain))
    ? Number(options.min_useful_gain) : 0.01;
  const maxCompletionLoss = Number.isFinite(Number(options.max_completion_loss))
    ? Number(options.max_completion_loss) : 0;
  const maxDuplicateIncrease = Number.isFinite(Number(options.max_duplicate_increase))
    ? Number(options.max_duplicate_increase) : 0;
  const maxRecoveryLoss = Number.isFinite(Number(options.max_recovery_loss))
    ? Number(options.max_recovery_loss) : 0;

  const usefulGain = c.useful_ratio - b.useful_ratio;
  const idleGain = b.idle_ratio - c.idle_ratio;
  const controlGain = b.control_ratio - c.control_ratio;
  const blockedGain = b.blocked_ratio - c.blocked_ratio;
  const completionDelta = c.completion_rate - b.completion_rate;
  const duplicateDelta = c.duplicate_rate - b.duplicate_rate;
  const recoveryDelta = c.recovery_success_rate - b.recovery_success_rate;

  if (
    completionDelta < -maxCompletionLoss ||
    duplicateDelta > maxDuplicateIncrease ||
    recoveryDelta < -maxRecoveryLoss
  ) {
    return Object.freeze({
      decision: DECISIONS.REJECT,
      reason: 'QUALITY_OR_RECOVERY_COST_EXCEEDS_BUDGET',
      deltas: Object.freeze({ usefulGain, idleGain, controlGain, blockedGain, completionDelta, duplicateDelta, recoveryDelta }),
      baseline: b,
      candidate: c
    });
  }

  const throughputImproved =
    usefulGain >= minUsefulGain ||
    (usefulGain >= 0 && (
      idleGain >= minUsefulGain ||
      controlGain >= minUsefulGain ||
      blockedGain >= minUsefulGain
    ));

  if (throughputImproved && completionDelta >= 0 && duplicateDelta <= 0 && recoveryDelta >= 0) {
    return Object.freeze({
      decision: DECISIONS.ADOPT,
      reason: 'USEFUL_TIME_OR_OVERHEAD_IMPROVED_WITHOUT_PROTECTED_COST',
      deltas: Object.freeze({ usefulGain, idleGain, controlGain, blockedGain, completionDelta, duplicateDelta, recoveryDelta }),
      baseline: b,
      candidate: c
    });
  }

  const materiallyDifferent =
    Math.abs(usefulGain) >= minUsefulGain ||
    Math.abs(idleGain) >= minUsefulGain ||
    Math.abs(controlGain) >= minUsefulGain ||
    Math.abs(blockedGain) >= minUsefulGain ||
    completionDelta !== 0 ||
    duplicateDelta !== 0 ||
    recoveryDelta !== 0;

  if (!materiallyDifferent) {
    return Object.freeze({
      decision: DECISIONS.DO_NOTHING,
      reason: 'NO_MATERIAL_EXTERNAL_GAIN',
      deltas: Object.freeze({ usefulGain, idleGain, controlGain, blockedGain, completionDelta, duplicateDelta, recoveryDelta }),
      baseline: b,
      candidate: c
    });
  }

  return Object.freeze({
    decision: DECISIONS.REVISE,
    reason: 'MIXED_OR_INSUFFICIENT_EVIDENCE',
    deltas: Object.freeze({ usefulGain, idleGain, controlGain, blockedGain, completionDelta, duplicateDelta, recoveryDelta }),
    baseline: b,
    candidate: c
  });
}

module.exports = { DECISIONS, sample, compareThroughput };
