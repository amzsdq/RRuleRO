'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { product } = require('../src/g2');

const candidate = { action: 'MODIFY', expected_benefit: 3, control_cost: 1, risk_cost: 0, removes_runtime_bottleneck: true, measurable_outcome: 'useful ratio' };
const baseline = { window_ms: 1000, useful_ms: 500, idle_ms: 300, control_ms: 100, blocked_ms: 100, completion_rate: 1, duplicate_rate: 0, recovery_success_rate: 1 };
const improved = { window_ms: 1000, useful_ms: 700, idle_ms: 100, control_ms: 100, blocked_ms: 100, completion_rate: 1, duplicate_rate: 0, recovery_success_rate: 1 };

function hooks(overrides = {}) {
  return {
    observe: async () => ({ bottleneck: 'idle' }),
    generateCandidates: async () => [candidate],
    implement: async () => ({ stable_ref: 'stable-a', experimental_ref: 'candidate-b' }),
    measure: async () => ({ baseline, candidate: improved }),
    applyDecision: async ({ state }) => ({ verified: true, active_ref: state === 'PROMOTE' ? 'candidate-b' : 'stable-a' }),
    ...overrides
  };
}

test('applied recursive cycle promotes only with verified matching active ref', async () => {
  const result = await product.recursiveRuntime.runAppliedImprovementCycle(hooks());
  assert.equal(result.state, 'PROMOTE');
  assert.equal(result.application.verified, true);
  assert.equal(result.application.active_ref, 'candidate-b');
});

test('applied recursive cycle fails closed on unverified side effect', async () => {
  await assert.rejects(() => product.recursiveRuntime.runAppliedImprovementCycle(hooks({ applyDecision: async () => ({ verified: false, active_ref: 'candidate-b' }) })), /independently verified/);
});
