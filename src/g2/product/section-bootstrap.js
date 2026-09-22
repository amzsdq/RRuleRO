'use strict';

const progressive = require('./progressive-activation');
const workspaceChoice = require('./workspace-choice');

function resolveSectionBootstrap(input = {}) {
  const activation = progressive.chooseActivation(input);
  const mode = activation.mode;

  if (mode === progressive.MODES.FAST_SESSION) {
    return Object.freeze({
      action: 'EXECUTE_NOW',
      activation,
      workspace: null,
      ask_user: false
    });
  }

  if (mode === progressive.MODES.MINI_STATE) {
    return Object.freeze({
      action: activation.state_policy.create_document ? 'EXECUTE_WITH_MINI_STATE' : 'EXECUTE_SECTION_ONLY',
      activation,
      workspace: null,
      ask_user: false
    });
  }

  if (activation.ready) {
    return Object.freeze({
      action: 'EXECUTE_NOW',
      activation,
      workspace: null,
      ask_user: false
    });
  }

  const choice = workspaceChoice.chooseWorkspace(input.workspace_candidates || [], {
    need_wake: mode === progressive.MODES.UNATTENDED,
    auto: input.auto_workspace !== false
  });

  if (choice.decision === 'AUTO_SELECTED') {
    return Object.freeze({
      action: 'BIND_WORKSPACE',
      activation,
      workspace: choice,
      ask_user: false
    });
  }

  if (choice.decision === 'CHOICE_REQUIRED') {
    return Object.freeze({
      action: 'ASK_WORKSPACE_ONCE',
      activation,
      workspace: choice,
      ask_user: true
    });
  }

  return Object.freeze({
    action: 'BLOCKED_CAPABILITY',
    activation,
    workspace: choice,
    ask_user: false
  });
}

module.exports = { resolveSectionBootstrap };
