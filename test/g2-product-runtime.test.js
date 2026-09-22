'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/g2/product');

test('ordinary work runs immediately without mandatory plan-preview wait', () => {
  const result = P.intake.compileIntent({ intent: 'implement a bounded feature' });
  assert.equal(result.mode, 'FAST');
  assert.equal(result.execution_gate, 'RUN_NOW');
  assert.equal(result.plan_preview, 'NONE');
  assert.equal(result.throughput_policy.mandatory_preview_wait, false);
});

test('planned work keeps preview informational and non-blocking', () => {
  const result = P.intake.compileIntent({ intent: 'implement a multi-stage runtime improvement', multi_stage: true, material_research_value: true });
  assert.equal(result.mode, 'PLANNED');
  assert.equal(result.execution_gate, 'RUN_NOW');
  assert.equal(result.plan_preview, 'INFORMATIONAL');
  assert.equal(result.research_required, true);
});

test('approval is reserved for genuine decision or risk gates', () => {
  const result = P.intake.compileIntent({ intent: 'perform irreversible external mutation', irreversible: true });
  assert.equal(result.mode, 'APPROVAL_REQUIRED');
  assert.equal(result.execution_gate, 'AWAIT_APPROVAL');
});

test('research is not unconditional', () => {
  assert.equal(P.intake.shouldResearch({ evolving_domain: true, material_research_value: false }), false);
  assert.equal(P.intake.shouldResearch({ current_info_required: true }), true);
});

test('blocked path continues through another safe runnable path', () => {
  const result = P.blocker.resolveBlocker({ blocked: true, alternate_paths: [
    { id: 'waiting-path', runnable: false }, { id: 'independent-useful-work', runnable: true, safe: true }
  ], user_action_possible: true });
  assert.equal(result.action, 'CONTINUE_ALTERNATE');
  assert.equal(result.may_end_turn, false);
  assert.equal(result.selected_alternate, 'independent-useful-work');
});

test('blocked path chooses highest net useful alternate instead of first runnable path', () => {
  const result = P.blocker.resolveBlocker({ blocked: true, alternate_paths: [
    { id: 'ceremony', runnable: true, safe: true, useful_value: 3, control_cost: 3 },
    { id: 'substantive', runnable: true, safe: true, useful_value: 8, control_cost: 1 },
    { id: 'unsafe-high-value', runnable: true, safe: false, useful_value: 100 }
  ] });
  assert.equal(result.action, 'CONTINUE_ALTERNATE');
  assert.equal(result.selected_alternate, 'substantive');
});

test('blocked alternate selection remains stable when throughput scores tie', () => {
  const result = P.blocker.resolveBlocker({ blocked: true, alternate_paths: [
    { id: 'first', runnable: true, safe: true, useful_value: 5, control_cost: 1 },
    { id: 'second', runnable: true, safe: true, useful_value: 6, control_cost: 2 }
  ] });
  assert.equal(result.selected_alternate, 'first');
});

test('blocked status is terminal for turn only after alternates are exhausted', () => {
  const result = P.blocker.resolveBlocker({ blocked: true, alternate_paths: [{ id: 'unsafe', runnable: true, safe: false }], user_action_possible: true });
  assert.equal(result.action, 'BLOCKED_USER_ACTION');
  assert.equal(result.may_end_turn, true);
});

test('turn reporting refuses fabricated useful time beyond elapsed runtime', () => {
  assert.throws(() => P.reporting.renderTurnReport({ start: '2026-01-01T00:00:00Z', end: '2026-01-01T00:01:00Z', worked_ms: 61000, status: 'CONTINUE' }), /must not exceed elapsed/);
});

test('turn reporting keeps concise machine-readable minimum fields', () => {
  const report = P.reporting.renderTurnReport({ start: '2026-01-01T00:00:00Z', end: '2026-01-01T00:10:30Z', worked_ms: 600000, status: 'CONTINUE', completed: 'product intake', next: 'blocker handling' });
  assert.match(report, /WORKED: 10m 0s/);
  assert.match(report, /STATUS: CONTINUE/);
  assert.match(report, /NEXT: blocker handling/);
});

test('recursive meta-work yields to substantive work unless it removes a runtime bottleneck', () => {
  const result = P.recursive.selectImprovement([
    { action: 'ADD', expected_benefit: 10, control_cost: 1, risk_cost: 0, measurable_outcome: 'more policy detail', meta_only: true },
    { action: 'SIMPLIFY', expected_benefit: 6, control_cost: 1, risk_cost: 0, measurable_outcome: 'lower dispatch latency', meta_only: true, removes_runtime_bottleneck: true }
  ], { substantive_work_runnable: true });
  assert.equal(result.action, 'SIMPLIFY');
  assert.equal(result.candidate.removes_runtime_bottleneck, true);
});

test('recursive improvement accepts DO_NOTHING when no change has positive external value', () => {
  const result = P.recursive.selectImprovement([{ action: 'ADD', expected_benefit: 1, control_cost: 2, risk_cost: 0, measurable_outcome: 'extra logs' }]);
  assert.equal(result.action, 'DO_NOTHING');
});
