'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { progressiveActivation } = require('../src/g2/product');

test('trivial work stays FAST_SESSION without storage ceremony', () => {
  const result = progressiveActivation.chooseActivation({});
  assert.equal(result.mode, 'FAST_SESSION');
  assert.equal(result.ready, true);
  assert.equal(result.state_policy.state, 'NONE');
  assert.equal(result.state_policy.create_document, false);
  assert.equal(result.needs_workspace_choice, false);
});

test('multi-turn continuity promotes to MINI_STATE without pretending durability', () => {
  const result = progressiveActivation.chooseActivation({
    continuation_expected: true,
    durable_storage_verified: false
  });
  assert.equal(result.mode, 'MINI_STATE');
  assert.equal(result.ready, true);
  assert.equal(result.state_policy.state, 'RRuleR_SESSION.json');
  assert.equal(result.state_policy.durability, 'SECTION_ONLY');
  assert.equal(result.state_policy.create_document, false);
  assert.equal(result.persistent_claim_allowed, false);
});

test('MINI_STATE uses one durable document when low-cost versioned storage already exists', () => {
  const result = progressiveActivation.chooseActivation({
    multi_turn: true,
    durable_storage_verified: true
  });
  assert.equal(result.mode, 'MINI_STATE');
  assert.equal(result.state_policy.durability, 'VERSIONED_DURABLE');
  assert.equal(result.state_policy.create_document, true);
  assert.equal(result.persistent_claim_allowed, true);
});

test('multi-stage or recovery-sensitive work requires DURABLE_PROJECT', () => {
  const result = progressiveActivation.chooseActivation({
    multi_stage: true,
    durable_storage_verified: false
  });
  assert.equal(result.mode, 'DURABLE_PROJECT');
  assert.equal(result.ready, false);
  assert.equal(result.needs_workspace_choice, true);
  assert.deepEqual(result.required, ['durable_versioned_storage']);
});

test('unattended mode fails closed until both durable storage and wake are verified', () => {
  const missingWake = progressiveActivation.chooseActivation({
    unattended: true,
    durable_storage_verified: true,
    wake_verified: false
  });
  assert.equal(missingWake.mode, 'UNATTENDED');
  assert.equal(missingWake.ready, false);
  assert.deepEqual(missingWake.required, ['verified_wake']);

  const ready = progressiveActivation.chooseActivation({
    unattended: true,
    durable_storage_verified: true,
    wake_verified: true
  });
  assert.equal(ready.ready, true);
  assert.equal(ready.persistent_claim_allowed, true);
});

test('promotion is monotonic unless explicit demotion is allowed', () => {
  const result = progressiveActivation.chooseActivation({
    current_mode: 'DURABLE_PROJECT'
  });
  assert.equal(result.mode, 'DURABLE_PROJECT');

  const demoted = progressiveActivation.chooseActivation({
    current_mode: 'DURABLE_PROJECT',
    explicit_mode: 'FAST_SESSION',
    allow_demotion: true
  });
  assert.equal(demoted.mode, 'FAST_SESSION');
});
