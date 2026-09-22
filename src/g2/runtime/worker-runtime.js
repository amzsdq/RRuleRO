'use strict';

const { STATES, terminal, transition } = require('./worker-state');

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function nonNegativeInteger(value, name) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error(`${name} must be a non-negative safe integer`);
  return n;
}

function nonNegativeNumber(value, name) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${name} must be a non-negative number`);
  return n;
}

function newWorker({ worker_id, objective_id } = {}) {
  return Object.freeze({
    type: 'g2-worker-runtime',
    version: 1,
    worker_id: required(worker_id, 'worker_id'),
    objective_id: required(objective_id, 'objective_id'),
    state: 'IDLE',
    checkpoint_seq: 0,
    useful_units: 0,
    last_checkpoint_ref: ''
  });
}

function evolve(worker, event = {}) {
  if (!worker || worker.type !== 'g2-worker-runtime') throw new Error('valid worker required');
  const nextState = transition(worker.state, event.next_state);
  const checkpointSeq = event.checkpoint === true ? worker.checkpoint_seq + 1 : worker.checkpoint_seq;
  const usefulUnits = Number.isFinite(Number(event.useful_units_delta))
    ? worker.useful_units + Number(event.useful_units_delta)
    : worker.useful_units;

  return Object.freeze({
    ...worker,
    state: nextState,
    checkpoint_seq: checkpointSeq,
    useful_units: usefulUnits,
    last_checkpoint_ref: event.checkpoint_ref ? String(event.checkpoint_ref) : worker.last_checkpoint_ref
  });
}

function resumableCheckpoint(worker, payload = {}, now = Date.now()) {
  if (!worker) throw new Error('worker required');
  return Object.freeze({
    type: 'g2-worker-checkpoint',
    version: 1,
    worker_id: worker.worker_id,
    objective_id: worker.objective_id,
    worker_state: worker.state,
    checkpoint_seq: worker.checkpoint_seq,
    useful_units: worker.useful_units,
    next_action: String(payload.next_action || ''),
    durable_refs: Array.isArray(payload.durable_refs) ? payload.durable_refs.map(String) : [],
    recorded_at: new Date(now).toISOString()
  });
}

function resumeWorker(checkpoint = {}, { checkpoint_ref = '' } = {}) {
  if (!checkpoint || checkpoint.type !== 'g2-worker-checkpoint' || checkpoint.version !== 1) {
    throw new Error('valid g2 worker checkpoint required');
  }
  const state = required(checkpoint.worker_state, 'worker_state');
  if (!STATES.includes(state)) throw new Error('unknown worker state');
  if (terminal(state)) throw new Error('terminal worker checkpoint cannot be resumed');

  return Object.freeze({
    type: 'g2-worker-runtime',
    version: 1,
    worker_id: required(checkpoint.worker_id, 'worker_id'),
    objective_id: required(checkpoint.objective_id, 'objective_id'),
    state,
    checkpoint_seq: nonNegativeInteger(checkpoint.checkpoint_seq, 'checkpoint_seq'),
    useful_units: nonNegativeNumber(checkpoint.useful_units, 'useful_units'),
    last_checkpoint_ref: String(checkpoint_ref || '')
  });
}

function checkpointFromDurableRecord(record, { checkpoint_ref = '' } = {}) {
  if (!record || record.type !== 'g2-github-durable-state') throw new Error('valid durable state record required');
  if (!record.checkpoint) throw new Error('durable state record has no checkpoint');
  const worker = resumeWorker(record.checkpoint, { checkpoint_ref });
  if (worker.objective_id !== record.logical_id) {
    throw new Error('durable state logical identity does not match checkpoint objective');
  }
  return worker;
}

module.exports = { newWorker, evolve, resumableCheckpoint, resumeWorker, checkpointFromDurableRecord };
