'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const bootstrapPath = path.resolve(__dirname, '../bootstrap/RRULERO_CHATGPT_BOOTSTRAP.md');

test('one-paste bootstrap declares progressive modes and install boundary', () => {
  const text = fs.readFileSync(bootstrapPath, 'utf8');
  for (const mode of ['FAST_SESSION', 'MINI_STATE', 'DURABLE_PROJECT', 'UNATTENDED']) {
    assert.match(text, new RegExp(mode));
  }
  assert.match(text, /section-level runtime bootstrap/i);
  assert.match(text, /not an operating-system or npm binary installation/i);
  assert.match(text, /RRuleR_SESSION\.json/);
  assert.match(text, /Do not interrupt FAST work with workspace questions/);
  assert.match(text, /reasonable useful alternatives are exhausted/);
});
