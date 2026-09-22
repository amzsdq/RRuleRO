'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const P = require('../src/g2/product');
test('active project replans from new evidence without corrupting generation and keeps working through local blocker', () => {
  const project = P.projectRuntime.startProject({ intent: 'multi-stage work', plan_id: 'replan', multi_stage: true, objective_ref: '#30', subject_sha: 'a', steps: [{ id: 'a', description: 'path A' }], evidence: [] });
  const revised = P.projectRuntime.reviseProjectFromEvidence(project, { evidence: [{ id: 'new', source: 'verified observation', claim: 'path B required' }], reason: 'new verified constraint', steps: [{ id: 'b', description: 'path B' }, { id: 'verify', description: 'verify B', dependencies: ['b'] }], objective_ref: '#30', subject_sha: 'b' });
  assert.equal(revised.plan.revision, 2); assert.equal(revised.work_items[0].generation, 2); assert.equal(revised.work_items.length, 2);
  const localBlock = P.blocker.resolveBlocker({ blocked: true, alternate_paths: [{ id: 'verify-independent', runnable: true, safe: true, useful_value: 5 }] });
  assert.equal(localBlock.action, 'CONTINUE_ALTERNATE'); assert.equal(localBlock.may_end_turn, false);
});
test('terminal blocker becomes actionable only after safe alternatives are exhausted and carries resume point', () => {
  const block = P.blocker.resolveBlocker({ blocked: true, alternate_paths: [{ id: 'unsafe', runnable: true, safe: false }], user_action_possible: true });
  const report = P.humanInterface.blockerReport({ action: block.action, reason: 'required source missing', completed: ['independent verification'], required_user_input: 'provide source', resume_from: 'compare source to verified result' });
  assert.equal(report.user_action_required, true); assert.match(report.message, /User action: provide source/); assert.match(report.message, /Resume: compare source/);
});
