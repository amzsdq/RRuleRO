const test = require('node:test');
const assert = require('node:assert/strict');
const {
  conflictRecord,
  recoveryDecisionId,
  decisionRecord,
  recoveryEligibility,
  buildRecoveryDelivery,
  nextGenerationConflict
} = require('../conflict-recovery-policy');

const NOW = Date.parse('2026-01-01T00:00:00Z');

function conflict(overrides = {}) {
  return conflictRecord({
    job_id: 'JOB-SYNTHETIC',
    root_job_id: 'ROOT-SYNTHETIC',
    issue_number: 101,
    delivery_id: 'delivery-original',
    cause: 'CONTENT_MISMATCH',
    external_effect: 'YES',
    authoritative: true,
    evidence_ref: 'synthetic-evidence',
    ...overrides
  }, NOW);
}

function authorizedDecision(c, overrides = {}) {
  return decisionRecord(c, {
    recovery_generation: 1,
    action: 'CORRECTIVE_DELIVERY',
    authorized: true,
    repair_verified: true,
    authorized_by: 'synthetic-controller',
    verification_ref: 'synthetic-check',
    ...overrides
  }, NOW + 1000);
}

test('conflict records are terminal and burn the conflicted delivery identity', () => {
  const c = conflict();
  assert.equal(c.state, 'CONFLICTED');
  assert.equal(c.terminal, true);
  assert.equal(c.burned_identity, true);
  assert.equal(Object.isFrozen(c), true);
});

test('unknown external effect fails closed for automatic recovery', () => {
  const c = conflict({ external_effect: 'UNKNOWN' });
  assert.throws(() => authorizedDecision(c), /UNKNOWN external_effect/);
  const manual = decisionRecord(c, {
    action: 'MANUAL_REVIEW',
    authorized: false,
    repair_verified: false
  }, NOW + 1000);
  assert.equal(recoveryEligibility(c, manual, []).ok, false);
});

test('decision identity is deterministic and generation-scoped', () => {
  const c = conflict();
  assert.equal(recoveryDecisionId(c, 1), recoveryDecisionId(c, 1));
  assert.notEqual(recoveryDecisionId(c, 1), recoveryDecisionId(c, 2));
});

test('authorized recovery creates a fresh delivery identity and is single-use', () => {
  const c = conflict();
  const d = authorizedDecision(c);
  const planned = buildRecoveryDelivery(
    { mode: 'send', target: 'synthetic-target' },
    c,
    d,
    'corrected synthetic payload',
    [],
    NOW + 2000
  );
  assert.equal(planned.eligibility.ok, true);
  assert.equal(planned.command.job_id, c.job_id);
  assert.equal(planned.command.root_job_id, c.root_job_id);
  assert.equal(planned.command.recovery_of, c.delivery_id);
  assert.notEqual(planned.command.delivery_id, c.delivery_id);

  const duplicate = buildRecoveryDelivery(
    { mode: 'send', target: 'synthetic-target' },
    c,
    d,
    'corrected synthetic payload',
    [planned.record],
    NOW + 3000
  );
  assert.equal(duplicate.eligibility.ok, false);
  assert.equal(duplicate.eligibility.reason, 'RECOVERY_DELIVERY_ALREADY_EXISTS');
});

test('conflict in a recovery delivery requires a later generation', () => {
  const c1 = conflict();
  const d1 = authorizedDecision(c1);
  const r1 = buildRecoveryDelivery({ mode: 'send', target: 'synthetic-target' }, c1, d1, 'payload', [], NOW + 2000);
  const c2 = nextGenerationConflict(r1.record, {
    delivery_id: 'delivery-recovery-conflict',
    external_effect: 'YES',
    authoritative: true,
    evidence_ref: 'synthetic-evidence-2'
  }, NOW + 3000);
  const d2 = decisionRecord(c2, {
    recovery_generation: 2,
    action: 'CORRECTIVE_DELIVERY',
    authorized: true,
    repair_verified: true
  }, NOW + 4000);
  assert.notEqual(d1.decision_id, d2.decision_id);
  assert.equal(d2.recovery_generation, 2);
});
