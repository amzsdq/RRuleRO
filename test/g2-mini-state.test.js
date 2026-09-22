'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { miniState } = require('../src/g2/product');

test('mini state records only continuity essentials and cumulative useful duration', () => {
  const state = miniState.createMiniState({
    session_id: 'synthetic-session',
    started_at: '2026-01-01T00:00:00Z',
    durable: false
  });
  assert.equal(state.durability, 'SECTION_ONLY');
  assert.equal(state.worked_seconds_total, 0);

  const next = miniState.recordTurn(state, {
    start: '2026-01-01T00:00:10Z',
    end: '2026-01-01T00:05:10Z',
    worked_seconds: 290,
    status: 'CONTINUE',
    next: 'continue useful work'
  });
  assert.equal(next.worked_seconds_total, 290);
  assert.equal(next.turns, 1);
  assert.equal(next.next, 'continue useful work');
});

test('mini state rejects fabricated useful time', () => {
  const state = miniState.createMiniState({
    session_id: 'synthetic-session',
    started_at: '2026-01-01T00:00:00Z'
  });
  assert.throws(() => miniState.recordTurn(state, {
    start: '2026-01-01T00:00:00Z',
    end: '2026-01-01T00:01:00Z',
    worked_seconds: 61
  }), /must not exceed elapsed/);
});

test('mini state can record promotion without restarting task state', () => {
  const state = miniState.createMiniState({
    session_id: 'synthetic-session',
    started_at: '2026-01-01T00:00:00Z',
    durable: true
  });
  const promoted = miniState.promoteMiniState(state, {
    to: 'DURABLE_PROJECT',
    reason: 'recovery now matters',
    at: '2026-01-01T00:10:00Z'
  });
  assert.equal(promoted.session_id, state.session_id);
  assert.equal(promoted.promotion.from, 'MINI_STATE');
  assert.equal(promoted.promotion.to, 'DURABLE_PROJECT');
  assert.match(miniState.serializeMiniState(promoted), /recovery now matters/);
});
