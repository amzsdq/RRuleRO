const { test } = require('node:test');
const assert = require('node:assert/strict');
const { classifyJobState, applyJobState, stateRecord } = require('../durable-job-state');
const { persistAndReport } = require('../result-policy');

test('verified delivery closes transport issue and awaits work ack', () => {
  const s = classifyJobState({ status: 'SENT_VERIFIED' }, 0);
  assert.deepEqual(s, {
    job_state: 'AWAITING_WORK_ACK',
    issue_action: 'close',
    next_attempt_at: ''
  });
});

test('retryable pre-submit failure survives as RETRY_WAIT', () => {
  const now = Date.parse('2026-09-16T05:00:00Z');
  const s = classifyJobState({
    status: 'FAILED_FINAL',
    error_code: 'SEND_BUTTON_NOT_READY',
    retryable_at_end: true,
    retry_delay_ms: 30_000
  }, now);
  assert.equal(s.job_state, 'RETRY_WAIT');
  assert.equal(s.issue_action, 'keep_open');
  assert.equal(s.next_attempt_at, '2026-09-16T05:00:30.000Z');
});

test('ambiguous post-submit result survives for reconciliation and never schedules blind retry', () => {
  const s = classifyJobState({
    status: 'FAILED_FINAL',
    error_code: 'DELIVERY_UNCONFIRMED',
    retryable_at_end: false
  }, 0);
  assert.equal(s.job_state, 'RECONCILE_REQUIRED');
  assert.equal(s.issue_action, 'keep_open');
  assert.equal(s.next_attempt_at, '');
});

test('non-retryable environmental failure remains open for repair rather than disappearing', () => {
  const s = classifyJobState({
    status: 'FAILED_FINAL',
    error_code: 'AUTH_EXPIRED',
    retryable_at_end: false
  }, 0);
  assert.equal(s.job_state, 'REPAIR_REQUIRED');
  assert.equal(s.issue_action, 'keep_open');
});

test('invalid command is terminal and may close', () => {
  const s = classifyJobState({
    status: 'FAILED_FINAL',
    error_code: 'FATAL_SETUP_ERROR',
    error: 'Issue body must be valid JSON.'
  }, 0);
  assert.equal(s.job_state, 'TERMINAL_INVALID');
  assert.equal(s.issue_action, 'close');
});

test('persistAndReport only closes states classified as close', async () => {
  const writes = [];
  const comments = [];
  let closes = 0;
  const result = {
    status: 'FAILED_FINAL',
    error_code: 'TARGET_NOT_REACHED',
    retryable_at_end: true,
    retry_delay_ms: 1000,
    job_id: 'J1',
    root_job_id: 'J1',
    issue_number: 7
  };
  await persistAndReport(
    result,
    r => writes.push(JSON.parse(JSON.stringify(r))),
    async r => comments.push(JSON.parse(JSON.stringify(r))),
    async () => { closes += 1; },
    0
  );
  assert.equal(result.job_state, 'RETRY_WAIT');
  assert.equal(result.issue_action, 'keep_open');
  assert.equal(closes, 0);
  assert.equal(writes.length, 1);
  assert.equal(comments.length, 1);
});

test('persistAndReport closes verified delivery', async () => {
  let closes = 0;
  const result = { status: 'SENT_VERIFIED', job_id: 'J2', issue_number: 8 };
  await persistAndReport(result, () => {}, async () => {}, async () => { closes += 1; }, 0);
  assert.equal(result.job_state, 'AWAITING_WORK_ACK');
  assert.equal(closes, 1);
});

test('stateRecord preserves stable job identity and terminal exhaustion fields', () => {
  const result = applyJobState({
    status: 'FAILED_FINAL',
    error_code: 'ATTEMPT_EXCEPTION',
    retryable_at_end: true,
    retry_delay_ms: 5000,
    job_id: 'JOB-X',
    root_job_id: 'ROOT-X',
    run_id: '123',
    issue_number: 44,
    delivery_id: 'DELIVERY-X',
    milestone_id: 'M1',
    attempts: 3,
    max_attempts: 3
  }, 0);
  const rec = stateRecord(result);
  assert.equal(rec.type, 'relay-job-state');
  assert.equal(rec.job_id, 'JOB-X');
  assert.equal(rec.root_job_id, 'ROOT-X');
  assert.equal(rec.delivery_id, 'DELIVERY-X');
  assert.equal(rec.job_state, 'RETRY_EXHAUSTED');
  assert.equal(rec.issue_action, 'close');
  assert.equal(rec.next_attempt_at, '');
  assert.equal(rec.milestone_id, 'M1');
});


test('pre-submit durable issue closure is terminal cancellation and never reopens', () => {
  const s = classifyJobState({
    status: 'FAILED_FINAL',
    error_code: 'DURABLE_ISSUE_CLOSED',
    retryable_at_end: false
  }, 0);
  assert.deepEqual(s, {
    job_state: 'CANCELLED',
    issue_action: 'close',
    next_attempt_at: ''
  });
});
