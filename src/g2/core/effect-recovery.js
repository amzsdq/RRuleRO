'use strict';

const { createHash } = require('node:crypto');

const EFFECTS = new Set(['YES', 'NO', 'UNKNOWN']);
const ACTIONS = new Set([
  'NONE',
  'CORRECTIVE_EFFECT',
  'COMPENSATION',
  'COMPENSATION_THEN_CORRECTIVE',
  'MANUAL_REVIEW'
]);
const AUTOMATIC_ACTIONS = new Set([
  'CORRECTIVE_EFFECT',
  'COMPENSATION',
  'COMPENSATION_THEN_CORRECTIVE'
]);

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function conflictRecord(input = {}, now = Date.now()) {
  const effect = String(input.external_effect || '').toUpperCase();
  if (!EFFECTS.has(effect)) throw new Error('external_effect must be YES, NO, or UNKNOWN');
  return Object.freeze({
    type: 'g2-effect-conflict',
    version: 1,
    state: 'CONFLICTED',
    terminal: true,
    burned_identity: true,
    job_id: required(input.job_id, 'job_id'),
    root_job_id: required(input.root_job_id || input.job_id, 'root_job_id'),
    effect_id: required(input.effect_id, 'effect_id'),
    cause: required(input.cause, 'cause'),
    external_effect: effect,
    authoritative: input.authoritative === true,
    evidence_ref: String(input.evidence_ref || ''),
    conflict_at: new Date(now).toISOString()
  });
}

function decisionRecord(conflict, input = {}, now = Date.now()) {
  const action = String(input.action || 'MANUAL_REVIEW').toUpperCase();
  if (!ACTIONS.has(action)) throw new Error('invalid recovery action');
  const generation = Number(input.generation || 1);
  if (!Number.isSafeInteger(generation) || generation < 1) throw new Error('generation must be positive');
  const authorized = input.authorized === true;
  const repairVerified = input.repair_verified === true;

  if (conflict.external_effect === 'UNKNOWN' && authorized && AUTOMATIC_ACTIONS.has(action)) {
    throw new Error('UNKNOWN external effect forbids automatic recovery');
  }
  if (authorized && AUTOMATIC_ACTIONS.has(action) && !conflict.authoritative) {
    throw new Error('automatic recovery requires authoritative conflict evidence');
  }
  if (authorized && AUTOMATIC_ACTIONS.has(action) && !repairVerified) {
    throw new Error('automatic recovery requires verified repair');
  }

  const decisionId = hash(JSON.stringify([
    'g2-recovery-decision-v1',
    conflict.root_job_id,
    conflict.job_id,
    conflict.effect_id,
    generation
  ]));

  return Object.freeze({
    type: 'g2-recovery-decision',
    version: 1,
    decision_id: decisionId,
    generation,
    action,
    authorized,
    repair_verified: repairVerified,
    state: action === 'MANUAL_REVIEW' || conflict.external_effect === 'UNKNOWN'
      ? 'MANUAL_REVIEW_REQUIRED'
      : (authorized ? 'RECOVERY_AUTHORIZED' : 'RECOVERY_PENDING'),
    recorded_at: new Date(now).toISOString()
  });
}

function recoveryEligibility(conflict, decision, priorPlans = []) {
  if (priorPlans.some(plan => plan.recovery_decision_id === decision.decision_id)) {
    return { ok: false, reason: 'RECOVERY_ALREADY_PLANNED' };
  }
  if (conflict.external_effect === 'UNKNOWN') return { ok: false, reason: 'EXTERNAL_EFFECT_UNKNOWN' };
  if (!conflict.authoritative) return { ok: false, reason: 'CONFLICT_NOT_AUTHORITATIVE' };
  if (!decision.authorized) return { ok: false, reason: 'RECOVERY_NOT_AUTHORIZED' };
  if (!decision.repair_verified) return { ok: false, reason: 'REPAIR_NOT_VERIFIED' };
  if (!AUTOMATIC_ACTIONS.has(decision.action)) return { ok: false, reason: 'ACTION_NOT_AUTOMATIC' };
  return { ok: true, reason: 'RECOVERY_AUTHORIZED' };
}

function planRecovery(conflict, decision, payload, priorPlans = [], now = Date.now()) {
  const eligibility = recoveryEligibility(conflict, decision, priorPlans);
  if (!eligibility.ok) return { eligibility, plan: null };
  const effectId = hash(JSON.stringify(['g2-recovery-effect-v1', decision.decision_id]));
  return {
    eligibility,
    plan: Object.freeze({
      type: 'g2-recovery-plan',
      version: 1,
      effect_id: effectId,
      recovery_of: conflict.effect_id,
      recovery_decision_id: decision.decision_id,
      generation: decision.generation,
      action: decision.action,
      payload,
      created_at: new Date(now).toISOString()
    })
  };
}

module.exports = {
  EFFECTS,
  ACTIONS,
  AUTOMATIC_ACTIONS,
  conflictRecord,
  decisionRecord,
  recoveryEligibility,
  planRecovery
};
