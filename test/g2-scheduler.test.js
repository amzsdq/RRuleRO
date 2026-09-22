const test = require('node:test');
const assert = require('node:assert/strict');
const { continuation, fence, adapterContract } = require('../src/g2/scheduler');

const WAKE = '2026-01-01T00:00:00.000Z';

test('provisional rescue combines work target and safety margin', () => {
  const plan = continuation.planProvisionalArm({ reference_at: WAKE, generation: 4 });
  assert.equal(plan.kind, 'PROVISIONAL_RESCUE');
  assert.equal(plan.generation, 5);
  assert.equal(plan.due_at, '2026-01-01T00:13:00.000Z');
});

test('normal close creates completion-relative fast continuation', () => {
  const plan = continuation.planFastContinuation({
    closed_at: '2026-01-01T00:10:30.000Z',
    generation: 5
  });
  assert.equal(plan.generation, 6);
  assert.equal(plan.due_at, '2026-01-01T00:13:30.000Z');
  assert.equal(plan.verification_required, false);
  assert.equal(plan.verification_mode, 'UPDATE_RESULT');
  assert.equal(plan.lead_status, 'EXPERIMENTAL_BASELINE');
});

test('stale wake always recovers forward', () => {
  const result = fence.reconcileWake({
    observed_generation: 3,
    durable_generation: 5,
    observed_due_at: '2026-01-01T00:05:00.000Z',
    durable_due_at: '2026-01-01T00:20:00.000Z'
  });
  assert.equal(result.state, 'STALE_RECOVER_FORWARD');
  assert.equal(result.authoritative_generation, 5);
  assert.equal(result.allow_schedule_rollback, false);
});

test('future observed generation with stale durable state fails closed', () => {
  const result = fence.reconcileWake({
    observed_generation: 6,
    durable_generation: 5
  });
  assert.equal(result.state, 'DURABLE_STATE_BEHIND');
  assert.equal(result.allow_substantive_side_effects, false);
});

test('newest verified continuation wins', () => {
  const selected = fence.chooseNewestVerifiedContinuation([
    { generation: 2, due_at: '2026-01-01T00:20:00Z', verified: true },
    { generation: 3, due_at: '2026-01-01T00:10:00Z', verified: true },
    { generation: 9, due_at: '2026-01-01T00:30:00Z', verified: false }
  ]);
  assert.equal(selected.generation, 3);
});

test('scheduler adapter is explicit and replaceable', () => {
  const valid = adapterContract.validateSchedulerAdapter({
    read() {}, arm() {}, verify() {}, disable() {}
  });
  assert.deepEqual(valid, { ok: true, missing: [] });

  const invalid = adapterContract.validateSchedulerAdapter({ read() {} });
  assert.equal(invalid.ok, false);
  assert.deepEqual(invalid.missing, ['arm', 'verify', 'disable']);
});
