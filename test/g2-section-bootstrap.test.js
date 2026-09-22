'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { sectionBootstrap } = require('../src/g2/product');

test('fresh trivial task starts immediately and never asks for workspace', () => {
  const result = sectionBootstrap.resolveSectionBootstrap({});
  assert.equal(result.action, 'EXECUTE_NOW');
  assert.equal(result.activation.mode, 'FAST_SESSION');
  assert.equal(result.ask_user, false);
});

test('continuing work can use section-only MINI_STATE without storage claims', () => {
  const result = sectionBootstrap.resolveSectionBootstrap({ multi_turn: true });
  assert.equal(result.action, 'EXECUTE_SECTION_ONLY');
  assert.equal(result.activation.mode, 'MINI_STATE');
  assert.equal(result.activation.persistent_claim_allowed, false);
});

test('durable work auto-binds a clearly preferred verified workspace', () => {
  const result = sectionBootstrap.resolveSectionBootstrap({
    multi_stage: true,
    workspace_candidates: [
      { id: 'drive', available: true, durable_versioned: true, user_preferred: true },
      { id: 'github', available: true, durable_versioned: true }
    ]
  });
  assert.equal(result.action, 'BIND_WORKSPACE');
  assert.equal(result.workspace.selected, 'drive');
  assert.equal(result.ask_user, false);
});

test('durable work asks once when verified workspace choices are equivalent', () => {
  const result = sectionBootstrap.resolveSectionBootstrap({
    recovery_required: true,
    workspace_candidates: [
      { id: 'drive', available: true, durable_versioned: true },
      { id: 'github', available: true, durable_versioned: true }
    ]
  });
  assert.equal(result.action, 'ASK_WORKSPACE_ONCE');
  assert.equal(result.ask_user, true);
});

test('unattended work does not select storage lacking verified wake', () => {
  const result = sectionBootstrap.resolveSectionBootstrap({
    unattended: true,
    workspace_candidates: [
      { id: 'drive', available: true, durable_versioned: true, verified_wake: false }
    ]
  });
  assert.equal(result.action, 'BLOCKED_CAPABILITY');
  assert.equal(result.activation.mode, 'UNATTENDED');
});
