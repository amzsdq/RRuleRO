'use strict';

const miniState = require('./mini-state');

function createMiniStateStore({ workspace, path = 'RRuleR_SESSION.json' } = {}) {
  if (!workspace || typeof workspace.readText !== 'function' || typeof workspace.writeText !== 'function') {
    throw new Error('workspace.readText and workspace.writeText are required');
  }
  const target = String(path || '').trim();
  if (!target || target.includes('..')) throw new Error('safe mini-state path required');

  async function load() {
    const current = await workspace.readText({ path: target });
    if (!current) return Object.freeze({ state: null, version: null });
    let state;
    try { state = JSON.parse(current.content); }
    catch { throw new Error('mini-state document is not valid JSON'); }
    if (!state || state.type !== 'rrulero-mini-state') throw new Error('mini-state document has wrong type');
    return Object.freeze({ state, version: current.version });
  }

  async function create(input = {}) {
    const current = await load();
    if (current.state) throw new Error('mini-state already exists');
    const state = miniState.createMiniState({ ...input, durable: true });
    const committed = await workspace.writeText({
      path: target,
      content: miniState.serializeMiniState(state),
      expected_version: null
    });
    return Object.freeze({ state, version: committed.version });
  }

  async function record(input = {}) {
    const current = await load();
    if (!current.state) throw new Error('mini-state does not exist');
    const state = miniState.recordTurn(current.state, input);
    const committed = await workspace.writeText({
      path: target,
      content: miniState.serializeMiniState(state),
      expected_version: current.version
    });
    return Object.freeze({ state, version: committed.version });
  }

  async function promote(input = {}) {
    const current = await load();
    if (!current.state) throw new Error('mini-state does not exist');
    const state = miniState.promoteMiniState(current.state, input);
    const committed = await workspace.writeText({
      path: target,
      content: miniState.serializeMiniState(state),
      expected_version: current.version
    });
    return Object.freeze({ state, version: committed.version });
  }

  return Object.freeze({ path: target, load, create, record, promote });
}

module.exports = { createMiniStateStore };
