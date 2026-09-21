const { createHash } = require('node:crypto');

const CONFLICT_TYPE = 'relay-delivery-conflict';
const DECISION_TYPE = 'relay-recovery-decision';
const DELIVERY_TYPE = 'relay-recovery-delivery';
const VERSION = 1;

const EXTERNAL_EFFECTS = new Set(['YES', 'NO', 'UNKNOWN']);
const RECOVERY_ACTIONS = new Set([
  'NONE',
  'CORRECTIVE_DELIVERY',
  'COMPENSATION',
  'COMPENSATION_THEN_CORRECTIVE',
  'MANUAL_REVIEW'
]);
const AUTO_ACTIONS = new Set(['CORRECTIVE_DELIVERY', 'COMPENSATION', 'COMPENSATION_THEN_CORRECTIVE']);

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function positiveGeneration(value = 1) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new Error('recovery_generation must be a positive integer');
  return n;
}

function normalizeEffect(value) {
  const effect = String(value || '').trim().toUpperCase();
  if (!EXTERNAL_EFFECTS.has(effect)) throw new Error('external_effect must be YES, NO, or UNKNOWN');
  return effect;
}

function normalizeAction(value) {
  const action = String(value || '').trim().toUpperCase();
  if (!RECOVERY_ACTIONS.has(action)) throw new Error('invalid recovery action');
  return action;
}

function iso(value = Date.now()) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error('valid timestamp required');
  return date.toISOString();
}

function conflictRecord(input = {}, now = Date.now()) {
  const jobId = required(input.job_id, 'job_id');
  const deliveryId = required(input.delivery_id, 'delivery_id');
  const cause = required(input.cause, 'cause');
  const effect = normalizeEffect(input.external_effect);
  return Object.freeze({
    type: CONFLICT_TYPE,
    version: VERSION,
    state: 'CONFLICTED',
    terminal: true,
    burned_identity: true,
    job_id: jobId,
    root_job_id: required(input.root_job_id || jobId, 'root_job_id'),
    issue_number: Number.isInteger(Number(input.issue_number)) && Number(input.issue_number) > 0 ? Number(input.issue_number) : null,
    delivery_id: deliveryId,
    cause,
    external_effect: effect,
    authoritative: input.authoritative === true,
    evidence_ref: String(input.evidence_ref || ''),
    conflict_at: iso(input.conflict_at || now)
  });
}

function normalizeConflict(input = {}) {
  if (input.type !== CONFLICT_TYPE || Number(input.version) !== VERSION) throw new Error('invalid conflict record type/version');
  if (input.state !== 'CONFLICTED' || input.terminal !== true || input.burned_identity !== true) throw new Error('conflict record must be immutable terminal/burned');
  return conflictRecord(input, input.conflict_at);
}

function recoveryDecisionId(conflict, generation = 1) {
  const c = normalizeConflict(conflict);
  const g = positiveGeneration(generation);
  return hash(JSON.stringify(['relay-recovery-decision-v1', c.root_job_id, c.job_id, c.delivery_id, g]));
}

function decisionRecord(conflict, input = {}, now = Date.now()) {
  const c = normalizeConflict(conflict);
  const generation = positiveGeneration(input.recovery_generation || 1);
  const action = normalizeAction(input.action || 'MANUAL_REVIEW');
  const authorized = input.authorized === true;
  const repairVerified = input.repair_verified === true;
  const decisionId = recoveryDecisionId(c, generation);

  if (c.external_effect === 'UNKNOWN' && authorized && AUTO_ACTIONS.has(action)) throw new Error('UNKNOWN external_effect forbids automatic recovery authorization');
  if (authorized && AUTO_ACTIONS.has(action) && !c.authoritative) throw new Error('automatic recovery requires authoritative conflict evidence');
  if (authorized && AUTO_ACTIONS.has(action) && !repairVerified) throw new Error('automatic recovery requires fresh repair verification');

  const state = action === 'MANUAL_REVIEW' || c.external_effect === 'UNKNOWN'
    ? 'MANUAL_REVIEW_REQUIRED'
    : (authorized ? 'RECOVERY_AUTHORIZED' : 'RECOVERY_PENDING');

  return Object.freeze({
    type: DECISION_TYPE,
    version: VERSION,
    decision_id: decisionId,
    state,
    job_id: c.job_id,
    root_job_id: c.root_job_id,
    conflicted_delivery_id: c.delivery_id,
    recovery_generation: generation,
    cause: c.cause,
    external_effect: c.external_effect,
    action,
    authorized,
    repair_verified: repairVerified,
    authorized_by: String(input.authorized_by || ''),
    verification_ref: String(input.verification_ref || ''),
    recorded_at: iso(input.recorded_at || now)
  });
}

function normalizeDecision(input = {}, conflict) {
  if (input.type !== DECISION_TYPE || Number(input.version) !== VERSION) throw new Error('invalid recovery decision type/version');
  const c = normalizeConflict(conflict);
  const normalized = decisionRecord(c, input, input.recorded_at);
  if (normalized.decision_id !== input.decision_id) throw new Error('recovery decision_id is not deterministic for this conflict/generation');
  return normalized;
}

