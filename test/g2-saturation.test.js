'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { workerSample, saturationReport } = require('../src/g2/runtime/saturation');

test('aggregate utilization measures useful worker capacity', () => {
  const report = saturationReport([
    { worker_id:'a', window_ms:3600000, useful_ms:3300000, control_ms:120000, blocked_ms:60000 },
    { worker_id:'b', window_ms:3600000, useful_ms:3000000, control_ms:180000, blocked_ms:120000 }
  ], { runnable_backlog: 4 });
  assert.equal(report.workers, 2);
  assert.equal(report.useful_ms, 6300000);
  assert.equal(report.utilization, 0.875);
  assert.equal(report.saturated, true);
});

test('low utilization with no runnable backlog is classified as starvation not saturation failure', () => {
  const report = saturationReport([{ worker_id:'a', window_ms:3600000, useful_ms:1200000 }], { runnable_backlog: 0 });
  assert.equal(report.starvation, true);
  assert.equal(report.saturated, false);
});

test('invalid overlapping duration accounting fails closed', () => {
  assert.throws(() => workerSample({ worker_id:'a', window_ms:100, useful_ms:80, control_ms:30 }), /exceed/);
});
