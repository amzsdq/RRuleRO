'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pkg = require('../package.json');

test('release metadata is distributable and bounded', () => {
  assert.equal(pkg.name, 'rrulero');
  assert.equal(pkg.version, '1.0.0-rc.3');
  assert.notEqual(pkg.private, true);
  assert.equal(pkg.main, 'src/g2/index.js');
  assert.equal(pkg.bin.rrulero, 'bin/rrulero.js');
  assert.equal(pkg.engines.node, '>=22');
  assert.equal(pkg.license, 'UNLICENSED');
  assert.ok(Array.isArray(pkg.files));
  assert.ok(pkg.files.includes('src/'));
  assert.ok(pkg.files.includes('bin/'));
  assert.ok(pkg.files.includes('bootstrap/'));
  assert.ok(!pkg.files.includes('test/'));
  assert.ok(!pkg.files.includes('.github/'));
});

test('release scripts keep registry publication explicit', () => {
  assert.equal(typeof pkg.scripts['release:smoke'], 'string');
  assert.equal(typeof pkg.scripts['release:check'], 'string');
  for (const value of Object.values(pkg.scripts)) {
    assert.doesNotMatch(value, /npm\s+publish/);
  }
});
