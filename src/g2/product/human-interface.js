'use strict';

function text(value) { return String(value || '').trim(); }
function list(value) { return Array.isArray(value) ? value.map(String).map((x) => x.trim()).filter(Boolean) : []; }

function planPreview(project = {}) {
  if (!project.plan) throw new Error('project plan required');
  return Object.freeze({ goal: text(project.plan.goal), revision: project.plan.revision, state: project.plan.state, approval_required: project.plan.approval_required === true, informational: project.plan.approval_required !== true, steps: Object.freeze(project.plan.steps.map((x) => Object.freeze({ id: x.id, description: x.description }))) });
}

function progressSummary(input = {}) {
  const completed = list(input.completed); const active = list(input.active); const remaining = list(input.remaining);
  return Object.freeze({ status: text(input.status) || (remaining.length ? 'CONTINUE' : 'COMPLETE'), completed: Object.freeze(completed), active: Object.freeze(active), remaining: Object.freeze(remaining), next: text(input.next), summary: [completed.length ? `Completed: ${completed.join('; ')}` : '', active.length ? `Active: ${active.join('; ')}` : '', remaining.length ? `Remaining: ${remaining.join('; ')}` : '', text(input.next) ? `Next: ${text(input.next)}` : ''].filter(Boolean).join('\n') });
}

function blockerReport(input = {}) {
  const action = text(input.action); const reason = text(input.reason); const completed = list(input.completed); const resume = text(input.resume_from);
  if (!action) throw new Error('blocker action required');
  if (!reason) throw new Error('blocker reason required');
  if (!resume) throw new Error('resume_from required');
  const userActionable = ['BLOCKED_USER_ACTION', 'BLOCKED_DECISION'].includes(action); const required = text(input.required_user_input);
  if (userActionable && !required) throw new Error('actionable blocker requires required_user_input');
  return Object.freeze({ action, reason, completed: Object.freeze(completed), user_action_required: userActionable, required_user_input: userActionable ? required : '', resume_from: resume, message: [`Blocked: ${reason}`, completed.length ? `Completed: ${completed.join('; ')}` : '', userActionable ? `User action: ${required}` : 'User action: none', `Resume: ${resume}`].filter(Boolean).join('\n') });
}

module.exports = { planPreview, progressSummary, blockerReport };
