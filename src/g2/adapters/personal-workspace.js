'use strict';

const { createGithubDurableStateAdapter } = require('./github-durable-state');

function createPersonalWorkspaceAdapter({ workspace, root = 'RRuleR' } = {}) {
  if (!workspace || typeof workspace.readText !== 'function' || typeof workspace.writeText !== 'function') {
    throw new Error('workspace.readText and workspace.writeText are required');
  }
  const prefix = String(root || 'RRuleR').replace(/^\/+|\/+$/g, '') || 'RRuleR';
  const durableState = createGithubDurableStateAdapter({ transport: workspace, path_prefix: `${prefix}/control-state` });

  async function readDocument(name) {
    const safe = String(name || '').trim().replace(/^\/+/, '');
    if (!safe || safe.includes('..')) throw new Error('safe document name required');
    return workspace.readText({ path: `${prefix}/${safe}` });
  }

  async function writeDocument(name, content, { expected_version = null } = {}) {
    const safe = String(name || '').trim().replace(/^\/+/, '');
    if (!safe || safe.includes('..')) throw new Error('safe document name required');
    return workspace.writeText({ path: `${prefix}/${safe}`, content: String(content), expected_version });
  }

  return Object.freeze({
    profile: 'PERSONAL',
    root: prefix,
    durableState,
    readDocument,
    writeDocument
  });
}

module.exports = { createPersonalWorkspaceAdapter };
