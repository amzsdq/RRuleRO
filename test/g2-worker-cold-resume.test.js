'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  newWorker,
  evolve,
  resumableCheckpoint,
  resumeWorker,
  checkpointFromDurableRecord
} = require('../src/g2/runtime/worker-runtime');

test('cold resume reconstructs runtime from a checkpoint without conversational state', () => {
  let worker = newWorker({ worker_id: 'worker-a', objective_id: 'objective-a' });
  worker = evolve(worker, { next_state: 'CLAIMING' });
  worker = evolve(worker, { next_state: 'RUNNING', useful_units_delta: 3 });
  worker = evolve(worker, { next_state: 'CHECKPOINTING', checkpoint: true, checkpoint_ref: 'ref-old' });
  const checkpoint = resumableCheckpoint(worker, { next_action: 'continue-step-2' }, 0);

  const resumed = resumeWorker(checkpoint, { checkpoint_ref: 'ref-new' });
  assert.equal(resumed.worker_id, 'worker-a');
  assert.equal(resumed.objective_id, 'objective-a');
  assert.equal(resumed.state, 'CHECKPOINTING');
  assert.equal(resumed.checkpoint_seq, 1);
  assert.equal(resumed.useful_units, 3);
  assert.equal(resumed.last_checkpoint_ref, 'ref-new');
});

test('durable record hydration binds checkpoint objective to logical identity', () => {
  const checkpoint = {
    type: 'g2-worker-checkpoint', version: 1, worker_id: 'worker-a', objective_id: 'objective-a',
    worker_state: 'RUNNING', checkpoint_seq: 2, useful_units: 4, next_action: 'continue', durable_refs: [],
    recorded_at: '1970-01-01T00:00:00.000Z'
  };
  const worker = checkpointFromDurableRecord({
    type: 'g2-github-durable-state', logical_id: 'objective-a', checkpoint
  }, { checkpoint_ref: 'durable:v2' });
  assert.equal(worker.state, 'RUNNING');
  assert.equal(worker.last_checkpoint_ref, 'durable:v2');
});

test('durable record hydration rejects identity mismatch', () => {
  const checkpoint = {
    type: 'g2-worker-checkpoint', version: 1, worker_id: 'worker-a', objective_id: 'objective-a',
    worker_state: 'RUNNING', checkpoint_seq: 1, useful_units: 0
  };
  assert.throws(() => checkpointFromDurableRecord({
    type: 'g2-github-durable-state', logical_id: 'objective-b', checkpoint
  }), /logical identity/);
});

test('terminal checkpoints cannot be resumed', () => {
  assert.throws(() => resumeWorker({
    type: 'g2-worker-checkpoint', version: 1, worker_id: 'worker-a', objective_id: 'objective-a',
    worker_state: 'COMPLETE', checkpoint_seq: 1, useful_units: 1
  }), /terminal worker checkpoint/);
});

test('unknown worker checkpoint states fail closed', () => {
  assert.throws(() => resumeWorker({
    type: 'g2-worker-checkpoint', version: 1, worker_id: 'worker-a', objective_id: 'objective-a',
    worker_state: 'SUPERSEDED', checkpoint_seq: 1, useful_units: 1
  }), /unknown worker state/);
});

test('malformed numeric checkpoint state fails closed', () => {
  assert.throws(() => resumeWorker({
    type: 'g2-worker-checkpoint', version: 1, worker_id: 'worker-a', objective_id: 'objective-a',
    worker_state: 'RUNNING', checkpoint_seq: -1, useful_units: 1
  }), /checkpoint_seq/);
});
