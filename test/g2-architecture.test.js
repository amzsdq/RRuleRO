const test = require('node:test');
const assert = require('node:assert/strict');
const {
  LAYERS,
  RULE_CLASSES,
  WORKER_UTILIZATION_TARGET,
  FOREMAN_PRIMARY_METRICS
} = require('../src/g2/architecture');

test('G2 exposes distinct worker and foreman layers', () => {
  assert.equal(LAYERS.includes('worker'), true);
  assert.equal(LAYERS.includes('foreman'), true);
});

test('rule lifecycle permits retirement instead of permanent mechanism lock-in', () => {
  assert.deepEqual(RULE_CLASSES, [
    'INVARIANT',
    'CURRENT_DEFAULT',
    'COMPATIBILITY',
    'RETIRED'
  ]);
});

test('worker utilization target is useful-work based and bounded', () => {
  assert.equal(WORKER_UTILIZATION_TARGET.useful_minutes_per_hour_min, 50);
  assert.equal(WORKER_UTILIZATION_TARGET.useful_minutes_per_hour_max, 55);
  assert.equal(WORKER_UTILIZATION_TARGET.excludes_control_overhead, true);
  assert.equal(WORKER_UTILIZATION_TARGET.excludes_padding, true);
});

test('foreman optimizes the worker system rather than its own busy-time', () => {
  assert.equal(FOREMAN_PRIMARY_METRICS.includes('aggregate_worker_useful_time'), true);
  assert.equal(FOREMAN_PRIMARY_METRICS.includes('dispatch_latency'), true);
});
