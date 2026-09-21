'use strict';

const { normalizeWorkItem, dependenciesReady, domainsConflict } = require('./controller');

const ACTIVE_STATES = new Set(['ASSIGNED', 'RUNNING', 'VERIFYING']);
const TERMINAL_STATES = new Set(['COMPLETE', 'SUPERSEDED']);

function normalizeAssignment(input = {}) {
  const work = normalizeWorkItem({ ...input, state: input.work_state || input.state || 'QUEUED' });
  const assignment_state = String(input.assignment_state || 'READY').trim();
  const allowed = ['READY', 'ASSIGNED', 'RUNNING', 'VERIFYING', 'COMPLETE', 'BLOCKED', 'RECLAIMABLE', 'SUPERSEDED'];
  if (!allowed.includes(assignment_state)) throw new Error('unknown assignment state');
  return Object.freeze({
    ...work,
    assignment_state,
    worker_label: String(input.worker_label || '').trim(),
    assignment_generation: Math.max(0, Number(input.assignment_generation) || 0),
    lease_expires_at: String(input.lease_expires_at || '').trim(),
    verification_state: String(input.verification_state || '').trim()
  });
}

function leaseActive(item, now = Date.now()) {
  const expires = Date.parse(item.lease_expires_at || '');
  return ACTIVE_STATES.has(item.assignment_state) && Number.isFinite(expires) && expires > now;
}

function holdsEffect(item, now = Date.now()) {
  if (!item.effect_domain) return false;
  if (leaseActive(item, now)) return true;
  return item.assignment_state === 'VERIFYING' || ['PENDING', 'UNAVAILABLE'].includes(item.verification_state);
}

function compatible(candidate, selected, active, now) {
  return [...selected, ...active].every(other => {
    if (other.work_id === candidate.work_id) return false;
    if (domainsConflict(candidate, other)) return false;
    if (candidate.effect_domain && holdsEffect(other, now) && candidate.effect_domain === other.effect_domain) return false;
    return true;
  });
}

function rank(item) {
  return [item.recovery_or_verification ? 0 : 1, -item.downstream_count, item.priority, item.order, item.work_id];
}

function compare(a, b) {
  const ar = rank(a); const br = rank(b);
  for (let i = 0; i < ar.length; i += 1) {
    if (ar[i] < br[i]) return -1;
    if (ar[i] > br[i]) return 1;
  }
  return 0;
}

function planDelegation(items, options = {}) {
  const now = Number.isFinite(Number(options.now)) ? Number(options.now) : Date.now();
  const capacity = Math.max(0, Math.floor(Number(options.capacity) || 0));
  const currentSubject = String(options.current_subject_sha || '').trim();
  const normalized = items.map(normalizeAssignment);
  const active = normalized.filter(x => ACTIVE_STATES.has(x.assignment_state) && (leaseActive(x, now) || holdsEffect(x, now)));
  const candidates = normalized.filter(item => {
    if (!['READY', 'RECLAIMABLE'].includes(item.assignment_state)) return false;
    if (currentSubject && item.subject_sha !== currentSubject) return false;
    if (!dependenciesReady(item) || !item.verification_contract) return false;
    if (item.assignment_state === 'RECLAIMABLE' && leaseActive(item, now)) return false;
    return true;
  }).sort(compare);

  const selected = [];
  for (const candidate of candidates) {
    if (selected.length >= capacity) break;
    if (compatible(candidate, selected, active, now)) selected.push(candidate);
  }
  return Object.freeze(selected.map((item, slot) => Object.freeze({
    work_id: item.work_id,
    assignment_generation: item.assignment_generation + 1,
    slot,
    decision: 'ASSIGN'
  })));
}

function delegationTerminal(items) {
  const normalized = items.map(normalizeAssignment);
  return normalized.length > 0 && normalized.every(x => TERMINAL_STATES.has(x.assignment_state));
}

module.exports = { ACTIVE_STATES, normalizeAssignment, leaseActive, holdsEffect, planDelegation, delegationTerminal };
