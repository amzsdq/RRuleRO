'use strict';

function number(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCandidate(value, order) {
  const id = String(value && value.id || '').trim();
  if (!id) throw new Error('workspace candidate id required');
  return Object.freeze({
    id,
    available: value.available === true,
    durable_versioned: value.durable_versioned === true,
    verified_wake: value.verified_wake === true,
    already_bound: value.already_bound === true,
    user_preferred: value.user_preferred === true,
    useful_fit: number(value.useful_fit, 0),
    control_cost: Math.max(0, number(value.control_cost, 0)),
    order
  });
}

function score(candidate, needWake) {
  return (
    (candidate.already_bound ? 10000 : 0) +
    (candidate.user_preferred ? 5000 : 0) +
    candidate.useful_fit -
    candidate.control_cost -
    (needWake && candidate.verified_wake ? 0 : needWake ? 100000 : 0)
  );
}

function chooseWorkspace(candidates = [], options = {}) {
  const needWake = options.need_wake === true;
  const auto = options.auto !== false;
  const normalized = candidates.map(normalizeCandidate);
  const viable = normalized.filter((x) =>
    x.available &&
    x.durable_versioned &&
    (!needWake || x.verified_wake)
  );

  if (!viable.length) {
    return Object.freeze({
      decision: 'UNAVAILABLE',
      selected: null,
      choices: Object.freeze([]),
      reason: needWake ? 'NO_DURABLE_WORKSPACE_WITH_VERIFIED_WAKE' : 'NO_DURABLE_VERSIONED_WORKSPACE'
    });
  }

  const ranked = viable
    .map((x) => ({ candidate: x, score: score(x, needWake) }))
    .sort((a, b) => (b.score - a.score) || (a.candidate.order - b.candidate.order));

  if (!auto) {
    return Object.freeze({
      decision: 'CHOICE_REQUIRED',
      selected: null,
      choices: Object.freeze(ranked.map((x) => x.candidate.id)),
      reason: 'AUTO_SELECTION_DISABLED'
    });
  }

  const best = ranked[0];
  const second = ranked[1];
  const decisive = !second || best.score > second.score || best.candidate.already_bound || best.candidate.user_preferred;

  if (!decisive) {
    return Object.freeze({
      decision: 'CHOICE_REQUIRED',
      selected: null,
      choices: Object.freeze(ranked.map((x) => x.candidate.id)),
      reason: 'MULTIPLE_EQUIVALENT_WORKSPACES'
    });
  }

  return Object.freeze({
    decision: 'AUTO_SELECTED',
    selected: best.candidate.id,
    choices: Object.freeze(ranked.map((x) => x.candidate.id)),
    reason: best.candidate.already_bound
      ? 'EXISTING_BOUND_WORKSPACE'
      : best.candidate.user_preferred
        ? 'USER_PREFERENCE'
        : 'HIGHEST_NET_FIT'
  });
}

module.exports = { normalizeCandidate, chooseWorkspace };
