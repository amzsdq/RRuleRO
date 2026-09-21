'use strict';

const OUTCOMES = Object.freeze({
  ARMED_VERIFIED: 'ARMED_VERIFIED',
  ARM_FAILED_PRIOR_SURVIVES: 'ARM_FAILED_PRIOR_SURVIVES',
  ARM_FAILED_NO_SURVIVOR: 'ARM_FAILED_NO_SURVIVOR',
  STALE_OBSERVATION: 'STALE_OBSERVATION',
  VERIFY_PENDING_OR_UNAVAILABLE: 'VERIFY_PENDING_OR_UNAVAILABLE'
});

function compatibleSurvivor(prior, intent) {
  if (!prior || !prior.verified || !prior.enabled) return false;
  if (Number(prior.generation) > Number(intent.generation)) return false;
  if (prior.subject_sha !== intent.subject_sha) return false;
  const due = Date.parse(prior.due_at || '');
  const boundary = Date.parse(intent.safety_boundary_at || '');
  return Number.isFinite(due) && Number.isFinite(boundary) && due > boundary;
}

function reconcileSchedulerOutcome({ intent, mutation = {}, observation = {}, prior = null } = {}) {
  if (!intent || !Number.isSafeInteger(Number(intent.generation))) throw new Error('intent generation required');
  const generation = Number(intent.generation);
  if (Number.isFinite(Number(observation.generation)) && Number(observation.generation) < generation) {
    return { outcome: OUTCOMES.STALE_OBSERVATION, generation };
  }
  if (observation.verification_state === 'PENDING' || observation.verification_state === 'UNAVAILABLE') {
    return { outcome: OUTCOMES.VERIFY_PENDING_OR_UNAVAILABLE, generation };
  }
  if (mutation.ok && observation.verified === true && observation.enabled === true && Number(observation.generation) === generation && observation.subject_sha === intent.subject_sha) {
    return { outcome: OUTCOMES.ARMED_VERIFIED, generation, effect_key: intent.effect_key };
  }
  if (!mutation.ok && compatibleSurvivor(prior, intent)) {
    return { outcome: OUTCOMES.ARM_FAILED_PRIOR_SURVIVES, generation, survivor_generation: Number(prior.generation), degraded: true };
  }
  if (!mutation.ok) {
    return { outcome: OUTCOMES.ARM_FAILED_NO_SURVIVOR, generation, recovery_required: true, recovery: { subject_sha: intent.subject_sha, generation, effect_key: intent.effect_key, intended_due_at: intent.due_at, safety_boundary_at: intent.safety_boundary_at } };
  }
  return { outcome: OUTCOMES.VERIFY_PENDING_OR_UNAVAILABLE, generation };
}

function sameLogicalEffect(a, b) {
  return Boolean(a && b && a.effect_key && a.effect_key === b.effect_key && Number(a.generation) === Number(b.generation));
}

function completionAdmitted({ delegation_terminal, effects = [], unresolved_recovery = false, terminal_authority } = {}) {
  return Boolean(delegation_terminal && effects.length > 0 && effects.every(x => x.verification_state === 'PASS') && !unresolved_recovery && ['PROGRAM_COMPLETE', 'OPERATOR_STOP'].includes(terminal_authority));
}

module.exports = { OUTCOMES, compatibleSurvivor, reconcileSchedulerOutcome, sameLogicalEffect, completionAdmitted };
