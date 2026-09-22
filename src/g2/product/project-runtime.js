'use strict';

const intake = require('./intake');
const planApi = require('./plan');
const { compileWorkItems } = require('./project-compiler');

function startProject(input = {}) {
  const intakeResult = intake.compileIntent(input);
  const plan = planApi.createPlan({
    plan_id: input.plan_id,
    goal: input.goal || input.intent,
    steps: input.steps,
    approval_required: intakeResult.execution_gate === 'AWAIT_APPROVAL'
  });

  if (plan.state === 'DRAFT') {
    return Object.freeze({
      type: 'g2-product-project',
      version: 1,
      state: 'AWAIT_APPROVAL',
      intake: intakeResult,
      plan,
      work_items: Object.freeze([])
    });
  }

  const workItems = compileWorkItems({
    plan,
    objective_ref: input.objective_ref,
    subject_sha: input.subject_sha,
    verification_contract: input.verification_contract,
    domain_prefix: input.domain_prefix
  });

  return Object.freeze({
    type: 'g2-product-project',
    version: 1,
    state: 'RUNNING',
    intake: intakeResult,
    plan,
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

module.exports = { startProject, approveProject };
