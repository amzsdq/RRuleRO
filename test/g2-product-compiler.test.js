'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { plan, projectCompiler } = require('../src/g2/product');

test('active product plan compiles directly into canonical Foreman work items', () => {
  const p = plan.createPlan({
    plan_id: 'synthetic-project',
    goal: 'ship product runtime',
    steps: [
      { id: 'implement', description: 'implement feature', work_domain: 'code:product' },
      { id: 'verify', description: 'verify feature', dependencies: ['implement'], recovery_or_verification: true }
    ]
  });
  const items = projectCompiler.compileWorkItems({
    plan: p,
    objective_ref: 'issue:synthetic',
    subject_sha: 'synthetic-sha'
  });
  assert.equal(items.length, 2);
  assert.equal(items[0].state, 'QUEUED');
  assert.equal(items[0].objective_ref, 'issue:synthetic');
  assert.deepEqual(items[1].dependencies, ['synthetic-project:r1:implement']);
  assert.equal(items[0].verification_contract, 'unit+public-safety');
});

test('draft approval-gated plan cannot be compiled into runnable work', () => {
  const p = plan.createPlan({
    plan_id: 'synthetic-risk',
    goal: 'high impact change',
    approval_required: true,
    steps: [{ id: 'act', description: 'perform change' }]
  });
  assert.throws(() => projectCompiler.compileWorkItems({
    plan: p,
    objective_ref: 'issue:synthetic',
    subject_sha: 'synthetic-sha'
  }), /not executable/);
});

test('unknown dependency fails closed instead of silently dropping ordering', () => {
  const p = plan.createPlan({
    plan_id: 'synthetic-bad',
    goal: 'bad dependency',
    steps: [{ id: 'act', description: 'perform change', dependencies: ['missing'] }]
  });
  assert.throws(() => projectCompiler.compileWorkItems({
    plan: p,
    objective_ref: 'issue:synthetic',
    subject_sha: 'synthetic-sha'
  }), /unknown plan dependency/);
});
