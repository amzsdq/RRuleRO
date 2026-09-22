'use strict';

const intake = require('./intake');
const planApi = require('./plan');
const evidenceApi = require('./evidence');
const { compileWorkItems } = require('./project-compiler');

function executionSteps(input, intakeResult) {
  if (Array.isArray(input.steps) && input.steps.length) return input.steps;
  if (intakeResult.mode !== intake.MODES.FAST) throw new Error('steps must be provided for planned projects');
  return [{ id: 'execute', description: String(input.intent || '').trim(), intended_output: String(input.intended_output || input.intent || '').trim(), verification_contract: String(input.verification_contract || '').trim() }];
}
function compile(plan, input = {}) { return compileWorkItems({ plan, objective_ref: input.objective_ref, subject_sha: input.subject_sha, verification_contract: input.verification_contract, domain_prefix: input.domain_prefix }); }

function startProject(input = {}) {
  const intakeResult = intake.compileIntent(input); const evidence = evidenceApi.requireResearchEvidence(intakeResult, input.evidence || []);
  const plan = planApi.createPlan({ plan_id: input.plan_id, goal: input.goal || input.intent, steps: executionSteps(input, intakeResult), approval_required: intakeResult.execution_gate === 'AWAIT_APPROVAL' });
  const planWithEvidence = evidence.length ? Object.freeze({ ...plan, evidence_refs: Object.freeze(evidence.map((x) => x.id)) }) : plan;
  if (planWithEvidence.state === 'DRAFT') return Object.freeze({ type: 'g2-product-project', version: 2, state: 'AWAIT_APPROVAL', intake: intakeResult, evidence, evidence_summary: evidenceApi.evidenceSummary(evidence), plan: planWithEvidence, work_items: Object.freeze([]) });
  return Object.freeze({ type: 'g2-product-project', version: 2, state: 'RUNNING', intake: intakeResult, evidence, evidence_summary: evidenceApi.evidenceSummary(evidence), plan: planWithEvidence, work_items: compile(planWithEvidence, input) });
}
function approveProject(project, input = {}) { if (!project || project.type !== 'g2-product-project') throw new Error('valid product project required'); if (project.state !== 'AWAIT_APPROVAL') throw new Error('project is not awaiting approval'); const plan = planApi.activatePlan(project.plan, { approved: true }); return Object.freeze({ ...project, state: 'RUNNING', plan, work_items: compile(plan, input) }); }
function reviseProjectFromEvidence(project, input = {}) {
  if (!project || project.type !== 'g2-product-project') throw new Error('valid product project required'); if (project.state === 'AWAIT_APPROVAL') throw new Error('project cannot be revised while awaiting approval'); if (project.state !== 'RUNNING') throw new Error('project cannot be revised');
  const incoming = evidenceApi.normalizeEvidence(input.evidence || []); if (!incoming.length) throw new Error('new evidence required'); const merged = Object.freeze([...(project.evidence || []), ...incoming]);
  const revised = planApi.revisePlan(project.plan, { reason: input.reason || 'new evidence changed execution plan', evidence_refs: incoming.map((x) => x.id), steps: input.steps }); const plan = planApi.continuePlan(revised);
  return Object.freeze({ ...project, version: 2, state: 'RUNNING', evidence: merged, evidence_summary: evidenceApi.evidenceSummary(merged), plan, work_items: compile(plan, input) });
}
function reviseProjectFromUser(project, input = {}) {
  if (!project || project.type !== 'g2-product-project') throw new Error('valid product project required');
  if (project.state === 'AWAIT_APPROVAL') { const plan = planApi.reviseDraftPlan(project.plan, { reason: input.reason || 'user revised plan', steps: input.steps }); return Object.freeze({ ...project, plan, work_items: Object.freeze([]) }); }
  if (project.state !== 'RUNNING') throw new Error('project cannot be revised');
  const revised = planApi.revisePlan(project.plan, { reason: input.reason || 'user revised plan', steps: input.steps }); const plan = planApi.continuePlan(revised);
  return Object.freeze({ ...project, plan, work_items: compile(plan, input) });
}

module.exports = { startProject, approveProject, reviseProjectFromEvidence, reviseProjectFromUser };
