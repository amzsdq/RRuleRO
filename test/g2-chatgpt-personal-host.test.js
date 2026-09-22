'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { chatgptPersonalHost } = require('../src/g2/product');

test('ChatGPT Personal host mapping satisfies unattended durable host contract', () => {
  const result = chatgptPersonalHost.assertChatGPTPersonalHost();
  assert.equal(result.ready, true);
  assert.deepEqual(result.missing, []);
  assert.deepEqual(result.missing_mappings, []);
});

test('ChatGPT Personal host mapping declares a concrete research path when research is required', () => {
  const result = chatgptPersonalHost.assertChatGPTPersonalHost({ research_required: true });
  assert.equal(result.ready, true);
  assert.match(result.capabilities.storage_mapping, /requiredRevisionId/);
  assert.match(result.capabilities.wake_mapping, /Automations/);
  assert.match(result.capabilities.research_mapping, /web/);
});
