'use strict';

const { normalizeWorkItem } = require('../foreman/controller');

function required(value, name) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function compileWorkItems({
  plan,
  objective_ref,
  subject_sha,
  verification_contract = 'unit+public-safety',
  domain_prefix = 'project'
} = {}) {
  if (!plan || plan.type !== 'g2-product-plan') throw new Error('valid product plan required');
  if (!['ACTIVE', 'REVISED'].includes(plan.state)) throw new Error('plan is not executable');

  const objective = required(objective_ref, 'objective_ref');
  const subject = required(subject_sha, 'subject_sha');
  const fallbackVerification = required(verification_contract, 'verification_contract');
  const prefix = required(domain_prefix, 'domain_prefix');
  const idFor = new Map(plan.steps.map((step) => [step.id, `${plan.plan_id}:r${plan.revision}:${step.id}`]));

  return Object.freeze(plan.steps.map((step, order) => normalizeWorkItem({
    work_id: idFor.get(step.id),
    generation: plan.revision,
    objective_ref: objective,
    subject_sha: subject,
    state: 'QUEUED',
    work_domain: step.work_domain || `${prefix}:${step.id}`,
    conflict_domains: step.conflict_domains,
    effect_domain: step.effect_domain,
    dependencies: step.dependencies.map((dep) => {
      if (!idFor.has(dep)) throw new Error(`unknown plan dependency: ${dep}`);
      return idFor.get(dep);
    }),
    satisfied_dependencies: [],
    verification_contract: step.verification_contract || fallbackVerification,
    intended_output: step.intended_output || step.description,
    priority: step.priority,
    order,
    downstream_count: plan.steps.filter((candidate) => candidate.dependencies.includes(step.id)).length
  })));
}

module.exports = { compileWorkItems };
