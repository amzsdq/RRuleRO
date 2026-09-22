'use strict';

const MODES = Object.freeze({
  FAST_SESSION: 'FAST_SESSION',
  MINI_STATE: 'MINI_STATE',
  DURABLE_PROJECT: 'DURABLE_PROJECT',
  UNATTENDED: 'UNATTENDED'
});

const MODE_ORDER = Object.freeze([
  MODES.FAST_SESSION,
  MODES.MINI_STATE,
  MODES.DURABLE_PROJECT,
  MODES.UNATTENDED
]);

function bool(value) { return value === true; }

function normalizeMode(value, fallback = MODES.FAST_SESSION) {
  if (value == null || value === '') return fallback;
  const mode = String(value).trim().toUpperCase();
  if (!MODE_ORDER.includes(mode)) throw new Error('unknown activation mode: ' + value);
  return mode;
}

function rank(mode) {
  const index = MODE_ORDER.indexOf(normalizeMode(mode));
  if (index < 0) throw new Error('unknown activation mode: ' + mode);
  return index;
}

function inferredTarget(input = {}) {
  if (bool(input.unattended) || bool(input.background_continuation)) return MODES.UNATTENDED;
  if (
    bool(input.long_running) ||
    bool(input.multi_stage) ||
    bool(input.recovery_required) ||
    bool(input.cold_resume_required) ||
    bool(input.persistent_state_required) ||
    bool(input.material_side_effects)
  ) return MODES.DURABLE_PROJECT;
  if (
    bool(input.continuation_expected) ||
    bool(input.multi_turn) ||
    bool(input.context_loss_cost_material)
  ) return MODES.MINI_STATE;
  return MODES.FAST_SESSION;
}

function chooseActivation(input = {}) {
  const current = normalizeMode(input.current_mode, MODES.FAST_SESSION);
  const requested = input.explicit_mode
    ? normalizeMode(input.explicit_mode)
    : inferredTarget(input);

  let target = requested;
  if (rank(target) < rank(current) && input.allow_demotion !== true) target = current;

  const durableStorageVerified = bool(input.durable_storage_verified);
  const wakeVerified = bool(input.wake_verified);
  const required = [];
  if (target === MODES.DURABLE_PROJECT || target === MODES.UNATTENDED) {
    if (!durableStorageVerified) required.push('durable_versioned_storage');
  }
  if (target === MODES.UNATTENDED && !wakeVerified) required.push('verified_wake');

  const statePolicy = target === MODES.FAST_SESSION
    ? Object.freeze({ state: 'NONE', durability: 'NONE', create_document: false })
    : target === MODES.MINI_STATE
      ? Object.freeze({
          state: 'RRuleR_SESSION.json',
          durability: durableStorageVerified ? 'VERSIONED_DURABLE' : 'SECTION_ONLY',
          create_document: durableStorageVerified
        })
      : Object.freeze({ state: 'FULL_WORKSPACE', durability: 'VERSIONED_DURABLE', create_document: true });

  return Object.freeze({
    mode: target,
    previous_mode: current,
    promoted: rank(target) > rank(current),
    ready: required.length === 0,
    required: Object.freeze(required),
    needs_workspace_choice: required.includes('durable_versioned_storage'),
    needs_wake: target === MODES.UNATTENDED && !wakeVerified,
    state_policy: statePolicy,
    persistent_claim_allowed:
      (target === MODES.MINI_STATE && durableStorageVerified) ||
      ((target === MODES.DURABLE_PROJECT || target === MODES.UNATTENDED) && required.length === 0),
    reason: input.explicit_mode ? 'EXPLICIT_MODE' : 'MINIMUM_SUFFICIENT_MODE'
  });
}

function promotionNeeded(currentMode, input = {}) {
  const result = chooseActivation({ ...input, current_mode: currentMode });
  return Object.freeze({
    promote: result.promoted,
    from: normalizeMode(currentMode),
    to: result.mode,
    ready: result.ready,
    required: result.required
  });
}

module.exports = { MODES, MODE_ORDER, normalizeMode, rank, inferredTarget, chooseActivation, promotionNeeded };
