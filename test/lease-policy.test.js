const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stableJobId } = require('../result-policy');
const { parseLeaseComment, leaseStatus, canAcquire, makeLeaseRecord } = require('../lease-policy');

function comment(record, id, createdAt) {
  return { id, created_at: createdAt || record.recorded_at, body: JSON.stringify(record) };
}

const T0 = Date.parse('2026-09-16T06:00:00Z');
const TTL = 8 * 60_000;

function record(event, owner, lease, now, previous = null) {
  return makeLeaseRecord({
    event,
    jobId: 'JOB-1',
    leaseId: lease,
    ownerRunId: owner,
    issueNumber: 107,
    ttlMs: TTL,
    now,
    previous
  });
}

test('issue-backed fallback job identity is stable across workflow runs', () => {
  assert.equal(stableJobId({}, 107, 'run-a'), 'GH-ISSUE-107');
  assert.equal(stableJobId({}, 107, 'run-b'), 'GH-ISSUE-107');
  assert.equal(stableJobId({ job_id: 'EXPLICIT' }, 107, 'run-b'), 'EXPLICIT');
  assert.notEqual(stableJobId({}, null, 'run-a'), stableJobId({}, null, 'run-b'));
});

test('unrelated comments are ignored and active lease blocks another run', () => {
  const acquired = record('acquired', 'run-a', 'lease-a', T0);
  const comments = [{ id: 1, body: 'human note', created_at: new Date(T0 - 1000).toISOString() }, comment(acquired, 2)];
  assert.equal(parseLeaseComment(comments[0].body), null);
  const status = leaseStatus(comments, 'JOB-1', T0 + 1000);
  assert.equal(status.active, true);
  const denied = canAcquire(comments, 'JOB-1', 'run-b', T0 + 1000);
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, 'LEASE_HELD');
  assert.equal(denied.previous.owner_run_id, 'run-a');
});

test('heartbeat extends the same lease expiry', () => {
  const acquired = record('acquired', 'run-a', 'lease-a', T0);
  const heartbeat = record('heartbeat', 'run-a', 'lease-a', T0 + 2 * 60_000);
  const comments = [comment(acquired, 1), comment(heartbeat, 2)];
  const status = leaseStatus(comments, 'JOB-1', T0 + 9 * 60_000);
  assert.equal(status.active, true);
  assert.equal(status.lease.event, 'heartbeat');
  assert.equal(status.lease.lease_expires_at, new Date(T0 + 10 * 60_000).toISOString());
});

test('expired lease can be reclaimed and records previous owner', () => {
  const acquired = record('acquired', 'run-a', 'lease-a', T0);
  const comments = [comment(acquired, 1)];
  const decision = canAcquire(comments, 'JOB-1', 'run-b', T0 + TTL + 1);
  assert.equal(decision.ok, true);
  assert.equal(decision.reclaimed, true);
  const reclaimed = record('acquired', 'run-b', 'lease-b', T0 + TTL + 1, decision.previous);
  assert.equal(reclaimed.reclaimed_from_run_id, 'run-a');
  assert.equal(reclaimed.reclaimed_from_lease_id, 'lease-a');
});

test('release makes the job immediately acquirable by another run', () => {
  const acquired = record('acquired', 'run-a', 'lease-a', T0);
  const released = record('released', 'run-a', 'lease-a', T0 + 1000);
  const comments = [comment(acquired, 1), comment(released, 2)];
  const status = leaseStatus(comments, 'JOB-1', T0 + 2000);
  assert.equal(status.active, false);
  assert.equal(status.expired, false);
  assert.equal(canAcquire(comments, 'JOB-1', 'run-b', T0 + 2000).ok, true);
});

test('same workflow run may resume its own still-active lease', () => {
  const acquired = record('acquired', 'run-a', 'lease-a', T0);
  const decision = canAcquire([comment(acquired, 1)], 'JOB-1', 'run-a', T0 + 1000);
  assert.equal(decision.ok, true);
  assert.equal(decision.resumed, true);
  assert.equal(decision.reclaimed, false);
});
