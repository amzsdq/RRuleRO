'use strict';

function finite(value, name) { const n = Number(value); if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be non-negative`); return n; }

function workerSample(input = {}) {
  const worker_id = String(input.worker_id || '').trim();
  if (!worker_id) throw new Error('worker_id is required');
  const window_ms = finite(input.window_ms, 'window_ms');
  if (window_ms <= 0) throw new Error('window_ms must be positive');
  const useful_ms = finite(input.useful_ms, 'useful_ms');
  const control_ms = finite(input.control_ms || 0, 'control_ms');
  const blocked_ms = finite(input.blocked_ms || 0, 'blocked_ms');
  if (useful_ms + control_ms + blocked_ms > window_ms) throw new Error('sample durations exceed window');
  return Object.freeze({ worker_id, window_ms, useful_ms, control_ms, blocked_ms });
}

function saturationReport(samplesInput = [], { runnable_backlog = 0 } = {}) {
  const samples = samplesInput.map(workerSample);
  const capacity = samples.reduce((n, x) => n + x.window_ms, 0);
  const useful = samples.reduce((n, x) => n + x.useful_ms, 0);
  const control = samples.reduce((n, x) => n + x.control_ms, 0);
  const blocked = samples.reduce((n, x) => n + x.blocked_ms, 0);
  const utilization = capacity ? useful / capacity : 0;
  const backlog = Math.max(0, Number(runnable_backlog) || 0);
  return Object.freeze({ workers: samples.length, capacity_ms: capacity, useful_ms: useful, control_ms: control, blocked_ms: blocked, utilization, runnable_backlog: backlog, saturated: backlog > 0 && utilization >= (50 / 60), starvation: backlog === 0 && utilization < (50 / 60) });
}

module.exports = { workerSample, saturationReport };
