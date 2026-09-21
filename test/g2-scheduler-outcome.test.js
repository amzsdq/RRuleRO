'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { outcome } = require('../src/g2/scheduler');

const intent = { generation: 2, subject_sha: 'public-subject-a', effect_key: 'effect-public-2', due_at: '2026-01-01T00:20:00Z', safety_boundary_at: '2026-01-01T00:10:00Z' };

test('successful arm requires independent verified observation', () => {
  assert.equal(outcome.reconcileSchedulerOutcome({ intent, mutation: { ok: true }, observation: { verified: true, enabled: true, generation: 2, subject_sha: intent.subject_sha } }).outcome, outcome.OUTCOMES.ARMED_VERIFIED);
  assert.equal(outcome.reconcileSchedulerOutcome({ intent, mutation: { ok: true }, observation: {} }).outcome, outcome.OUTCOMES.VERIFY_PENDING_OR_UNAVAILABLE);
});

test('failed arm preserves compatible prior verified continuation', () => {
  const prior = { verified: true, enabled: true, generation: 1, subject_sha: intent.subject_sha, due_at: '2026-01-01T00:15:00Z' };
  assert.equal(outcome.reconcileSchedulerOutcome({ intent, mutation: { ok: false }, prior }).outcome, outcome.OUTCOMES.ARM_FAILED_PRIOR_SURVIVES);
});

test('failed arm without survivor requires recovery', () => {
  const result = outcome.reconcileSchedulerOutcome({ intent, mutation: { ok: false } });
  assert.equal(result.outcome, outcome.OUTCOMES.ARM_FAILED_NO_SURVIVOR);
  assert.equal(result.recovery_required, true);
  assert.equal(result.recovery.effect_key, intent.effect_key);
});

test('stale observation cannot roll generation backward', () => {
  assert.equal(outcome.reconcileSchedulerOutcome({ intent, mutation: { ok: true }, observation: { generation: 1, verified: true } }).outcome, outcome.OUTCOMES.STALE_OBSERVATION);
});

test('pending or unavailable verification never becomes pass', () => {
  assert.equal(outcome.reconcileSchedulerOutcome({ intent, mutation: { ok: true }, observation: { generation: 2, verification_state: 'UNAVAILABLE' } }).outcome, outcome.OUTCOMES.VERIFY_PENDING_OR_UNAVAILABLE);
});

test('same logical effect is replay/reconcile identity', () => {
  assert.equal(outcome.sameLogicalEffect(intent, { ...intent }), true);
  assert.equal(outcome.sameLogicalEffect(intent, { ...intent, generation: 3 }), false);
});

test('completion requires verified effects and explicit terminal authority', () => {
  const base = { delegation_terminal: true, effects: [{ verification_state: 'PASS' }], unresolved_recovery: false, terminal_authority: 'PROGRAM_COMPLETE' };
  assert.equal(outcome.completionAdmitted(base), true);
  assert.equal(outcome.completionAdmitted({ ...base, effects: [{ verification_state: 'PENDING' }] }), false);
  assert.equal(outcome.completionAdmitted({ ...base, unresolved_recovery: true }), false);
  assert.equal(outcome.completionAdmitted({ ...base, terminal_authority: '' }), false);
});
