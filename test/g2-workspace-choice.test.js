'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { workspaceChoice } = require('../src/g2/product');

test('AUTO reuses already-bound durable workspace without user interruption', () => {
  const result = workspaceChoice.chooseWorkspace([
    { id: 'drive', available: true, durable_versioned: true, useful_fit: 10 },
    { id: 'github', available: true, durable_versioned: true, already_bound: true }
  ]);
  assert.equal(result.decision, 'AUTO_SELECTED');
  assert.equal(result.selected, 'github');
  assert.equal(result.reason, 'EXISTING_BOUND_WORKSPACE');
});

test('AUTO asks once only when viable workspaces are materially equivalent', () => {
  const result = workspaceChoice.chooseWorkspace([
    { id: 'drive', available: true, durable_versioned: true },
    { id: 'github', available: true, durable_versioned: true }
  ]);
  assert.equal(result.decision, 'CHOICE_REQUIRED');
  assert.deepEqual(result.choices, ['drive', 'github']);
});

test('unattended choice excludes durable stores without verified wake', () => {
  const result = workspaceChoice.chooseWorkspace([
    { id: 'drive', available: true, durable_versioned: true, verified_wake: true },
    { id: 'github', available: true, durable_versioned: true, verified_wake: false, useful_fit: 100 }
  ], { need_wake: true });
  assert.equal(result.decision, 'AUTO_SELECTED');
  assert.equal(result.selected, 'drive');
});

test('unsupported durable work fails closed', () => {
  const result = workspaceChoice.chooseWorkspace([
    { id: 'read-only', available: true, durable_versioned: false }
  ]);
  assert.equal(result.decision, 'UNAVAILABLE');
  assert.equal(result.selected, null);
});
