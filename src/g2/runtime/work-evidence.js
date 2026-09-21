'use strict';

const CATEGORIES = Object.freeze([
  'USEFUL',
  'CONTROL',
  'VERIFICATION_WAIT',
  'DEPENDENCY_WAIT',
  'EXTERNAL_BLOCK',
  'RECOVERY',
  'SCHEDULER_GAP',
  'QUEUE_STARVATION',
  'SYSTEM_IDLE'
]);

function parseMs(value, name) {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) throw new Error(`${name} must be a valid timestamp`);
  return ms;
}

function interval({ category, started_at, ended_at, evidence_ref = '', detail = '' } = {}) {
  const normalized = String(category || '').toUpperCase();
  if (!CATEGORIES.includes(normalized)) throw new Error('unsupported work-evidence category');
  const start = parseMs(started_at, 'started_at');
  const end = parseMs(ended_at, 'ended_at');
  if (end < start) throw new Error('ended_at must not precede started_at');
  return Object.freeze({
    type: 'g2-work-evidence',
    version: 1,
    category: normalized,
    started_at: new Date(start).toISOString(),
    ended_at: new Date(end).toISOString(),
    duration_ms: end - start,
    evidence_ref: String(evidence_ref || ''),
    detail: String(detail || '').slice(0, 500)
  });
}

function summarize(intervals = [], window = {}) {
  const windowStart = parseMs(window.started_at, 'window.started_at');
  const windowEnd = parseMs(window.ended_at, 'window.ended_at');
  if (windowEnd <= windowStart) throw new Error('window must have positive duration');

  const totals = Object.fromEntries(CATEGORIES.map(category => [category, 0]));
  let covered = 0;

  for (const item of intervals) {
    if (!item || !CATEGORIES.includes(item.category)) continue;
    const start = Math.max(windowStart, parseMs(item.started_at, 'interval.started_at'));
    const end = Math.min(windowEnd, parseMs(item.ended_at, 'interval.ended_at'));
    if (end <= start) continue;
    const duration = end - start;
    totals[item.category] += duration;
    covered += duration;
  }

  const windowMs = windowEnd - windowStart;
  const usefulMs = totals.USEFUL;
  return Object.freeze({
    window_ms: windowMs,
    categorized_ms: covered,
    uncategorized_ms: Math.max(0, windowMs - covered),
    useful_ms: usefulMs,
    useful_ratio: usefulMs / windowMs,
    useful_minutes_per_hour: usefulMs / windowMs * 60,
    totals_ms: Object.freeze(totals)
  });
}

function targetAssessment(summary, {
  min_useful_minutes_per_hour = 50,
  max_useful_minutes_per_hour = 55,
  sufficient_runnable_backlog = true
} = {}) {
  if (!summary || !Number.isFinite(summary.useful_minutes_per_hour)) {
    throw new Error('valid summary required');
  }
  if (!sufficient_runnable_backlog) {
    return Object.freeze({ status: 'NOT_APPLICABLE_BACKLOG_INSUFFICIENT' });
  }
  const value = summary.useful_minutes_per_hour;
  if (value < min_useful_minutes_per_hour) {
    return Object.freeze({ status: 'BELOW_TARGET', useful_minutes_per_hour: value });
  }
  if (value > max_useful_minutes_per_hour) {
    return Object.freeze({ status: 'ABOVE_TARGET_BAND', useful_minutes_per_hour: value });
  }
  return Object.freeze({ status: 'IN_TARGET_BAND', useful_minutes_per_hour: value });
}

module.exports = { CATEGORIES, interval, summarize, targetAssessment };
