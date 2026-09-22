'use strict';

const SCHEMA_VERSION = 1;
const TERMINAL_AUTHORITIES = Object.freeze(['PROGRAM_COMPLETE', 'OPERATOR_STOP']);

class DurableStateConflict extends Error {
  constructor(message, code = 'DURABLE_STATE_CONFLICT') {
    super(message);
    this.name = 'DurableStateConflict';
    this.code = code;
  }
}

function required(value, name) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function generation(value) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0) throw new Error('generation must be a non-negative safe integer');
  return n;
}

function cloneJson(value) {
  if (value === undefined) return null;
  return JSON.parse(JSON.stringify(value));
}

function normalizeRecord(input = {}) {
  const terminal = String(input.terminal_authority || '').trim();
  if (terminal && !TERMINAL_AUTHORITIES.includes(terminal)) {
    throw new Error('unknown terminal authority');
  }
  const refs = Array.isArray(input.durable_refs)
    ? [...new Set(input.durable_refs.map(String).map(x => x.trim()).filter(Boolean))].sort()
    : [];

  return Object.freeze({
    type: 'g2-github-durable-state',
    schema_version: SCHEMA_VERSION,
    logical_id: required(input.logical_id, 'logical_id'),
    generation: generation(input.generation),
    subject_sha: required(input.subject_sha, 'subject_sha'),
    status: required(input.status, 'status'),
    terminal_authority: terminal,
    checkpoint: cloneJson(input.checkpoint),
    durable_refs: Object.freeze(refs)
  });
}

function sameRecord(a, b) {
  return JSON.stringify(normalizeRecord(a)) === JSON.stringify(normalizeRecord(b));
}

function authorityRelation(currentInput, candidateInput) {
  const current = normalizeRecord(currentInput);
  const candidate = normalizeRecord(candidateInput);

  if (current.logical_id !== candidate.logical_id) return 'CONFLICT_LOGICAL_ID';
  if (candidate.generation < current.generation) return 'STALE_GENERATION';
  if (candidate.generation === current.generation && candidate.subject_sha !== current.subject_sha) {
    return 'CONFLICT_SUBJECT';
  }
  if (current.terminal_authority) {
    return sameRecord(current, candidate) ? 'SAME' : 'TERMINAL_LOCKED';
  }
  return candidate.generation === current.generation ? 'SAME_GENERATION' : 'FORWARD';
}

function statePath(prefix, logicalId) {
  const base = String(prefix || 'control-state').replace(/^\/+|\/+$/g, '') || 'control-state';
  const encoded = Buffer.from(required(logicalId, 'logical_id'), 'utf8').toString('base64url');
  return `${base}/${encoded}.json`;
}

function createGithubDurableStateAdapter({
  transport,
  path_prefix = 'control-state'
} = {}) {
  if (!transport || typeof transport.readText !== 'function' || typeof transport.writeText !== 'function') {
    throw new Error('transport.readText and transport.writeText are required');
  }

  async function read(logicalId) {
    const path = statePath(path_prefix, logicalId);
    const raw = await transport.readText({ path });
    if (!raw) return Object.freeze({ path, record: null, version: null });

    const record = normalizeRecord(JSON.parse(String(raw.content || '')));
    if (record.logical_id !== String(logicalId).trim()) {
      throw new DurableStateConflict('durable state logical_id does not match requested key', 'KEY_MISMATCH');
    }
    return Object.freeze({
      path,
      record,
      version: required(raw.version, 'transport version')
    });
  }

  async function commit(candidateInput, { expected_version = null } = {}) {
    const candidate = normalizeRecord(candidateInput);
    const current = await read(candidate.logical_id);

    if (current.record) {
      if (!expected_version || expected_version !== current.version) {
        throw new DurableStateConflict('compare-and-swap version mismatch', 'VERSION_CONFLICT');
      }
      const relation = authorityRelation(current.record, candidate);
      if (relation === 'STALE_GENERATION') {
        throw new DurableStateConflict('authority generation cannot roll backward', relation);
      }
      if (relation === 'CONFLICT_SUBJECT') {
        throw new DurableStateConflict('same-generation subject mismatch', relation);
      }
      if (relation === 'TERMINAL_LOCKED') {
        throw new DurableStateConflict('terminal authority cannot be reopened or mutated', relation);
      }
      if (relation === 'CONFLICT_LOGICAL_ID') {
        throw new DurableStateConflict('logical identity conflict', relation);
      }
      if (sameRecord(current.record, candidate)) {
        return Object.freeze({ ...current, unchanged: true });
      }
    } else if (expected_version !== null && expected_version !== undefined && expected_version !== '') {
      throw new DurableStateConflict('cannot update missing state with an expected version', 'MISSING_STATE');
    }

    const content = `${JSON.stringify(candidate, null, 2)}\n`;
    const written = await transport.writeText({
      path: current.path,
      content,
      expected_version: current.version
    });
    return Object.freeze({
      path: current.path,
      record: candidate,
      version: required(written && written.version, 'written version'),
      unchanged: false
    });
  }

  return Object.freeze({ read, commit, pathFor: logicalId => statePath(path_prefix, logicalId) });
}

module.exports = {
  SCHEMA_VERSION,
  TERMINAL_AUTHORITIES,
  DurableStateConflict,
  normalizeRecord,
  authorityRelation,
  statePath,
  createGithubDurableStateAdapter
};
