const test = require('node:test');
const assert = require('node:assert/strict');
const { workEvidence, workerState, workerRuntime, experiment } = require('../src/g2/runtime');

const HOUR_START = '2026-01-01T00:00:00.000Z';
const HOUR_END = '2026-01-01T01:00:00.000Z';

test('work evidence calculates useful minutes per hour without counting control time', () => {
  const intervals = [
    workEvidence.interval({ category: 'USEFUL', started_at: HOUR_START, ended_at: '2026-01-01T00:52:00Z' }),
    workEvidence.interval({ category: 'CONTROL', started_at: '2026-01-01T00:52:00Z', ended_at: '2026-01-01T00:57:00Z' }),
    workEvidence.interval({ category: 'SCHEDULER_GAP', started_at: '2026-01-01T00:57:00Z', ended_at: HOUR_END })
  ];
  const summary = workEvidence.summarize(intervals, { started_at: HOUR_START, ended_at: HOUR_END });
  assert.equal(summary.useful_minutes_per_hour, 52);
  assert.equal(summary.totals_ms.CONTROL, 5 * 60 * 1000);
  assert.equal(workEvidence.targetAssessment(summary).status, 'IN_TARGET_BAND');
});

test('target is not applied when runnable backlog is insufficient', () => {
  const summary = workEvidence.summarize([], { started_at: HOUR_START, ended_at: HOUR_END });
  assert.equal(workEvidence.targetAssessment(summary, { sufficient_runnable_backlog: false }).status, 'NOT_APPLICABLE_BACKLOG_INSUFFICIENT');
});

test('worker state machine rejects unsafe transitions', () => {
  assert.equal(workerState.transition('IDLE', 'CLAIMING'), 'CLAIMING');
  assert.throws(() => workerState.transition('IDLE', 'COMPLETE'), /invalid worker transition/);
});

test('worker checkpoints are cold-resume oriented', () => {
  let worker = workerRuntime.newWorker({ worker_id: 'WORKER-SYNTHETIC-A', objective_id: 'OBJECTIVE-A' });
  worker = workerRuntime.evolve(worker, { next_state: 'CLAIMING' });
  worker = workerRuntime.evolve(worker, { next_state: 'RUNNING', useful_units_delta: 2 });
  worker = workerRuntime.evolve(worker, { next_state: 'CHECKPOINTING', checkpoint: true, checkpoint_ref: 'synthetic-ref' });
  const checkpoint = workerRuntime.resumableCheckpoint(worker, { next_action: 'continue unit 3', durable_refs: ['synthetic-ref'] }, 0);
  assert.equal(checkpoint.checkpoint_seq, 1);
  assert.equal(checkpoint.useful_units, 2);
  assert.equal(checkpoint.next_action, 'continue unit 3');
});

test('experiment definitions require competing variants and frozen metrics', () => {
  const exp = experiment.defineExperiment({
    experiment_id: 'EXP-SYNTHETIC-1',
    hypothesis: 'longer work envelope reduces control overhead without increasing recovery loss',
    variants: [
      { name: 'A', config: { target_work_minutes: 8 } },
      { name: 'B', config: { target_work_minutes: 10 } }
    ],
    safety_invariants: ['same logical actor', 'verified continuation'],
    metrics: ['useful_minutes_per_hour', 'continuation_gap_seconds'],
    promotion_rule: 'promote only after minimum observations and no safety regression',
    minimum_observations_per_variant: 3
  });
  assert.equal(exp.variants.length, 2);
  assert.deepEqual(exp.metrics, ['useful_minutes_per_hour', 'continuation_gap_seconds']);
});

test('variant comparison reports means without pretending significance', () => {
  const result = experiment.compareVariants([
    { variant: 'A', useful_minutes_per_hour: 49 },
    { variant: 'A', useful_minutes_per_hour: 51 },
    { variant: 'B', useful_minutes_per_hour: 53 },
    { variant: 'B', useful_minutes_per_hour: 54 }
  ], 'useful_minutes_per_hour');
  assert.equal(result.stats.A.mean, 50);
  assert.equal(result.stats.B.mean, 53.5);
  assert.equal(result.leader, 'B');
});
