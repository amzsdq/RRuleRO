'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { product } = require('../src/g2');

const profile = { durableState: { read() {}, commit() {} } };
const scheduler = { read() {}, arm() {}, verify() {}, disable() {} };

test('Personal unattended readiness requires both durable state and complete wake contract', () => {
  assert.equal(product.hostReadiness.validatePersonalHostReadiness({ profile, scheduler }).ready, true);
  const storageOnly = product.hostReadiness.validatePersonalHostReadiness({ profile });
  assert.equal(storageOnly.ready, false);
  assert.deepEqual(storageOnly.missing.sort(), ['scheduler.arm', 'scheduler.disable', 'scheduler.read', 'scheduler.verify']);
});

test('research-required host readiness fails closed without a provider', () => {
  assert.throws(() => product.hostReadiness.requirePersonalHostReadiness({ profile, scheduler, research_required: true }), /research_provider.search/);
  assert.equal(product.hostReadiness.requirePersonalHostReadiness({ profile, scheduler, research_required: true, research_provider: { search() {} } }).ready, true);
});
