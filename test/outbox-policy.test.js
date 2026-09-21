const test = require('node:test');
const assert = require('node:assert/strict');
const {
  stableOutboxId,
  itemRecord,
  eventRecord,
  aggregate,
  claimable,
  sameAuthoritativePayload,
  outcomeState
} = require('../outbox-policy');

const NOW = Date.parse('2026-01-01T00:00:00Z');

function intent(overrides = {}) {
  return {
    root_job_id: 'ROOT-SYNTHETIC',
    milestone_id: 'M1',
    wake_key: 'WAKE-A',
    relay_issue_number: 101,
    ref: 'main',
    ...overrides
  };
}

test('stable outbox identity is deterministic for the same authoritative intent', () => {
  assert.equal(stableOutboxId(intent()), stableOutboxId(intent()));
  assert.notEqual(stableOutboxId(intent()), stableOutboxId(intent({ wake_key: 'WAKE-B' })));
});

test('item plus event comments aggregate into current state', () => {
  const item = itemRecord(intent(), NOW);
  const event = eventRecord(item.outbox_id, 'CLAIMED', {
    run_id: 'RUN-A',
    claim_expires_at: new Date(NOW + 60000).toISOString()
  }, NOW + 1000);
  const map = aggregate([{ body: JSON.stringify(item) }, { body: JSON.stringify(event) }]);
  const current = map.get(item.outbox_id);
  assert.equal(current.state, 'CLAIMED');
  assert.equal(current.events.length, 1);
});

test('claim is reusable by same run and reclaimable after expiry', () => {
  const item = itemRecord(intent(), NOW);
  const event = eventRecord(item.outbox_id, 'CLAIMED', {
    run_id: 'RUN-A',
    claim_expires_at: new Date(NOW + 1000).toISOString()
  }, NOW);
  const current = aggregate([{ body: JSON.stringify(item) }, { body: JSON.stringify(event) }]).get(item.outbox_id);
  assert.equal(claimable(current, 'RUN-A', NOW + 500), true);
  assert.equal(claimable(current, 'RUN-B', NOW + 500), false);
  assert.equal(claimable(current, 'RUN-B', NOW + 1500), true);
});

test('authoritative payload equality covers identity-bearing fields', () => {
  const a = intent();
  assert.equal(sameAuthoritativePayload(a, { ...a }), true);
  assert.equal(sameAuthoritativePayload(a, { ...a, relay_issue_number: 102 }), false);
});

test('job states map to bounded outbox outcomes', () => {
  assert.equal(outcomeState('AWAITING_WORK_ACK'), 'DELIVERED');
  assert.equal(outcomeState('RECONCILE_REQUIRED'), 'RECONCILE_REQUIRED');
  assert.equal(outcomeState('RETRY_WAIT'), 'PENDING');
  assert.equal(outcomeState('OTHER'), '');
});
