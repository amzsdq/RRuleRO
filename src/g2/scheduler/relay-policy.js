'use strict';

const DEFAULT_RELAY_POLICY = Object.freeze({
  same_automation_only: true,
  recurring_rrule: 'FREQ=HOURLY',
  normal_scheduler_mutations: 1,
  lead_ms: 3 * 60 * 1000,
  lead_status: 'EXPERIMENTAL_BASELINE',
  normal_readback_required: false,
  restore: 'TAIL_FIRST',
  evidence: 'APPEND_ONLY',
  verbosity: 'EXCEPTION_FIRST'
});

function parseTimestamp(value, name) {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) throw new Error(name + ' must be a valid timestamp');
  return ms;
}

function compactZonedDate(ms, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date(ms));
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}${map.month}${map.day}T${map.hour}${map.minute}${map.second}`;
}

function planFinalRecurringWake({
  now,
  automation_id,
  timezone = 'UTC',
  lead_ms = DEFAULT_RELAY_POLICY.lead_ms,
  rrule = DEFAULT_RELAY_POLICY.recurring_rrule
} = {}) {
  const id = String(automation_id || '').trim();
  if (!id) throw new Error('automation_id is required');
  const current = parseTimestamp(now, 'now');
  const lead = Number(lead_ms);
  if (!Number.isFinite(lead) || lead < 0) throw new Error('lead_ms must be non-negative');
  const due = current + lead;
  const dueAt = new Date(due).toISOString();
  const tz = String(timezone || 'UTC').trim() || 'UTC';

  return Object.freeze({
    automation_id: id,
    due_at: dueAt,
    lead_ms: lead,
    lead_status: lead === DEFAULT_RELAY_POLICY.lead_ms ? 'EXPERIMENTAL_BASELINE' : 'OVERRIDE',
    rrule,
    is_enabled: true,
    timing_mode: 'exact_schedule',
    scheduler_mutations_expected: 1,
    schedule: [
      'BEGIN:VEVENT',
      'DTSTART;TZID=' + tz + ':' + compactZonedDate(due, tz),
      'RRULE:' + rrule,
      'END:VEVENT'
    ].join('\n')
  });
}

function assessUpdateResult(result = {}, intent = {}) {
  const schedule = String(result.schedule || '');
  const sameId = String(result.id || result.automation_id || '') === String(intent.automation_id || '');
  const enabled = result.is_enabled === true;
  const recurrence = schedule.includes('RRULE:' + String(intent.rrule || DEFAULT_RELAY_POLICY.recurring_rrule));
  const expectedDtstart = String(intent.schedule || '').split('\n').find((x) => x.startsWith('DTSTART'));
  const dtstart = expectedDtstart ? schedule.includes(expectedDtstart) : false;

  const ok = sameId && enabled && recurrence && dtstart;
  return Object.freeze({
    ok,
    next_write_ok: result.update_ok !== false,
    next_state_ok: ok,
    separate_readback_required: !ok,
    mismatch: Object.freeze({
      automation_id: !sameId,
      enabled: !enabled,
      recurrence: !recurrence,
      dtstart: !dtstart
    })
  });
}

function wakeEvidence({ invocation_occurred = true, next_update = null } = {}) {
  return Object.freeze({
    prev_wake_ok: invocation_occurred === true,
    next_write_ok: next_update ? next_update.next_write_ok === true : null,
    next_state_ok: next_update ? next_update.next_state_ok === true : null,
    next_wake_ok: null
  });
}

function restorePlan({ tail_sufficient = false, boundary = false, rollback = false, promotion = false, ambiguous = false } = {}) {
  const broad = boundary || rollback || promotion || ambiguous || !tail_sufficient;
  return Object.freeze({
    read_tail_first: true,
    read_broad_state: broad,
    reason: broad ? 'EXCEPTION_OR_INSUFFICIENT_TAIL' : 'TAIL_SUFFICIENT'
  });
}

function logPlan({ clean_success = false, anomaly = false, recovery = false, rollback = false, boundary = false } = {}) {
  const detailed = anomaly || recovery || rollback || boundary || !clean_success;
  return Object.freeze({
    mode: detailed ? 'DETAILED_EXCEPTION' : 'COMPACT_SUCCESS',
    include_start_end: detailed,
    include_duplicate_field: detailed,
    include_state_field: detailed,
    include_wake_field: detailed
  });
}

module.exports = {
  DEFAULT_RELAY_POLICY,
  planFinalRecurringWake,
  assessUpdateResult,
  wakeEvidence,
  restorePlan,
  logPlan
};
