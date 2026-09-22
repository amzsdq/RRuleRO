'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/g2/product');

const base = {
  intent: 'plan implementation against current upstream behavior',
  plan_id: 'research-plan',
  multi_stage: true,
  current_info_required: true,
  objective_ref: '#30',
  subject_sha: 'abc123',
  steps: [{ id: 'implement', description: 'implement verified behavior' }]
};

test('research-required project refuses to compile without evidence', () => {
  assert.throws(() => P.projectRuntime.startProject(base), /needs evidence before planning/);
});

test('research evidence feeds an immediately runnable planned project', () => {
  const project = P.projectRuntime.startProject({
    ...base,
    evidence: [{ id: 'official-1', source: 'upstream docs', claim: 'current behavior is X', authority: 'OFFICIAL' }]
  });
  assert.equal(project.state, 'RUNNING');
  assert.deepEqual(project.plan.evidence_refs, ['official-1']);
  assert.equal(project.evidence_summary.primary_count, 1);
  assert.equal(project.work_items.length, 1);
});

test('new evidence revises plan and recompiles work at a new generation', () => {
  const project = P.projectRuntime.startProject({
    ...base,
    evidence: [{ id: 'official-1', source: 'upstream docs', claim: 'current behavior is X', authority: 'OFFICIAL' }]
  });
  const revised = P.projectRuntime.reviseProjectFromEvidence(project, {
    evidence: [{ id: 'issue-2', source: 'upstream issue', claim: 'X requires compatibility fallback' }],
    reason: 'compatibility evidence',
    steps: [{ id: 'implement', description: 'implement X with fallback' }],
    objective_ref: '#30',
    subject_sha: 'def456'
  });
  assert.equal(revised.plan.revision, 2);
  assert.equal(revised.plan.state, 'ACTIVE');
  assert.deepEqual(revised.plan.evidence_refs, ['official-1', 'issue-2']);
  assert.equal(revised.work_items[0].generation, 2);
  assert.equal(revised.evidence_summary.count, 2);
});

test('evidence revision cannot bypass an approval-required project gate', () => {
  const project = P.projectRuntime.startProject({
    ...base,
    irreversible: true,
    evidence: [{ id: 'risk-1', source: 'official policy', claim: 'operation is irreversible', authority: 'OFFICIAL' }]
  });
  assert.equal(project.state, 'AWAIT_APPROVAL');
  assert.throws(() => P.projectRuntime.reviseProjectFromEvidence(project, {
    evidence: [{ id: 'risk-2', source: 'official policy', claim: 'risk remains' }],
    objective_ref: '#30',
    subject_sha: 'def456'
  }), /cannot be revised while awaiting approval/);
});
