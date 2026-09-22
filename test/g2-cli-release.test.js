'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const pkg = require('../package.json');

const bin = path.resolve(__dirname, '../bin/rrulero.js');

function run(args) {
  return spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8' });
}

test('release package exposes a stable CLI version', () => {
  const result = run(['version']);
  assert.equal(result.status, 0);
  assert.equal(result.stdout.trim(), pkg.version);
});

test('CLI prints the canonical one-paste ChatGPT bootstrap', () => {
  const result = run(['bootstrap']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /RRuleRO SECTION BOOTSTRAP v1/);
  assert.match(result.stdout, /FAST_SESSION/);
  assert.match(result.stdout, /UNATTENDED/);
});

test('init + doctor provide a clean Personal directory first-run', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rrulero-cli-'));
  try {
    const init = run(['init', '--workspace', root]);
    assert.equal(init.status, 0, init.stderr);
    const initResult = JSON.parse(init.stdout);
    assert.equal(initResult.profile, 'PERSONAL_DIRECTORY');
    assert.equal(initResult.unattended_wake_configured, false);

    const doctor = run(['doctor', '--workspace', root]);
    assert.equal(doctor.status, 0, doctor.stderr);
    const doctorResult = JSON.parse(doctor.stdout);
    assert.equal(doctorResult.durable_storage, 'PASS');
    assert.equal(doctorResult.versioned_cas, 'PASS');

    const config = JSON.parse(fs.readFileSync(path.join(root, 'RRuleR', 'PROFILE.json'), 'utf8'));
    assert.equal(config.profile, 'PERSONAL_DIRECTORY');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('init refuses to silently overwrite an existing workspace', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'rrulero-cli-existing-'));
  try {
    assert.equal(run(['init', '--workspace', root]).status, 0);
    const second = run(['init', '--workspace', root]);
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /already initialized/);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
