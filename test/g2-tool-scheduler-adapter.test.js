'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { scheduler } = require('../src/g2');

test('tool scheduler adapter maps host wake callbacks to canonical contract', async () => {
  const calls = [];
  const adapter = scheduler.toolAdapter.createToolSchedulerAdapter({
    read: async (input) => { calls.push(['read', input]); return { enabled: true, generation: 3 }; },
    arm: async (input) => { calls.push(['arm', input]); return { generation: 4 }; },
    verify: async (input) => { calls.push(['verify', input]); return { ok: true }; },
    disable: async (input) => { calls.push(['disable', input]); return { enabled: false }; }
  });

  assert.equal(scheduler.adapterContract.validateSchedulerAdapter(adapter).ok, true);
  assert.deepEqual(await adapter.read({ actor: 'foreman' }), { enabled: true, generation: 3 });
  assert.deepEqual(await adapter.arm({ actor: 'foreman', due_at: '2026-09-22T09:00:00Z' }), { generation: 4 });
  assert.deepEqual(await adapter.verify({ actor: 'foreman', generation: 4 }), { ok: true });
  assert.deepEqual(await adapter.disable({ actor: 'foreman', terminal_authority: 'COMPLETE' }), { enabled: false });
  assert.deepEqual(calls.map(([name]) => name), ['read', 'arm', 'verify', 'disable']);
});

test('tool scheduler adapter fails closed when host callbacks are incomplete', () => {
  assert.throws(() => scheduler.toolAdapter.createToolSchedulerAdapter({ read() {} }), /arm callback required/);
});
