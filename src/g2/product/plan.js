'use strict';

const PLAN_STATES = Object.freeze(['DRAFT', 'ACTIVE', 'REVISED', 'SUPERSEDED', 'COMPLETE']);

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function list(value) {
  return Array.isArray(value) ? Object.freeze([...new Set(value.map(String).map((x) => x.trim()).filter(Boolean))]) : Object.freeze([]);
}

function steps(value) {
  if (!Array.isArray(value) || value.length === 0) throw new Error('steps must be a non-empty array');
  return Object.freeze(value.map((step, index) => Object.freeze({
    id: String((step && step.id) || `step-${index + 1}`).trim(),
    description: required(step && step.description, 'step.description'),
    blocking: Boolean(step && step.blocking),
    work_domain: String((step && step.work_domain) || '').trim(),
    conflict_domains: list(step && step.conflict_domains),
    effect_domain: String((step && step.effect_domain) || '').trim(),
    dependencies: list(step && step.dependencies),
    verification_contract: String((step && step.verification_contract) || '').trim(),
    intended_output: String((step && step.intended_output) || '').trim(),
    priority: Number.isFinite(Number(step && step.priority)) ? Number(step.priority) : 100
  })));
}

function createPlan(input = {}) {
  const approvalRequired = input.approval_required === true;
  return Object.freeze({
    type: 'g2-product-plan',
    version: 1,
    plan_id: required(input.plan_id, 'plan_id'),
    revision: 1,
    goal: required(input.goal, 'goal'),
    state: approvalRequired ? 'DRAFT' : 'ACTIVE',
    approval_required: approvalRequired,
    steps: steps(input.steps),
    evidence_refs: Object.freeze([]),
    supersedes_revision: null
  });
}

function activatePlan(plan, { approved = false } = {}) {
  if (!plan || plan.type !== 'g2-product-plan') throw new Error('valid plan required');
  if (plan.state !== 'DRAFT') throw new Error('only DRAFT plan can be activated');
  if (plan.approval_required && !approved) throw new Error('explicit approval required');
  return Object.freeze({ ...plan, state: 'ACTIVE' });
}

function revisePlan(plan, input = {}) {
  if (!plan || plan.type !== 'g2-product-plan') throw new Error('valid plan required');
  if (['SUPERSEDED', 'COMPLETE'].includes(plan.state)) throw new Error('terminal plan cannot be revised');
  const reason = required(input.reason, 'reason');
  const evidenceRefs = Array.isArray(input.evidence_refs) ? input.evidence_refs.map(String).filter(Boolean) : [];
  const nextSteps = input.steps ? steps(input.steps) : plan.steps;
  return Object.freeze({
    ...plan,
    revision: plan.revision + 1,
    state: 'REVISED',
    steps: nextSteps,
    evidence_refs: Object.freeze([...plan.evidence_refs, ...evidenceRefs]),
    revision_reason: reason,
    supersedes_revision: plan.revision
  });
}

function continuePlan(plan) {
  if (!plan || plan.type !== 'g2-product-plan') throw new Error('valid plan required');
  if (!['ACTIVE', 'REVISED'].includes(plan.state)) throw new Error('plan is not executable');
  return Object.freeze({ ...plan, state: 'ACTIVE' });
}

function completePlan(plan) {
  if (!plan || plan.type !== 'g2-product-plan') throw new Error('valid plan required');
  if (!['ACTIVE', 'REVISED'].includes(plan.state)) throw new Error('only executable plan can complete');
  return Object.freeze({ ...plan, state: 'COMPLETE' });
}

module.exports = { PLAN_STATES, createPlan, activatePlan, revisePlan, continuePlan, completePlan };
