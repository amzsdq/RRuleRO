'use strict';

const { createGithubDurableStateAdapter } = require('./github-durable-state');

function createGithubProfile({ transport, path_prefix = 'control-state' } = {}) {
  return Object.freeze({
    profile: 'GITHUB',
    durableState: createGithubDurableStateAdapter({ transport, path_prefix })
  });
}

module.exports = { createGithubProfile };
