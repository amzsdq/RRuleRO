'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { plan } = require('../src/g2/product');

function base(overrides = {}) {
  return {
    plan_id: 'synthetic-plan',
    goal: 'finish useful work',
    steps: [{ id: 'a', description: 'execute first useful unit' }],
    ...overrides
  };
}

test('ordinary plan activates immediately and does not create an approval idle gate', () => {
  const p = plan.createPlan(base());
  assert.equal(p.state, 'ACTIVE');
  assert.equal(p.approval_required, false);
});

test('genuine approval-required plan stays draft until approved', () => {
  const p = plan.createPlan(base({ approval_required: true }));
  assert.equal(p.state, 'DRAFT');
  assert.throws(() => plan.activatePlan(p), /explicit approval required/);
  assert.equal(plan.activatePlan(p, { approved: true }).state, 'ACTIVE');
});

test('evidence-driven revision is monotonic and executable without a new approval gate', () => {
  const p1 = plan.createPlan(base());
  const p2 = plan.revisePlan(p1, {
    reason: 'new evidence invalidated the old ordering',
    evidence_refs: ['synthetic:evidence'],
    steps: [{ id: 'b', description: 'execute revised useful unit' }]
  });
  assert.equal(p2.revision, 2);
  assert.equal(p2.state, 'REVISED');
  assert.equal(p2.supersedes_revision, 1);
  assert.equal(plan.continuePlan(p2).state, 'ACTIVE');
});

test('terminal plan cannot be silently revised', () => {
  const done = plan.completePlan(plan.createPlan(base()));
  assert.throws(() => plan.revisePlan(done, { reason: 'late change' }), /terminal plan/);
});
