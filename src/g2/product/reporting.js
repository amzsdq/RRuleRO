'use strict';

function timestamp(value, name) {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) throw new Error(`${name} must be an ISO timestamp`);
  return ms;
}

function duration(ms) {
  const total = Math.max(0, Math.round(Number(ms) / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return minutes ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function renderTurnReport(input = {}) {
  const start = timestamp(input.start, 'start');
  const end = timestamp(input.end, 'end');
  if (end < start) throw new Error('end must not precede start');

  const elapsed = end - start;
  const worked = Number(input.worked_ms);
  if (!Number.isFinite(worked) || worked < 0) throw new Error('worked_ms must be a non-negative number');
  if (worked > elapsed) throw new Error('worked_ms must not exceed elapsed runtime');

  const status = String(input.status || '').trim();
  if (!status) throw new Error('status is required');

  const completed = String(input.completed || '').trim();
  const next = String(input.next || '').trim();
  const blocker = String(input.blocker || '').trim();

  const lines = [
    `START: ${new Date(start).toISOString()}`,
    `END: ${new Date(end).toISOString()}`,
    `WORKED: ${duration(worked)}`,
    `STATUS: ${status}`
  ];
  if (completed) lines.push(`COMPLETED: ${completed}`);
  if (next) lines.push(`NEXT: ${next}`);
  if (blocker) lines.push(`BLOCKER: ${blocker}`);
  return lines.join('\n');
}

module.exports = { duration, renderTurnReport };
