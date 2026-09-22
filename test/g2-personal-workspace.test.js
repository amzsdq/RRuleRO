'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { personalWorkspace } = require('../src/g2/adapters');

function memoryWorkspace() {
  const files = new Map(); let seq = 0;
  return {
    async readText({ path }) { return files.get(path) || null; },
    async writeText({ path, content, expected_version }) {
      const current = files.get(path) || null;
      const currentVersion = current && current.version;
      if ((currentVersion || null) !== (expected_version || null)) throw new Error('workspace version conflict');
      const value = { content, version: `v${++seq}` }; files.set(path, value); return value;
    },
    files
  };
}

function record(generation, status = 'CONTINUE') {
  return { logical_id: 'project-1', generation, subject_sha: `sha-${generation}`, status, checkpoint: { step: generation } };
}

test('personal profile persists the same fenced durable state without GitHub semantics in user workflow', async () => {
  const workspace = memoryWorkspace();
  const personal = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
  assert.equal(personal.profile, 'PERSONAL');
  const first = await personal.durableState.commit(record(1));
  const read = await personal.durableState.read('project-1');
  assert.equal(read.record.generation, 1);
  const second = await personal.durableState.commit(record(2), { expected_version: first.version });
  assert.equal(second.record.generation, 2);
  assert.match(second.path, /^RRuleR\/control-state\//);
});

test('personal profile supports human workspace documents beside machine state', async () => {
  const workspace = memoryWorkspace();
  const personal = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
  const written = await personal.writeDocument('PLAN.md', '# Plan\n');
  const read = await personal.readDocument('PLAN.md');
  assert.equal(read.content, '# Plan\n');
  assert.equal(read.version, written.version);
});

test('personal profile preserves compare-and-swap conflict protection', async () => {
  const workspace = memoryWorkspace();
  const personal = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
  const first = await personal.durableState.commit(record(1));
  await personal.durableState.commit(record(2), { expected_version: first.version });
  await assert.rejects(() => personal.durableState.commit(record(3), { expected_version: first.version }), /version mismatch/);
});
