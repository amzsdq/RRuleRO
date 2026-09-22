'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { createGithubDurableStateAdapter } = require('../src/g2/adapters/github-durable-state');
const { createDurableForemanQueue } = require('../src/g2/foreman/durable-queue');
const { newWorker, evolve, resumableCheckpoint, checkpointFromDurableRecord } = require('../src/g2/runtime/worker-runtime');

function memoryTransport() {
  const files = new Map();
  let seq = 0;
  return {
    async readText({ path }) {
      const item = files.get(path);
      return item ? { content: item.content, version: item.version } : null;
    },
    async writeText({ path, content, expected_version }) {
      const current = files.get(path);
      if (current && expected_version !== current.version) throw new Error('transport CAS conflict');
      if (!current && expected_version) throw new Error('transport expected existing version');
      const version = `v${++seq}`;
      files.set(path, { content, version });
      return { version };
    }
  };
}

function workItem() {
  return {
    work_id: 'work-recovery-1',
    objective_ref: 'objective-recovery-1',
    state: 'QUEUED',
    generation: 1,
    subject_sha: 'subject-recovery-1',
    work_domain: 'runtime-recovery',
    conflict_domains: [],
    effect_domain: 'runtime-recovery',
    dependencies: [],
    satisfied_dependencies: [],
    verification_contract: 'synthetic-e2e',
    intended_output: 'durable cold-resume proof',
    priority: 10,
    order: 1,
    downstream_count: 0,
    recovery_or_verification: true
  };
}

test('a replacement Worker cold-resumes from durable checkpoint after the original Worker disappears', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const queue = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-recovery', subject_sha: 'subject-recovery-1' });

  await queue.enqueue(workItem());
  const claim = await queue.claimNext({ worker_id: 'worker-original', now: 1000, lease_ms: 5000 });
  assert.equal(claim.claimed.work_id, 'work-recovery-1');

  let original = newWorker({ worker_id: 'worker-original', objective_id: 'objective-recovery-1' });
  original = evolve(original, { next_state: 'CLAIMING' });
  original = evolve(original, { next_state: 'WORKING', checkpoint: true, useful_units_delta: 3, checkpoint_ref: 'durable:checkpoint-1' });
  const checkpoint = resumableCheckpoint(original, { next_action: 'continue-recovery-fixture', durable_refs: ['work:work-recovery-1'] }, 2000);

  const persisted = await durable.commit({
    logical_id: 'objective-recovery-1', generation: 1, subject_sha: 'subject-recovery-1',
    status: 'WORKER_CHECKPOINT', checkpoint, durable_refs: ['work:work-recovery-1']
  });

  original = null;
  assert.equal(original, null);

  const loaded = await durable.read('objective-recovery-1');
  const replacement = checkpointFromDurableRecord(loaded.record, { checkpoint_ref: persisted.path });
  assert.equal(replacement.worker_id, 'worker-original');
  assert.equal(replacement.objective_id, 'objective-recovery-1');
  assert.equal(replacement.state, 'WORKING');
  assert.equal(replacement.checkpoint_seq, 1);
  assert.equal(replacement.useful_units, 3);
  assert.equal(replacement.last_checkpoint_ref, persisted.path);

  const resumed = evolve(replacement, { next_state: 'WAITING_VERIFICATION', checkpoint: true, useful_units_delta: 2, checkpoint_ref: 'durable:checkpoint-2' });
  assert.equal(resumed.state, 'WAITING_VERIFICATION');
  assert.equal(resumed.checkpoint_seq, 2);
  assert.equal(resumed.useful_units, 5);
});

test('an active durable lease prevents a second Worker from double-claiming the same work', async () => {
  const durable = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const queue = createDurableForemanQueue({ durable_state: durable, queue_id: 'queue-lease', subject_sha: 'subject-recovery-1' });

  await queue.enqueue(workItem());
  const first = await queue.claimNext({ worker_id: 'worker-a', now: 1000, lease_ms: 5000 });
  const second = await queue.claimNext({ worker_id: 'worker-b', now: 2000, lease_ms: 5000 });

  assert.equal(first.claimed.work_id, 'work-recovery-1');
  assert.equal(second.claimed, null);
});
