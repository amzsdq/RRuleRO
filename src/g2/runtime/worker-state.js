'use strict';

const STATES = Object.freeze([
  'IDLE',
  'CLAIMING',
  'RUNNING',
  'CHECKPOINTING',
  'WAITING_DEPENDENCY',
  'WAITING_VERIFICATION',
  'RECOVERING',
  'BLOCKED_EXTERNAL',
  'COMPLETE'
]);

const ALLOWED = Object.freeze({
  IDLE: new Set(['CLAIMING']),
  CLAIMING: new Set(['RUNNING', 'IDLE', 'BLOCKED_EXTERNAL']),
  RUNNING: new Set(['CHECKPOINTING', 'WAITING_DEPENDENCY', 'WAITING_VERIFICATION', 'RECOVERING', 'BLOCKED_EXTERNAL', 'COMPLETE']),
  CHECKPOINTING: new Set(['RUNNING', 'WAITING_DEPENDENCY', 'WAITING_VERIFICATION', 'RECOVERING', 'BLOCKED_EXTERNAL', 'COMPLETE']),
  WAITING_DEPENDENCY: new Set(['RUNNING', 'RECOVERING', 'BLOCKED_EXTERNAL']),
  WAITING_VERIFICATION: new Set(['RUNNING', 'RECOVERING', 'BLOCKED_EXTERNAL', 'COMPLETE']),
  RECOVERING: new Set(['RUNNING', 'BLOCKED_EXTERNAL']),
  BLOCKED_EXTERNAL: new Set(['RUNNING', 'RECOVERING', 'COMPLETE']),
  COMPLETE: new Set([])
});

function transition(current, next) {
  const from = String(current || '');
  const to = String(next || '');
  if (!STATES.includes(from) || !STATES.includes(to)) throw new Error('unknown worker state');
  if (!ALLOWED[from].has(to)) throw new Error(`invalid worker transition: ${from} -> ${to}`);
  return to;
}

function canDoSubstantiveWork(state) {
  return state === 'RUNNING' || state === 'CHECKPOINTING';
}

function terminal(state) {
  return state === 'COMPLETE';
}

module.exports = { STATES, ALLOWED, transition, canDoSubstantiveWork, terminal };
