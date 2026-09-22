'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { hostCapabilities } = require('../src/g2/product');

test('unattended Personal host claim requires durable storage and verified wake mappings', () => {
  const result = hostCapabilities.assessHostCapabilities({
    durable_versioned_storage: true,
    storage_mapping: 'directory:/durable/RRuleR',
    verified_wake: false
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.missing, ['verified_wake']);
});

test('capability booleans without concrete mappings are not sufficient evidence', () => {
  const result = hostCapabilities.assessHostCapabilities({
    durable_versioned_storage: true,
    verified_wake: true
  });
  assert.equal(result.ready, false);
  assert.deepEqual([...result.missing_mappings].sort(), ['storage_mapping', 'wake_mapping']);
});

test('interactive Personal host may omit wake only when unattended execution is not claimed', () => {
  const result = hostCapabilities.assertHostClaim({
    durable_versioned_storage: true,
    storage_mapping: 'directory:/durable/RRuleR'
  }, { unattended: false });
  assert.equal(result.ready, true);
});

test('research-backed unattended host claim requires concrete research mapping', () => {
  const result = hostCapabilities.assertHostClaim({
    durable_versioned_storage: true,
    storage_mapping: 'tool:versioned-text',
    verified_wake: true,
    wake_mapping: 'tool:verified-scheduler',
    research: true,
    research_mapping: 'tool:web-search'
  }, { research_required: true });
  assert.equal(result.ready, true);
});
