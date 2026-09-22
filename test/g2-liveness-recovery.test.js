'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RECOVERY_ACTIONS, assessLiveness, recoveryPlan } = require('../src/g2/runtime/liveness-recovery');
const { createGithubDurableStateAdapter } = require('../src/g2/adapters/github-durable-state');
const { createDurableForemanQueue } = require('../src/g2/foreman/durable-queue');

const claim = overrides => ({ work_id: 'work-1', worker_id: 'worker-1', expires_at: '2026-09-22T04:10:00.000Z', ...overrides });
const checkpoint = overrides => ({ type: 'g2-worker-checkpoint', version: 1, recorded_at: '2026-09-22T04:00:00.000Z', next_action: 'continue', ...overrides });

function memoryTransport() { const files = new Map(); let seq = 0; return { async readText({ path }) { const x = files.get(path); return x ? { content: x.content, version: x.version } : null; }, async writeText({ path, content, expected_version }) { const x = files.get(path); if (x && expected_version !== x.version) throw new Error('CAS'); if (!x && expected_version) throw new Error('CAS'); const version = `v${++seq}`; files.set(path, { content, version }); return { version }; } }; }
function workItem() { return { work_id:'work-1', objective_ref:'obj-1', state:'QUEUED', generation:1, subject_sha:'sha-1', work_domain:'recovery', conflict_domains:[], effect_domain:'recovery', dependencies:[], satisfied_dependencies:[], verification_contract:'test', intended_output:'recovered', priority:1, order:1, downstream_count:0, recovery_or_verification:true }; }

test('expired lease is reclaimable and requeued', () => {
  const assessment = assessLiveness({ claim: claim(), now: Date.parse('2026-09-22T04:11:00.000Z') });
  assert.equal(assessment.action, RECOVERY_ACTIONS.RECLAIM_EXPIRED);
  assert.deepEqual(recoveryPlan({ assessment }), { release_claim: true, requeue: true, resume_checkpoint: false, work_id: 'work-1' });
});

test('fresh lease and checkpoint are healthy', () => {
  const assessment = assessLiveness({ claim: claim(), checkpoint: checkpoint({ recorded_at: '2026-09-22T04:04:00.000Z' }), now: Date.parse('2026-09-22T04:05:00.000Z'), checkpoint_stale_ms: 120000 });
  assert.equal(assessment.action, RECOVERY_ACTIONS.HEALTHY);
});

test('stale checkpoint under an active lease requests checkpoint resume', () => {
  const cp = checkpoint(); const assessment = assessLiveness({ claim: claim(), checkpoint: cp, now: Date.parse('2026-09-22T04:06:00.000Z'), checkpoint_stale_ms: 300000 });
  assert.equal(assessment.action, RECOVERY_ACTIONS.RESUME_CHECKPOINT); assert.equal(recoveryPlan({ assessment, checkpoint: cp }).resume_checkpoint, true);
});

test('active lease without checkpoint is not falsely reclaimed', () => { assert.equal(assessLiveness({ claim: claim(), now: Date.parse('2026-09-22T04:05:00.000Z') }).action, RECOVERY_ACTIONS.HEALTHY); });

test('invalid timestamps fail closed', () => { assert.throws(() => assessLiveness({ claim: claim({ expires_at: 'bad' }) }), /ISO timestamp/); assert.throws(() => assessLiveness({ claim: claim(), checkpoint: checkpoint({ recorded_at: 'bad' }) }), /ISO timestamp/); });

test('durable queue reclaims an expired claim and makes work claimable again', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const queue = createDurableForemanQueue({ durable_state: durable, queue_id: 'q1', subject_sha: 'sha-1' });
  await queue.enqueue(workItem());
  const first = await queue.claimNext({ worker_id: 'dead-worker', now: 1000, lease_ms: 1000 });
  assert.equal(first.claimed.work_id, 'work-1');
  const recovered = await queue.reclaimExpired({ now: 2001 });
  assert.deepEqual(recovered.reclaimed, ['work-1']);
  const second = await queue.claimNext({ worker_id: 'replacement-worker', now: 2002, lease_ms: 1000 });
  assert.equal(second.claimed.work_id, 'work-1');
  assert.equal(second.claim.worker_id, 'replacement-worker');
});