function parseRecoveryDeliveryRecord(value) {
  if (!value || value.type !== DELIVERY_TYPE || Number(value.version) !== VERSION) return null;
  const decisionId = String(value.recovery_decision_id || '').trim();
  const deliveryKey = String(value.delivery_key || '').trim();
  if (!decisionId || !deliveryKey) return null;
  return value;
}

function deliveryForDecision(records = [], decisionId) {
  const matches = records.map(parseRecoveryDeliveryRecord).filter(Boolean).filter(record => record.recovery_decision_id === decisionId);
  if (matches.length > 1) return { state: 'CONFLICT', records: matches };
  if (matches.length === 1) return { state: 'EXISTS', record: matches[0] };
  return { state: 'ABSENT' };
}

function recoveryEligibility(conflict, decision, records = []) {
  const c = normalizeConflict(conflict);
  const d = normalizeDecision(decision, c);
  const existing = deliveryForDecision(records, d.decision_id);
  if (existing.state === 'CONFLICT') return { ok: false, reason: 'MULTIPLE_RECOVERY_DELIVERIES_FOR_DECISION', existing };
  if (existing.state === 'EXISTS') return { ok: false, reason: 'RECOVERY_DELIVERY_ALREADY_EXISTS', existing };
  if (c.external_effect === 'UNKNOWN') return { ok: false, reason: 'EXTERNAL_EFFECT_UNKNOWN' };
  if (!c.authoritative) return { ok: false, reason: 'CONFLICT_NOT_AUTHORITATIVE' };
  if (!d.authorized) return { ok: false, reason: 'RECOVERY_NOT_AUTHORIZED' };
  if (!d.repair_verified) return { ok: false, reason: 'REPAIR_NOT_VERIFIED' };
  if (!AUTO_ACTIONS.has(d.action)) return { ok: false, reason: 'ACTION_NOT_AUTOMATIC' };
  return { ok: true, reason: 'RECOVERY_AUTHORIZED' };
}

function recoveryDeliveryKey(decision) {
  return hash(JSON.stringify(['relay-recovery-delivery-v1', required(decision.decision_id, 'decision_id')]));
}

function buildRecoveryDelivery(originalCommand = {}, conflict, decision, correctedMessage, records = [], now = Date.now(), transport = {}) {
  const c = normalizeConflict(conflict);
  const d = normalizeDecision(decision, c);
  const eligibility = recoveryEligibility(c, d, records);
  if (!eligibility.ok) return { eligibility, record: null, command: null };
  const message = required(correctedMessage, 'corrected_message');
  const deliveryKey = recoveryDeliveryKey(d);
  const command = Object.freeze({
    ...originalCommand,
    job_id: c.job_id,
    root_job_id: c.root_job_id,
    delivery_id: deliveryKey,
    message,
    origin: 'conflict-recovery',
    recovery_of: c.delivery_id,
    recovery_decision_id: d.decision_id,
    recovery_generation: d.recovery_generation
  });
  const preparedSha = String(transport.prepared_transport_sha256 || '').trim();
  const preparedLength = transport.prepared_transport_length == null ? null : Number(transport.prepared_transport_length);
  if (preparedSha && !/^[a-f0-9]{64}$/.test(preparedSha)) throw new Error('prepared_transport_sha256 must be sha256 hex');
  if (preparedLength != null && (!Number.isSafeInteger(preparedLength) || preparedLength < 0)) throw new Error('prepared_transport_length must be a non-negative integer');
  const record = {
    type: DELIVERY_TYPE,
    version: VERSION,
    state: 'CREATED',
    delivery_key: deliveryKey,
    job_id: c.job_id,
    root_job_id: c.root_job_id,
    recovery_of: c.delivery_id,
    recovery_decision_id: d.decision_id,
    recovery_generation: d.recovery_generation,
    action: d.action,
    message_sha256: hash(message),
    command,
    created_at: iso(now)
  };
  if (preparedSha) record.prepared_transport_sha256 = preparedSha;
  if (preparedLength != null) record.prepared_transport_length = preparedLength;
  return { eligibility, record: Object.freeze(record), command };
}

function nextGenerationConflict(previousRecoveryRecord, input = {}, now = Date.now()) {
  const prior = parseRecoveryDeliveryRecord(previousRecoveryRecord);
  if (!prior) throw new Error('valid recovery delivery record required');
  return conflictRecord({
    job_id: prior.job_id,
    root_job_id: prior.root_job_id,
    delivery_id: required(input.delivery_id, 'delivery_id'),
    issue_number: input.issue_number,
    cause: input.cause || 'RECOVERY_DELIVERY_CONFLICT',
    external_effect: input.external_effect,
    authoritative: input.authoritative,
    evidence_ref: input.evidence_ref,
    conflict_at: input.conflict_at || now
  }, now);
}

module.exports = {
  CONFLICT_TYPE,
  DECISION_TYPE,
  DELIVERY_TYPE,
  VERSION,
  EXTERNAL_EFFECTS,
  RECOVERY_ACTIONS,
  AUTO_ACTIONS,
  conflictRecord,
  normalizeConflict,
  recoveryDecisionId,
  decisionRecord,
  normalizeDecision,
  parseRecoveryDeliveryRecord,
  deliveryForDecision,
  recoveryEligibility,
  recoveryDeliveryKey,
  buildRecoveryDelivery,
  nextGenerationConflict
};
