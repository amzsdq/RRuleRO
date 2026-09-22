'use strict';

const { MODES } = require('./progressive-activation');

const STATUSES = Object.freeze(['CONTINUE', 'COMPLETE', 'BLOCKED', 'RISK']);

function iso(value, name) {
  const text = String(value || '').trim();
  const ms = Date.parse(text);
  if (!Number.isFinite(ms)) throw new Error(name + ' must be an ISO timestamp');
  return Object.freeze({ text: new Date(ms).toISOString(), ms });
}

function nonEmpty(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(name + ' is required');
  return text;
}

function normalizeStatus(value) {
  const status = String(value || 'CONTINUE').trim().toUpperCase();
  if (!STATUSES.includes(status)) throw new Error('unknown mini-state status: ' + value);
  return status;
}

function createMiniState(input = {}) {
  const started = iso(input.started_at, 'started_at');
  const sessionId = nonEmpty(input.session_id, 'session_id');
  const durability = input.durable === true ? 'VERSIONED_DURABLE' : 'SECTION_ONLY';

  return Object.freeze({
    type: 'rrulero-mini-state',
    schema_version: 1,
    session_id: sessionId,
    mode: MODES.MINI_STATE,
    durability,
    started_at: started.text,
    last_start: null,
    last_end: null,
    worked_seconds_total: 0,
    turns: 0,
    status: 'CONTINUE',
    next: '',
    promotion: null
  });
}

function recordTurn(state, input = {}) {
  if (!state || state.type !== 'rrulero-mini-state') throw new Error('valid mini state required');
  if (state.status === 'COMPLETE') throw new Error('completed mini state is terminal');

  const start = iso(input.start, 'start');
  const end = iso(input.end, 'end');
  if (end.ms < start.ms) throw new Error('end must not precede start');

  const elapsedSeconds = Math.floor((end.ms - start.ms) / 1000);
  const workedSeconds = Number(input.worked_seconds);
  if (!Number.isFinite(workedSeconds) || workedSeconds < 0) throw new Error('worked_seconds must be non-negative');
  if (workedSeconds > elapsedSeconds) throw new Error('worked_seconds must not exceed elapsed time');

  const status = normalizeStatus(input.status);
  const next = status === 'COMPLETE' ? '' : String(input.next || '').trim();

  return Object.freeze({
    ...state,
    last_start: start.text,
    last_end: end.text,
    worked_seconds_total: state.worked_seconds_total + workedSeconds,
    turns: state.turns + 1,
    status,
    next
  });
}

function promoteMiniState(state, input = {}) {
  if (!state || state.type !== 'rrulero-mini-state') throw new Error('valid mini state required');
  const to = String(input.to || '').trim().toUpperCase();
  if (![MODES.DURABLE_PROJECT, MODES.UNATTENDED].includes(to)) {
    throw new Error('mini state can promote only to DURABLE_PROJECT or UNATTENDED');
  }
  const reason = nonEmpty(input.reason, 'reason');

  return Object.freeze({
    ...state,
    promotion: Object.freeze({
      from: MODES.MINI_STATE,
      to,
      reason,
      at: iso(input.at, 'at').text
    })
  });
}

function serializeMiniState(state) {
  if (!state || state.type !== 'rrulero-mini-state') throw new Error('valid mini state required');
  return JSON.stringify(state, null, 2) + '\n';
}

module.exports = { STATUSES, createMiniState, recordTurn, promoteMiniState, serializeMiniState };
