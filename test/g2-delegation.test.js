'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { planDelegation, delegationTerminal } = require('../src/g2/foreman');

const SHA = 'public-subject-a';
function item(id, domain, extra = {}) {
  return {
    work_id: id, generation: 1, objective_ref: 'issue-public', subject_sha: SHA,
    work_domain: domain, state: 'QUEUED', assignment_state: 'READY',
    verification_contract: 'synthetic-check', order: 1, ...extra
  };
}

test('assigns independent domains concurrently and deterministically', () => {
  const items = [item('b', 'beta', { order: 2 }), item('a', 'alpha', { order: 1 })];
  const first = planDelegation(items, { capacity: 2, current_subject_sha: SHA, now: 1000 });
  const second = planDelegation(items, { capacity: 2, current_subject_sha: SHA, now: 1000 });
  assert.deepEqual(first, second);
  assert.deepEqual(first.map(x => x.work_id), ['a', 'b']);
});

test('serializes conflicting effect domains', () => {
  const items = [item('a', 'alpha', { effect_domain: 'write:x' }), item('b', 'beta', { effect_domain: 'write:x', order: 2 })];
  assert.equal(planDelegation(items, { capacity: 2, current_subject_sha: SHA, now: 1000 }).length, 1);
});

test('active assignment blocks duplicate/conflicting delegation', () => {
  const active = item('a', 'alpha', { assignment_state: 'RUNNING', lease_expires_at: '2099-01-01T00:00:00Z' });
  const duplicate = item('b', 'alpha', { order: 2 });
  assert.equal(planDelegation([active, duplicate], { capacity: 2, current_subject_sha: SHA, now: 1000 }).length, 0);
});

test('expired assignment can be reclaimed with a new generation', () => {
  const expired = item('a', 'alpha', { assignment_state: 'RECLAIMABLE', assignment_generation: 3, lease_expires_at: '2000-01-01T00:00:00Z' });
  assert.deepEqual(planDelegation([expired], { capacity: 1, current_subject_sha: SHA, now: Date.parse('2026-01-01T00:00:00Z') })[0], { work_id: 'a', assignment_generation: 4, slot: 0, decision: 'ASSIGN' });
});

test('unmet dependency blocks only affected item', () => {
  const blocked = item('a', 'alpha', { dependencies: ['dep'], satisfied_dependencies: [] });
  const free = item('b', 'beta', { order: 2 });
  assert.deepEqual(planDelegation([blocked, free], { capacity: 2, current_subject_sha: SHA, now: 1000 }).map(x => x.work_id), ['b']);
});

test('pending verifier keeps effect domain occupied', () => {
  const verifying = item('a', 'alpha', { assignment_state: 'VERIFYING', effect_domain: 'write:x', verification_state: 'PENDING' });
  const candidate = item('b', 'beta', { effect_domain: 'write:x', order: 2 });
  assert.equal(planDelegation([verifying, candidate], { capacity: 1, current_subject_sha: SHA, now: 1000 }).length, 0);
});

test('local complete does not terminate remaining ready work', () => {
  assert.equal(delegationTerminal([item('a', 'alpha', { assignment_state: 'COMPLETE' }), item('b', 'beta')]), false);
});

test('stale subject is not assigned', () => {
  assert.equal(planDelegation([item('a', 'alpha', { subject_sha: 'stale-public-subject' })], { capacity: 1, current_subject_sha: SHA, now: 1000 }).length, 0);
});
