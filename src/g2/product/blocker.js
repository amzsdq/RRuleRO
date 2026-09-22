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
  return value.map((x, index) => Object.freeze({
    id: String((x && x.id) || '').trim(),
    runnable: Boolean(x && x.runnable),
    safe: x && x.safe !== false,
    useful_value: Number.isFinite(Number(x && x.useful_value)) ? Number(x.useful_value) : 0,
    control_cost: Number.isFinite(Number(x && x.control_cost)) ? Math.max(0, Number(x.control_cost)) : 0,
    order: index
  })).filter((x) => x.id);
}

function selectBestAlternate(alternates) {
  return alternates
    .filter((x) => x.runnable && x.safe)
    .map((x) => ({ ...x, throughput_score: x.useful_value - x.control_cost }))
    .sort((a, b) => (b.throughput_score - a.throughput_score) || (a.order - b.order))[0] || null;
}

function resolveBlocker(input = {}) {
  if (input.blocked !== true) {
    return Object.freeze({ action: BLOCKER_ACTIONS.NOT_BLOCKED, may_end_turn: false, selected_alternate: null });
  }

  const alternates = normalizeAlternates(input.alternate_paths);
  const selected = selectBestAlternate(alternates);
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
