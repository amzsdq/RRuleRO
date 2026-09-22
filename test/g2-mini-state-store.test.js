'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { miniStateStore } = require('../src/g2/product');

function memoryWorkspace() {
  let value = null;
  let version = null;
  return {
    async readText() {
      return value == null ? null : { content: value, version };
    },
    async writeText({ content, expected_version }) {
      if ((version || null) !== (expected_version || null)) throw new Error('workspace version conflict');
      value = String(content);
      version = crypto.createHash('sha256').update(value).digest('hex');
      return { version };
    }
  };
}

test('durable MINI_STATE uses one versioned document and accumulates duration', async () => {
  const store = miniStateStore.createMiniStateStore({ workspace: memoryWorkspace() });
  const created = await store.create({
    session_id: 'synthetic',
    started_at: '2026-01-01T00:00:00Z'
  });
  assert.equal(created.state.durability, 'VERSIONED_DURABLE');

  const recorded = await store.record({
    start: '2026-01-01T00:01:00Z',
    end: '2026-01-01T00:03:00Z',
    worked_seconds: 110,
    status: 'CONTINUE',
    next: 'next task'
  });
  assert.equal(recorded.state.worked_seconds_total, 110);

  const loaded = await store.load();
  assert.equal(loaded.state.next, 'next task');
  assert.equal(store.path, 'RRuleR_SESSION.json');
});

test('mini-state promotion is persisted without full workspace creation', async () => {
  const store = miniStateStore.createMiniStateStore({ workspace: memoryWorkspace() });
  await store.create({ session_id: 'synthetic', started_at: '2026-01-01T00:00:00Z' });
  const promoted = await store.promote({
    to: 'DURABLE_PROJECT',
    reason: 'work became multi-stage',
    at: '2026-01-01T00:05:00Z'
  });
  assert.equal(promoted.state.promotion.to, 'DURABLE_PROJECT');
});
