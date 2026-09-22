'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DurableStateConflict,
  normalizeRecord,
  authorityRelation,
  createGithubDurableStateAdapter
} = require('../src/g2/adapters/github-durable-state');

function memoryTransport() {
  const files = new Map();
  let seq = 0;
  return {
    async readText({ path }) {
      const item = files.get(path);
      return item ? { content: item.content, version: item.version } : null;
    },
    async writeText({ path, content, expected_version }) {
      const current = files.get(path);
      if (current && expected_version !== current.version) {
        throw new Error('transport CAS conflict');
      }
      if (!current && expected_version) {
        throw new Error('transport expected existing version');
      }
      const version = `v${++seq}`;
      files.set(path, { content, version });
      return { version };
    }
  };
}

function state(overrides = {}) {
  return {
    logical_id: 'worker-alpha',
    generation: 1,
    subject_sha: 'subject-001',
    status: 'RUNNING',
    checkpoint: { step: 1 },
    durable_refs: ['issue:synthetic-1'],
    ...overrides
  };
}

test('normalizes deployment-neutral durable state', () => {
  const record = normalizeRecord(state());
  assert.equal(record.type, 'g2-github-durable-state');
  assert.equal(record.schema_version, 1);
  assert.equal(record.logical_id, 'worker-alpha');
  assert.equal(record.generation, 1);
  assert.deepEqual(record.checkpoint, { step: 1 });
});

test('creates and reads state through injected transport', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const created = await adapter.commit(state());
  assert.equal(created.unchanged, false);
  assert.ok(created.version);

  const loaded = await adapter.read('worker-alpha');
  assert.deepEqual(loaded.record, normalizeRecord(state()));
  assert.equal(loaded.version, created.version);
});

test('requires compare-and-swap version for an existing record', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  await adapter.commit(state());

  await assert.rejects(
    () => adapter.commit(state({ generation: 2, subject_sha: 'subject-002' })),
    error => error instanceof DurableStateConflict && error.code === 'VERSION_CONFLICT'
  );
});

test('accepts forward generation when the expected version matches', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const first = await adapter.commit(state());
  const next = await adapter.commit(
    state({ generation: 2, subject_sha: 'subject-002', checkpoint: { step: 2 } }),
    { expected_version: first.version }
  );
  assert.equal(next.record.generation, 2);
  assert.equal(next.record.subject_sha, 'subject-002');
});

test('rejects authority generation rollback', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const first = await adapter.commit(state({ generation: 2 }));
  await assert.rejects(
    () => adapter.commit(state({ generation: 1 }), { expected_version: first.version }),
    error => error instanceof DurableStateConflict && error.code === 'STALE_GENERATION'
  );
});

test('fails closed on same-generation subject mismatch', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const first = await adapter.commit(state());
  await assert.rejects(
    () => adapter.commit(state({ subject_sha: 'different-subject' }), { expected_version: first.version }),
    error => error instanceof DurableStateConflict && error.code === 'CONFLICT_SUBJECT'
  );
});

test('terminal authority cannot be silently reopened', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const terminal = state({
    status: 'COMPLETE',
    terminal_authority: 'PROGRAM_COMPLETE'
  });
  const first = await adapter.commit(terminal);

  await assert.rejects(
    () => adapter.commit(
      state({ generation: 2, subject_sha: 'subject-002', status: 'RUNNING', terminal_authority: '' }),
      { expected_version: first.version }
    ),
    error => error instanceof DurableStateConflict && error.code === 'TERMINAL_LOCKED'
  );
});

test('identical terminal write is idempotent and does not create a new version', async () => {
  const adapter = createGithubDurableStateAdapter({ transport: memoryTransport() });
  const terminal = state({
    status: 'COMPLETE',
    terminal_authority: 'PROGRAM_COMPLETE'
  });
  const first = await adapter.commit(terminal);
  const second = await adapter.commit(terminal, { expected_version: first.version });
  assert.equal(second.unchanged, true);
  assert.equal(second.version, first.version);
});

test('authority relation exposes forward, stale, conflict, and terminal lock states', () => {
  assert.equal(authorityRelation(state(), state({ generation: 2, subject_sha: 'subject-002' })), 'FORWARD');
  assert.equal(authorityRelation(state({ generation: 2 }), state({ generation: 1 })), 'STALE_GENERATION');
  assert.equal(authorityRelation(state(), state({ subject_sha: 'other' })), 'CONFLICT_SUBJECT');
  assert.equal(
    authorityRelation(
      state({ status: 'COMPLETE', terminal_authority: 'OPERATOR_STOP' }),
      state({ generation: 2, subject_sha: 'subject-002' })
    ),
    'TERMINAL_LOCKED'
  );
});
