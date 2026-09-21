'use strict';

const { transition } = require('./worker-state');

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
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

module.exports = { newWorker, evolve, resumableCheckpoint };
