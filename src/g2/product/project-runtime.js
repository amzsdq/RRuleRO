'use strict';

const intake = require('./intake');
const planApi = require('./plan');
const evidenceApi = require('./evidence');
const { compileWorkItems } = require('./project-compiler');

function startProject(input = {}) {
  const intakeResult = intake.compileIntent(input);
  const evidence = evidenceApi.requireResearchEvidence(intakeResult, input.evidence || []);
  const plan = planApi.createPlan({
    plan_id: input.plan_id,
    goal: input.goal || input.intent,
    steps: input.steps,
    approval_required: intakeResult.execution_gate === 'AWAIT_APPROVAL'
  });
  const planWithEvidence = evidence.length ? Object.freeze({ ...plan, evidence_refs: Object.freeze(evidence.map((x) => x.id)) }) : plan;

  if (planWithEvidence.state === 'DRAFT') {
    return Object.freeze({
      type: 'g2-product-project',
      version: 2,
      state: 'AWAIT_APPROVAL',
      intake: intakeResult,
      evidence,
      evidence_summary: evidenceApi.evidenceSummary(evidence),
      plan: planWithEvidence,
      work_items: Object.freeze([])
    });
  }

  const workItems = compileWorkItems({
    plan: planWithEvidence,
    objective_ref: input.objective_ref,
    subject_sha: input.subject_sha,
    verification_contract: input.verification_contract,
    domain_prefix: input.domain_prefix
  });

  return Object.freeze({
    type: 'g2-product-project',
    version: 2,
    state: 'RUNNING',
    intake: intakeResult,
    evidence,
    evidence_summary: evidenceApi.evidenceSummary(evidence),
    plan: planWithEvidence,
    work_items: workItems
  });
}

function approveProject(project, compile = {}) {
  if (!project || project.type !== 'g2-product-project') throw new Error('valid product project required');
  if (project.state !== 'AWAIT_APPROVAL') throw new Error('project is not awaiting approval');
  const plan = planApi.activatePlan(project.plan, { approved: true });
  const workItems = compileWorkItems({
    plan,
    objective_ref: compile.objective_ref,
    subject_sha: compile.subject_sha,
    verification_contract: compile.verification_contract,
    domain_prefix: compile.domain_prefix
  });
  return Object.freeze({ ...project, state: 'RUNNING', plan, work_items: workItems });
}

function reviseProjectFromEvidence(project, input = {}) {
  if (!project || project.type !== 'g2-product-project') throw new Error('valid product project required');
  if (project.state === 'AWAIT_APPROVAL') throw new Error('project cannot be revised while awaiting approval');
  if (project.state !== 'RUNNING') throw new Error('project cannot be revised');
  const incoming = evidenceApi.normalizeEvidence(input.evidence || []);
  if (!incoming.length) throw new Error('new evidence required');
  const merged = Object.freeze([...(project.evidence || []), ...incoming]);
  const plan = planApi.revisePlan(project.plan, {
    reason: input.reason || 'new evidence changed execution plan',
    evidence_refs: incoming.map((x) => x.id),
    steps: input.steps
  });
  const executable = planApi.continuePlan(plan);
  const workItems = compileWorkItems({
    plan: executable,
    objective_ref: input.objective_ref,
    subject_sha: input.subject_sha,
    verification_contract: input.verification_contract,
    domain_prefix: input.domain_prefix
  });
  return Object.freeze({
    ...project,
    version: 2,
    state: 'RUNNING',
    evidence: merged,
    evidence_summary: evidenceApi.evidenceSummary(merged),
    plan: executable,
    work_items: workItems
  });
}

module.exports = { startProject, approveProject, reviseProjectFromEvidence };
