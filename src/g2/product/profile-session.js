'use strict';
function createProfileSession({ profile, logical_id } = {}) {
  if (!profile || !profile.durableState || typeof profile.durableState.read !== 'function' || typeof profile.durableState.commit !== 'function') throw new Error('profile durableState read/commit required');
  const logicalId = String(logical_id || '').trim(); if (!logicalId) throw new Error('logical_id required');
  async function load() { return profile.durableState.read(logicalId); }
  async function checkpoint({ generation, subject_sha, status = 'CONTINUE', checkpoint, durable_refs = [], terminal_authority = '' } = {}) { const current = await load(); return profile.durableState.commit({ logical_id: logicalId, generation, subject_sha, status, checkpoint, durable_refs, terminal_authority }, { expected_version: current.version }); }
  async function resume() { const current = await load(); if (!current.record) return Object.freeze({ found: false, logical_id: logicalId, checkpoint: null }); return Object.freeze({ found: true, logical_id: logicalId, generation: current.record.generation, subject_sha: current.record.subject_sha, status: current.record.status, checkpoint: current.record.checkpoint, terminal_authority: current.record.terminal_authority, version: current.version }); }
  return Object.freeze({ load, checkpoint, resume });
}
module.exports = { createProfileSession };
