'use strict';

const MODES = Object.freeze({
  FAST: 'FAST',
  PLANNED: 'PLANNED',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED'
});

const RESEARCH_DEPTH = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH'
});

function bool(value) { return value === true; }
function text(value, name) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function classifyMode(input = {}) {
  if (
    bool(input.irreversible) ||
    bool(input.high_impact) ||
    bool(input.missing_authority) ||
    bool(input.user_decision_required)
  ) return MODES.APPROVAL_REQUIRED;

  if (
    bool(input.long_running) ||
    bool(input.multi_stage) ||
    bool(input.scope_ambiguous) ||
    bool(input.material_research_value)
  ) return MODES.PLANNED;

  return MODES.FAST;
}

function researchDepth(input = {}) {
  if (bool(input.high_impact) || bool(input.high_failure_cost) || bool(input.evidence_critical)) {
    return RESEARCH_DEPTH.HIGH;
  }
  if (bool(input.current_info_required) || bool(input.evolving_domain) || bool(input.material_research_value)) {
    return RESEARCH_DEPTH.MEDIUM;
  }
  return RESEARCH_DEPTH.LOW;
}

function shouldResearch(input = {}) {
  const depth = researchDepth(input);
  if (depth === RESEARCH_DEPTH.LOW) return false;
  if (bool(input.evidence_critical) || bool(input.current_info_required)) return true;
  return bool(input.material_research_value);
}

function compileIntent(input = {}) {
  const intent = text(input.intent, 'intent');
  const mode = classifyMode(input);
  const research_depth = researchDepth(input);
  const research_required = shouldResearch(input);
  const approval_required = mode === MODES.APPROVAL_REQUIRED;

  return Object.freeze({
    type: 'g2-product-intake',
    version: 1,
    intent,
    mode,
    research_depth,
    research_required,
    execution_gate: approval_required ? 'AWAIT_APPROVAL' : 'RUN_NOW',
    plan_preview: approval_required ? 'DECISION_REQUIRED' : (mode === MODES.PLANNED ? 'INFORMATIONAL' : 'NONE'),
    throughput_policy: Object.freeze({
      mandatory_preview_wait: false,
      unconditional_research: false,
      continue_when_safe_work_exists: true
    })
  });
}

module.exports = { MODES, RESEARCH_DEPTH, classifyMode, researchDepth, shouldResearch, compileIntent };
