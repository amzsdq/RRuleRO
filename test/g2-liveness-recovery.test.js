'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RECOVERY_ACTIONS, assessLiveness, recoveryPlan } = require('../src/g2/runtime/liveness-recovery');

const claim = overrides => ({ work_id: 'work-1', worker_id: 'worker-1', expires_at: '2026-09-22T04:10:00.000Z', ...overrides });
const checkpoint = overrides => ({ checkpoint_at: '2026-09-22T04:00:00.000Z', next_action: 'continue', ...overrides });

test('expired lease is reclaimable and requeued', () => {
  const assessment = assessLiveness({ claim: claim(), now: Date.parse('2026-09-22T04:11:00.000Z') });
  assert.equal(assessment.action, RECOVERY_ACTIONS.RECLAIM_EXPIRED);
  assert.deepEqual(recoveryPlan({ assessment }), { release_claim: true, requeue: true, resume_checkpoint: false, work_id: 'work-1' });
});

test('fresh lease and checkpoint are healthy', () => {
  const assessment = assessLiveness({ claim: claim(), checkpoint: checkpoint({ checkpoint_at: '2026-09-22T04:04:00.000Z' }), now: Date.parse('2026-09-22T04:05:00.000Z'), checkpoint_stale_ms: 120000 });
  assert.equal(assessment.action, RECOVERY_ACTIONS.HEALTHY);
});

test('stale checkpoint under an active lease requests checkpoint resume', () => {
  const cp = checkpoint();
  const assessment = assessLiveness({ claim: claim(), checkpoint: cp, now: Date.parse('2026-09-22T04:06:00.000Z'), checkpoint_stale_ms: 300000 });
  assert.equal(assessment.action, RECOVERY_ACTIONS.RESUME_CHECKPOINT);
  assert.equal(recoveryPlan({ assessment, checkpoint: cp }).resume_checkpoint, true);
});

test('active lease without checkpoint is not falsely reclaimed', () => {
  const assessment = assessLiveness({ claim: claim(), now: Date.parse('2026-09-22T04:05:00.000Z') });
  assert.equal(assessment.action, RECOVERY_ACTIONS.HEALTHY);
});

test('invalid timestamps fail closed', () => {
  assert.throws(() => assessLiveness({ claim: claim({ expires_at: 'bad' }) }), /ISO timestamp/);
});
