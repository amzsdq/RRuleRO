'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { projectRuntime } = require('../src/g2/product');

test('ordinary multi-stage project begins runnable work without waiting for plan approval', () => {
  const project = projectRuntime.startProject({
    intent: 'build a multi-stage feature',
    plan_id: 'synthetic-product',
    steps: [
      { id: 'a', description: 'implement' },
      { id: 'b', description: 'verify', dependencies: ['a'] }
    ],
    multi_stage: true,
    objective_ref: 'issue:synthetic',
    subject_sha: 'synthetic-sha'
  });
  assert.equal(project.state, 'RUNNING');
  assert.equal(project.intake.mode, 'PLANNED');
  assert.equal(project.intake.plan_preview, 'INFORMATIONAL');
  assert.equal(project.work_items.length, 2);
});

test('high-impact project creates the only intended approval wait gate', () => {
  const project = projectRuntime.startProject({
    intent: 'make a high-impact external change',
    plan_id: 'synthetic-risk',
    steps: [{ id: 'act', description: 'perform change' }],
    high_impact: true,
    objective_ref: 'issue:synthetic',
    subject_sha: 'synthetic-sha'
  });
  assert.equal(project.state, 'AWAIT_APPROVAL');
  assert.equal(project.work_items.length, 0);

  const approved = projectRuntime.approveProject(project, {
    objective_ref: 'issue:synthetic',
    subject_sha: 'synthetic-sha'
  });
  assert.equal(approved.state, 'RUNNING');
  assert.equal(approved.work_items.length, 1);
});
