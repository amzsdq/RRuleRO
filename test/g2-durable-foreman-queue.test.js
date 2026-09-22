'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createGithubDurableStateAdapter, DurableStateConflict } = require('../src/g2/adapters/github-durable-state');
const { createDurableForemanQueue } = require('../src/g2/foreman/durable-queue');

function memoryTransport() {
  const files = new Map(); let seq = 0;
  return {
    async readText({ path }) { return files.get(path) || null; },
    async writeText({ path, content, expected_version }) {
      const current = files.get(path);
      if (current && current.version !== expected_version) throw new Error('transport CAS conflict');
      if (!current && expected_version) throw new Error('missing expected state');
      const version = `v${++seq}`; files.set(path, { content, version }); return { version };
    }
  };
}

function item(id, order = 0) {
  return {
    work_id: id, generation: 1, objective_ref: 'objective:synthetic', subject_sha: 'sha-1', state: 'QUEUED',
    work_domain: `domain:${id}`, verification_contract: 'unit+public-safety', order
  };
}

test('durably enqueues and cold-loads work', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const first = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-a', subject_sha: 'sha-1' });
  await first.enqueue(item('a'));
  const cold = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-a', subject_sha: 'sha-1' });
  const loaded = await cold.load();
  assert.equal(loaded.checkpoint.items.length, 1);
  assert.equal(loaded.checkpoint.items[0].work_id, 'a');
});

test('claimNext persists claim and prevents duplicate claim while lease is active', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const queue = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-b', subject_sha: 'sha-1' });
  await queue.enqueue(item('a'));
  const first = await queue.claimNext({ worker_id: 'worker-1', now: 1000, lease_ms: 5000 });
  assert.equal(first.claimed.work_id, 'a');
  const second = await queue.claimNext({ worker_id: 'worker-2', now: 2000, lease_ms: 5000 });
  assert.equal(second.claimed, null);
  const loaded = await queue.load();
  assert.equal(loaded.checkpoint.items[0].state, 'CLAIMED');
  assert.equal(loaded.checkpoint.claims[0].worker_id, 'worker-1');
});

test('stale writer is rejected by durable CAS', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const queue = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-c', subject_sha: 'sha-1' });
  await queue.enqueue(item('a'));
  const stale = await queue.load();
  await queue.enqueue(item('b', 1));
  await assert.rejects(
    () => queue.save(stale.checkpoint, { expected_version: stale.version, generation: stale.generation }),
    error => error instanceof DurableStateConflict && error.code === 'VERSION_CONFLICT'
  );
});

test('cold reader fails closed when queue subject changes', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const queue = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-d', subject_sha: 'sha-1' });
  await queue.enqueue(item('a'));
  const wrong = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-d', subject_sha: 'sha-2' });
  await assert.rejects(() => wrong.load(), /subject mismatch/);
});
