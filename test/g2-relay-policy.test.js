'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const relay = require('../src/g2/scheduler/relay-policy');

test('normal relay uses same recurring automation and one +3m final mutation', () => {
  const plan = relay.planFinalRecurringWake({
    now: '2026-09-22T12:00:00Z',
    automation_id: 'synthetic-auto',
    timezone: 'UTC'
  });
  assert.equal(plan.automation_id, 'synthetic-auto');
  assert.equal(plan.lead_ms, 180000);
  assert.equal(plan.lead_status, 'EXPERIMENTAL_BASELINE');
  assert.equal(plan.scheduler_mutations_expected, 1);
  assert.match(plan.schedule, /DTSTART;TZID=UTC:20260922T120300/);
  assert.match(plan.schedule, /RRULE:FREQ=HOURLY/);
});

test('TZID DTSTART uses the declared local timezone rather than UTC wall clock', () => {
  const plan = relay.planFinalRecurringWake({
    now: '2026-09-22T12:00:00Z',
    automation_id: 'synthetic-auto',
    timezone: 'Asia/Seoul'
  });
  assert.match(plan.schedule, /DTSTART;TZID=Asia\/Seoul:20260922T210300/);
});

test('clean update result removes normal readback requirement', () => {
  const intent = relay.planFinalRecurringWake({
    now: '2026-09-22T12:00:00Z',
    automation_id: 'synthetic-auto',
    timezone: 'UTC'
  });
  const result = relay.assessUpdateResult({
    id: 'synthetic-auto',
    schedule: intent.schedule,
    is_enabled: true,
    update_ok: true
  }, intent);
  assert.equal(result.ok, true);
  assert.equal(result.next_write_ok, true);
  assert.equal(result.next_state_ok, true);
  assert.equal(result.separate_readback_required, false);
});

test('schedule mismatch escalates to exception readback instead of pretending success', () => {
  const intent = relay.planFinalRecurringWake({
    now: '2026-09-22T12:00:00Z',
    automation_id: 'synthetic-auto'
  });
  const result = relay.assessUpdateResult({
    id: 'synthetic-auto',
    schedule: 'BEGIN:VEVENT\nDTSTART:20260922T120300\nEND:VEVENT',
    is_enabled: true
  }, intent);
  assert.equal(result.ok, false);
  assert.equal(result.separate_readback_required, true);
  assert.equal(result.mismatch.recurrence, true);
});

test('wake evidence separates previous wake from future next wake', () => {
  const evidence = relay.wakeEvidence({
    invocation_occurred: true,
    next_update: { next_write_ok: true, next_state_ok: true }
  });
  assert.equal(evidence.prev_wake_ok, true);
  assert.equal(evidence.next_write_ok, true);
  assert.equal(evidence.next_state_ok, true);
  assert.equal(evidence.next_wake_ok, null);
});

test('tail-first restore reads broad state only when needed', () => {
  assert.deepEqual(relay.restorePlan({ tail_sufficient: true }), {
    read_tail_first: true,
    read_broad_state: false,
    reason: 'TAIL_SUFFICIENT'
  });
  assert.equal(relay.restorePlan({ tail_sufficient: true, rollback: true }).read_broad_state, true);
  assert.equal(relay.restorePlan({ tail_sufficient: false }).read_broad_state, true);
});

test('clean success is compact and exception path is explicit', () => {
  assert.equal(relay.logPlan({ clean_success: true }).mode, 'COMPACT_SUCCESS');
  assert.equal(relay.logPlan({ clean_success: true }).include_start_end, false);
  assert.equal(relay.logPlan({ clean_success: true, anomaly: true }).mode, 'DETAILED_EXCEPTION');
});
