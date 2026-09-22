'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { toolWorkspace, personalWorkspace } = require('../src/g2/adapters');

test('host-tool workspace bridges versioned connected storage into Personal profile', async () => {
  const files = new Map();
  let version = 0;
  const workspace = toolWorkspace.createToolWorkspace({
    async read({ path }) { return files.get(path) || null; },
    async write({ path, content, expected_version }) {
      const current = files.get(path) || null;
      const actual = current && current.version;
      if (expected_version != null && expected_version !== actual) throw new Error('VERSION_CONFLICT');
      version += 1;
      const record = { content, version: String(version) };
      files.set(path, record);
      return { version: record.version };
    }
  });
  const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
  const first = await profile.writeDocument('PLAN.md', 'v1');
  assert.equal(first.version, '1');
  assert.deepEqual(await profile.readDocument('PLAN.md'), { content: 'v1', version: '1' });
  const second = await profile.writeDocument('PLAN.md', 'v2', { expected_version: '1' });
  assert.equal(second.version, '2');
  await assert.rejects(() => profile.writeDocument('PLAN.md', 'stale', { expected_version: '1' }), /VERSION_CONFLICT/);
});

test('host-tool workspace rejects malformed host results instead of weakening durability semantics', async () => {
  const workspace = toolWorkspace.createToolWorkspace({
    async read() { return { content: 'x' }; },
    async write() { return {}; }
  });
  await assert.rejects(() => workspace.readText({ path: 'x' }), /version is required/);
  await assert.rejects(() => workspace.writeText({ path: 'x', content: 'x' }), /version/);
});
