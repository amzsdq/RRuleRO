const test = require('node:test');
const assert = require('node:assert/strict');
const { DisposableWorker, summarizeEvidence } = require('../src/g2/worker/runtime');
const { comparePolicies } = require('../src/g2/worker/experiment');

test('worker cold-starts from durable checkpoint and survives restore', () => {
  const w = new DisposableWorker({ workerId: 'worker-synthetic-1', taskId: 'task-synthetic-1', checkpoint: { cursor: 4 } });
  assert.equal(w.coldStart().state, 'READY');
  w.begin();
  w.record({ kind: 'useful', durationMs: 120000 });
  const saved = w.persistCheckpoint({ cursor: 5 });
  const restored = DisposableWorker.restore(saved);
  assert.equal(restored.state, 'CHECKPOINTED');
  assert.deepEqual(restored.checkpoint, { cursor: 5 });
  restored.begin();
  restored.complete();
  assert.equal(restored.state, 'COMPLETE');
});

test('evidence excludes control and scheduler time from useful work', () => {
  const s = summarizeEvidence([
    { kind: 'useful', durationMs: 50 },
    { kind: 'control', durationMs: 10 },
    { kind: 'scheduler', durationMs: 5 },
    { kind: 'lost', reason: 'queue_starvation', durationMs: 35 }
  ]);
  assert.equal(s.totalMs, 100);
  assert.equal(s.usefulCoverage, 0.5);
  assert.equal(s.lostByReason.queue_starvation, 35);
});

test('deterministic A/B harness can promote efficiency when safety is unchanged', () => {
  const result = comparePolicies(
    { name: 'A-short', envelopeMs: 5 * 60000, checkpointOverheadMs: 15000, continuationOverheadMs: 10000, continuationGapMs: 60000 },
    { name: 'B-long', envelopeMs: 12 * 60000, checkpointOverheadMs: 15000, continuationOverheadMs: 10000, continuationGapMs: 60000 },
    { usefulMs: 30 * 60000 }
  );
  assert.equal(result.verdict, 'PROMOTE_B');
  assert.ok(result.B.score.usefulCoverage > result.A.score.usefulCoverage);
  assert.ok(result.B.score.overheadMs < result.A.score.overheadMs);
  assert.ok(result.B.score.schedulerGapMs < result.A.score.schedulerGapMs);
});

test('A/B harness refuses promotion when longer envelope increases recovery exposure', () => {
  const result = comparePolicies(
    { name: 'A-short', envelopeMs: 8 * 60000, durableCheckpointIntervalMs: 2 * 60000, checkpointOverheadMs: 15000, continuationOverheadMs: 10000, continuationGapMs: 60000, recoveryOverheadMs: 30000 },
    { name: 'B-long', envelopeMs: 10 * 60000, durableCheckpointIntervalMs: 10 * 60000, checkpointOverheadMs: 15000, continuationOverheadMs: 10000, continuationGapMs: 60000, recoveryOverheadMs: 30000 },
    { usefulMs: 30 * 60000, interruptions: [{ envelopeIndex: 1, afterUsefulMs: 9 * 60000 }] }
  );
  assert.equal(result.verdict, 'INCONCLUSIVE');
  assert.ok(result.B.score.recoveryLossMs > result.A.score.recoveryLossMs);
  assert.match(result.promotionCriterion, /recovery regression/);
});
