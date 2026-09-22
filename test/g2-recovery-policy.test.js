'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { recoveryDecision, idempotencyKey } = require('../src/g2/runtime/recovery-policy');

test('transient failures use bounded exponential retry', () => {
  assert.deepEqual(recoveryDecision({ attempt:0, max_attempts:3, base_delay_ms:1000, max_delay_ms:2500 }), { action:'RETRY', reason:'TRANSIENT_FAILURE', attempt:1, delay_ms:1000 });
  assert.equal(recoveryDecision({ attempt:2, max_attempts:3, base_delay_ms:1000, max_delay_ms:2500 }).delay_ms, 2500);
});

test('retry budget exhaustion fails closed', () => {
  assert.deepEqual(recoveryDecision({ attempt:3, max_attempts:3 }), { action:'FAIL_CLOSED', reason:'RETRY_BUDGET_EXHAUSTED', attempt:3 });
});

test('non-retryable failures fail closed immediately', () => {
  assert.equal(recoveryDecision({ attempt:0, retryable:false }).reason, 'NON_RETRYABLE');
});

test('idempotency key is stable per logical side effect', () => {
  assert.equal(idempotencyKey({ objective_id:'o1', work_id:'w1', effect:'merge:p24' }), 'o1:w1:merge:p24');
  assert.throws(() => idempotencyKey({ objective_id:'o1', work_id:'w1' }), /required/);
});
