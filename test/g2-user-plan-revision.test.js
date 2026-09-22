'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { projectRuntime } = require('../src/g2/product');

test('user can revise an active plan and canonical work is regenerated at the new revision', () => {
  const project = projectRuntime.startProject({ intent: 'build feature', plan_id: 'editable', multi_stage: true, steps: [{ id: 'a', description: 'old step' }], objective_ref: '#30', subject_sha: 'head-a' });
  const revised = projectRuntime.reviseProjectFromUser(project, { reason: 'change scope', steps: [{ id: 'b', description: 'new step' }], objective_ref: '#30', subject_sha: 'head-b' });
  assert.equal(revised.state, 'RUNNING');
  assert.equal(revised.plan.revision, 2);
  assert.equal(revised.plan.steps[0].id, 'b');
  assert.match(revised.work_items[0].work_id, /:r2:b$/);
});

test('revising approval-required draft does not bypass approval gate', () => {
  const project = projectRuntime.startProject({ intent: 'high impact change', plan_id: 'approval-edit', high_impact: true, steps: [{ id: 'a', description: 'original' }], objective_ref: '#30', subject_sha: 'head-a' });
  const revised = projectRuntime.reviseProjectFromUser(project, { reason: 'safer user plan', steps: [{ id: 'safe', description: 'safer action' }] });
  assert.equal(revised.state, 'AWAIT_APPROVAL');
  assert.equal(revised.plan.state, 'DRAFT');
  assert.equal(revised.plan.revision, 2);
  assert.equal(revised.work_items.length, 0);
  const approved = projectRuntime.approveProject(revised, { objective_ref: '#30', subject_sha: 'head-b' });
  assert.equal(approved.state, 'RUNNING');
  assert.match(approved.work_items[0].work_id, /:r2:safe$/);
});
