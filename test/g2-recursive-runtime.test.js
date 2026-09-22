'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/g2/product');

const candidate = { action: 'MODIFY', expected_benefit: 5, control_cost: 1, risk_cost: 0, measurable_outcome: 'useful time ratio' };
const baseline = { window_ms: 1000, useful_ms: 500, idle_ms: 300, control_ms: 200, completion_rate: 1, recovery_success_rate: 1 };

test('recursive runtime keeps candidate experimental before fixed evaluation', () => {
  const x = P.recursiveRuntime.startExperiment([candidate], { stable_ref: 'main@a', experimental_ref: 'candidate@b' });
  assert.equal(x.state, 'EXPERIMENTAL'); assert.equal(x.stable_ref, 'main@a');
});

test('positive measured outcome promotes experimental ref', () => {
  const x = P.recursiveRuntime.startExperiment([candidate], { stable_ref: 'main@a', experimental_ref: 'candidate@b' });
  const result = P.recursiveRuntime.evaluateExperiment(x, baseline, { ...baseline, useful_ms: 600, idle_ms: 200 });
  assert.equal(result.state, 'PROMOTE'); assert.equal(result.promoted_ref, 'candidate@b');
});

test('protected regression forces rollback to stable ref', () => {
  const x = P.recursiveRuntime.startExperiment([candidate], { stable_ref: 'main@a', experimental_ref: 'candidate@b' });
  const result = P.recursiveRuntime.evaluateExperiment(x, baseline, { ...baseline, correctness_regression: true });
  assert.equal(result.state, 'ROLLBACK'); assert.equal(result.promoted_ref, 'main@a'); assert.equal(result.rollback_ref, 'main@a');
});

test('non-positive candidate does not create experimental work', () => {
  const result = P.recursiveRuntime.startExperiment([{ ...candidate, expected_benefit: 1, control_cost: 2 }], { stable_ref: 'main@a' });
  assert.equal(result.state, 'NO_CHANGE');
});
