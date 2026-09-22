'use strict';

const BLOCKER_ACTIONS = Object.freeze({
  CONTINUE_ALTERNATE: 'CONTINUE_ALTERNATE',
  BLOCKED_USER_ACTION: 'BLOCKED_USER_ACTION',
  BLOCKED_DECISION: 'BLOCKED_DECISION',
  BLOCKED_EXTERNAL: 'BLOCKED_EXTERNAL',
  RISK: 'RISK',
  NOT_BLOCKED: 'NOT_BLOCKED'
});

function normalizeAlternates(value) {
  if (!Array.isArray(value)) return [];
  return value.map((x) => Object.freeze({
    id: String((x && x.id) || '').trim(),
    runnable: Boolean(x && x.runnable),
    safe: x && x.safe !== false
  })).filter((x) => x.id);
}

function resolveBlocker(input = {}) {
  if (input.blocked !== true) {
    return Object.freeze({ action: BLOCKER_ACTIONS.NOT_BLOCKED, may_end_turn: false, selected_alternate: null });
  }

  const alternates = normalizeAlternates(input.alternate_paths);
  const selected = alternates.find((x) => x.runnable && x.safe);
  if (selected) {
    return Object.freeze({
      action: BLOCKER_ACTIONS.CONTINUE_ALTERNATE,
      may_end_turn: false,
      selected_alternate: selected.id
    });
  }

  if (input.material_risk === true) {
    return Object.freeze({ action: BLOCKER_ACTIONS.RISK, may_end_turn: true, selected_alternate: null });
  }
  if (input.user_decision_required === true) {
    return Object.freeze({ action: BLOCKER_ACTIONS.BLOCKED_DECISION, may_end_turn: true, selected_alternate: null });
  }
  if (input.user_action_possible === true) {
    return Object.freeze({ action: BLOCKER_ACTIONS.BLOCKED_USER_ACTION, may_end_turn: true, selected_alternate: null });
  }
  return Object.freeze({ action: BLOCKER_ACTIONS.BLOCKED_EXTERNAL, may_end_turn: true, selected_alternate: null });
}

module.exports = { BLOCKER_ACTIONS, resolveBlocker };
