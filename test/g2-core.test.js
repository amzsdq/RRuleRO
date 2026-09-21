const test = require('node:test');
const assert = require('node:assert/strict');
const {
  jobState,
  lease,
  outbox,
  effectRecovery,
  completionVerification
} = require('../src/g2/core');

const NOW = Date.parse('2026-01-01T00:00:00Z');

test('job state distinguishes verified, ambiguous, retryable, and invalid outcomes', () => {
  assert.equal(jobState.classifyJobState({ effect_state: 'VERIFIED' }, NOW).state, 'AWAITING_WORK_ACK');
  assert.equal(jobState.classifyJobState({ effect_state: 'AMBIGUOUS' }, NOW).state, 'RECONCILE_REQUIRED');
  assert.equal(jobState.classifyJobState({ error_class: 'INVALID_INPUT' }, NOW).terminal, true);
  assert.equal(jobState.classifyJobState({ retryable: true, attempts: 1, max_attempts: 3 }, NOW).state, 'RETRY_WAIT');
});

test('lease prevents a second owner and permits reclaim after expiry', () => {
  const acquired = lease.makeLeaseRecord({
    event: 'ACQUIRE',
    workId: 'WORK-SYNTHETIC',
    leaseId: 'LEASE-A',
    ownerId: 'ACTOR-A',
    ttlMs: 1000,
    now: NOW
  });
  assert.equal(lease.canAcquire([acquired], 'WORK-SYNTHETIC', 'ACTOR-B', NOW + 500).ok, false);
  const reclaimed = lease.canAcquire([acquired], 'WORK-SYNTHETIC', 'ACTOR-B', NOW + 1500);
  assert.equal(reclaimed.ok, true);
  assert.equal(reclaimed.reclaimed, true);
});

test('outbox identity is stable and claims expire', () => {
  const intent = {
    root_job_id: 'ROOT-SYNTHETIC',
    objective_id: 'OBJECTIVE-A',
    wake_key: 'WAKE-A',
    destination_key: 'DESTINATION-A'
  };
  assert.equal(outbox.stableOutboxId(intent), outbox.stableOutboxId(intent));
  const item = outbox.itemRecord(intent, NOW);
  const claim = outbox.eventRecord(item.outbox_id, 'CLAIMED', {
    actor_id: 'ACTOR-A',
    claim_expires_at: new Date(NOW + 1000).toISOString()
  }, NOW);
  const current = outbox.aggregate([item, claim]).get(item.outbox_id);
  assert.equal(outbox.claimable(current, 'ACTOR-B', NOW + 500), false);
  assert.equal(outbox.claimable(current, 'ACTOR-B', NOW + 1500), true);
});

test('unknown external effects fail closed for automatic recovery', () => {
  const conflict = effectRecovery.conflictRecord({
    job_id: 'JOB-A',
    root_job_id: 'ROOT-A',
    effect_id: 'EFFECT-A',
    cause: 'MISMATCH',
    external_effect: 'UNKNOWN',
    authoritative: true
  }, NOW);
  assert.throws(() => effectRecovery.decisionRecord(conflict, {
    action: 'CORRECTIVE_EFFECT',
    authorized: true,
    repair_verified: true
  }, NOW + 1), /UNKNOWN external effect/);
});

test('verified recovery creates a new effect identity once', () => {
  const conflict = effectRecovery.conflictRecord({
    job_id: 'JOB-A',
    root_job_id: 'ROOT-A',
    effect_id: 'EFFECT-A',
    cause: 'MISMATCH',
    external_effect: 'YES',
    authoritative: true
  }, NOW);
  const decision = effectRecovery.decisionRecord(conflict, {
    action: 'CORRECTIVE_EFFECT',
    authorized: true,
    repair_verified: true
  }, NOW + 1);
  const first = effectRecovery.planRecovery(conflict, decision, { value: 'synthetic' }, [], NOW + 2);
  assert.equal(first.eligibility.ok, true);
  assert.notEqual(first.plan.effect_id, conflict.effect_id);
  const second = effectRecovery.planRecovery(conflict, decision, { value: 'synthetic' }, [first.plan], NOW + 3);
  assert.equal(second.eligibility.ok, false);
});

test('authoritative conflict dominates exact local evidence', () => {
  const local = { found: true, ok: true, status: 'OK' };
  const authoritative = {
    found: true,
    ok: false,
    status: 'IDENTITY_CONFLICT',
    authoritative: true
  };
  assert.deepEqual(completionVerification.classifyEvidence(local, authoritative), {
    state: 'CONFLICT',
    source: 'authoritative',
    evidence: authoritative
  });
});

test('authoritative verification is delayed for existing targets only', () => {
  assert.equal(completionVerification.shouldQueryAuthoritative({
    fast_path: false,
    target_kind: 'EXISTING',
    elapsed_ms: 1499
  }), false);
  assert.equal(completionVerification.shouldQueryAuthoritative({
    fast_path: false,
    target_kind: 'EXISTING',
    elapsed_ms: 1500
  }), true);
  assert.equal(completionVerification.shouldQueryAuthoritative({
    fast_path: false,
    target_kind: 'NEW',
    elapsed_ms: 9999
  }), false);
});
