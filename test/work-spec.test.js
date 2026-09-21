const test = require('node:test');
const assert = require('node:assert/strict');

const {
  PREFIX,
  buildWorkSpecRevision,
  nextWorkSpecRevision,
  serializeWorkSpec,
  parseWorkSpecComment,
  latestWorkSpecRevision,
  buildWorkSpecRef,
  validateWorkSpecRef,
  bindWorkAssignToSpec
} = require('../work-spec');
const { buildControlEnvelope, validateControlEnvelope } = require('../control-message');

function comment(record, id, login = 'amzsdq') {
  return { id, user: { login }, body: serializeWorkSpec(record) };
}

function spec(overrides = {}) {
  return buildWorkSpecRevision({
    root_job_id: 'WORK-ORDER-500',
    root_issue_number: 500,
    revision: 1,
    editor_role: 'FOREMAN',
    root_goal: 'Build one durable root capability.',
    scope: ['Implement canonical root spec revisions.'],
    non_goals: ['Do not create a parallel private plan.'],
    architectural_decisions: ['Reuse the controlling root issue as the durable anchor.'],
    constraints: ['Append-only revisions only.'],
    acceptance: ['Substantive WORK_ASSIGN references an exact spec revision.'],
    authority_boundary: { merge: 'FOREMAN', worker_self_escalation: false },
    ...overrides
  }, overrides.created_at || '2026-09-19T06:47:00.000Z');
}

test('work spec round-trips as append-only machine record', () => {
  const record = spec();
  const body = serializeWorkSpec(record);
  assert.match(body, new RegExp('^' + PREFIX));
  assert.deepEqual(parseWorkSpecComment(body), record);
  assert.equal(parseWorkSpecComment('ordinary comment'), null);
});

test('work spec revision increments while root identity remains immutable', () => {
  const first = spec();
  const second = nextWorkSpecRevision(first, {
    editor_role: 'DISPATCHER',
    constraints: [...first.constraints, 'New root-level constraint.']
  }, '2026-09-19T06:48:00.000Z');
  assert.equal(second.revision, 2);
  assert.equal(second.root_job_id, first.root_job_id);
  assert.equal(second.root_issue_number, first.root_issue_number);
  assert.equal(second.editor_role, 'DISPATCHER');
  assert.equal(second.constraints.length, 2);
});

test('latest trusted revision wins and untrusted higher revision is ignored', () => {
  const first = spec();
  const second = nextWorkSpecRevision(first, {
    constraints: [...first.constraints, 'Trusted revision two.']
  }, '2026-09-19T06:48:00.000Z');
  const attacker = { ...second, revision: 99, created_at: '2026-09-19T06:49:00.000Z' };
  const latest = latestWorkSpecRevision([
    comment(first, 10),
    comment(attacker, 11, 'attacker'),
    comment(second, 12)
  ], 'WORK-ORDER-500', { allowed_logins: ['amzsdq', 'github-actions[bot]'] });
  assert.equal(latest.record.revision, 2);
  assert.equal(latest.comment_id, 12);
});

test('work spec ref binds exact root issue revision and comment', () => {
  const record = spec();
  const ref = buildWorkSpecRef(record, 123456);
  assert.deepEqual(ref, {
    root_job_id: 'WORK-ORDER-500',
    root_issue_number: 500,
    revision: 1,
    comment_id: 123456
  });
  assert.deepEqual(validateWorkSpecRef(ref, 'WORK-ORDER-500'), ref);
  assert.throws(() => validateWorkSpecRef(ref, 'WORK-ORDER-OTHER'), /mismatch/);
});

test('substantive WORK_ASSIGN fails closed without work_spec_ref and passes with exact binding', () => {
  const base = buildControlEnvelope({
    source_section_id: 'FOREMAN',
    source_role: 'FOREMAN',
    target_section_id: 'WORKER-A',
    target_role: 'WORKER',
    message_type: 'WORK_ASSIGN',
    root_job_id: 'WORK-ORDER-500',
    logical_key: 'assign-1',
    milestone_id: 'M1',
    step_id: 'S1',
    control: { substantive_work: true, work_spec_contract: 'R_WORK_SPEC_V1' },
    content: {
      objective: 'Implement one bounded step.',
      acceptance: ['Tests pass.']
    }
  });
  assert.throws(() => validateControlEnvelope(base), /work_spec_ref/);

  const boundInput = bindWorkAssignToSpec(base, {
    root_job_id: 'WORK-ORDER-500',
    root_issue_number: 500,
    revision: 1,
    comment_id: 123456
  });
  assert.equal(validateControlEnvelope(boundInput), true);
  assert.equal(boundInput.content.work_spec_ref.revision, 1);
});

test('legacy unversioned WORK_ASSIGN remains compatible while new contract is fail-closed', () => {
  const legacy = buildControlEnvelope({
    source_section_id: 'FOREMAN',
    source_role: 'FOREMAN',
    target_section_id: 'WORKER-A',
    target_role: 'WORKER',
    message_type: 'WORK_ASSIGN',
    root_job_id: 'WORK-ORDER-500',
    logical_key: 'legacy-assign',
    control: { substantive_work: true },
    content: { objective: 'Legacy compatibility only.' }
  });
  assert.equal(validateControlEnvelope(legacy), true);
});

test('non-substantive control probe is not forced to carry a work spec', () => {
  const probe = buildControlEnvelope({
    source_section_id: 'FOREMAN',
    source_role: 'FOREMAN',
    target_section_id: 'WORKER-A',
    target_role: 'WORKER',
    message_type: 'WORK_ASSIGN',
    root_job_id: 'WORK-ORDER-500',
    logical_key: 'probe-1',
    control: { substantive_work: false },
    content: { objective: 'Transport-only probe.' }
  });
  assert.equal(validateControlEnvelope(probe), true);
});
