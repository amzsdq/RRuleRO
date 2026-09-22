'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { throughputEvaluator } = require('../src/g2/product');

const base = {
  window_ms: 600000,
  useful_ms: 480000,
  idle_ms: 60000,
  control_ms: 60000,
  completion_rate: 0.9,
  duplicate_rate: 0,
  recovery_success_rate: 1
};

test('adopts a candidate that raises useful time and lowers idle/control overhead without quality loss', () => {
  const result = throughputEvaluator.compareThroughput(base, {
    ...base,
    useful_ms: 510000,
    idle_ms: 45000,
    control_ms: 45000,
    completion_rate: 0.92
  });
  assert.equal(result.decision, 'ADOPT');
  assert.ok(result.deltas.usefulGain > 0);
  assert.ok(result.deltas.idleGain > 0);
});

test('rolls back any throughput gain that weakens a protected correctness/security/recovery outcome', () => {
  const result = throughputEvaluator.compareThroughput(base, {
    ...base,
    useful_ms: 540000,
    idle_ms: 30000,
    control_ms: 30000,
    correctness_regression: true
  });
  assert.equal(result.decision, 'ROLLBACK');
});

test('rejects useful-time gain when completion quality falls outside allowed budget', () => {
  const result = throughputEvaluator.compareThroughput(base, {
    ...base,
    useful_ms: 520000,
    idle_ms: 40000,
    control_ms: 40000,
    completion_rate: 0.8
  });
  assert.equal(result.decision, 'REJECT');
});

test('returns DO_NOTHING when a proposed process change produces no material external gain', () => {
  const result = throughputEvaluator.compareThroughput(base, { ...base });
  assert.equal(result.decision, 'DO_NOTHING');
});

test('returns REVISE for material throughput gain with a tolerated but unresolved quality tradeoff', () => {
  const result = throughputEvaluator.compareThroughput(base, {
    ...base,
    useful_ms: 510000,
    idle_ms: 30000,
    control_ms: 60000,
    completion_rate: 0.89
  }, { min_useful_gain: 0.02, max_completion_loss: 0.02 });
  assert.equal(result.decision, 'REVISE');
});

test('returns DO_NOTHING for sub-threshold throughput movement without external quality change', () => {
  const result = throughputEvaluator.compareThroughput(base, {
    ...base,
    useful_ms: 486000,
    idle_ms: 54000,
    completion_rate: 0.9
  }, { min_useful_gain: 0.02 });
  assert.equal(result.decision, 'DO_NOTHING');
});

test('invalid overlapping duration accounting fails closed', () => {
  assert.throws(() => throughputEvaluator.sample({
    window_ms: 100,
    useful_ms: 80,
    idle_ms: 30
  }), /durations exceed window/);
});
