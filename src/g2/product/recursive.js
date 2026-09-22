'use strict';

const ACTIONS = Object.freeze(['ADD', 'MODIFY', 'SIMPLIFY', 'REMOVE', 'DO_NOTHING']);

function candidate(input = {}) {
  const action = String(input.action || '').trim();
  if (!ACTIONS.includes(action)) throw new Error('unknown improvement action');
  const expected_benefit = Number(input.expected_benefit || 0);
  const control_cost = Number(input.control_cost || 0);
  const risk_cost = Number(input.risk_cost || 0);
  if (![expected_benefit, control_cost, risk_cost].every(Number.isFinite)) throw new Error('candidate scores must be finite');
  return Object.freeze({
    action,
    expected_benefit,
    control_cost,
    risk_cost,
    removes_runtime_bottleneck: input.removes_runtime_bottleneck === true,
    measurable_outcome: String(input.measurable_outcome || '').trim(),
    meta_only: input.meta_only === true
  });
}

function netValue(value) {
  const c = candidate(value);
  return c.expected_benefit - c.control_cost - c.risk_cost;
}

function selectImprovement(candidates = [], options = {}) {
  const normalized = candidates.map(candidate);
  const substantiveRunnable = options.substantive_work_runnable === true;

  const eligible = normalized.filter((x) => {
    if (!x.measurable_outcome) return false;
    if (netValue(x) <= 0) return false;
    if (substantiveRunnable && x.meta_only && !x.removes_runtime_bottleneck) return false;
    return true;
  });

  if (!eligible.length) return Object.freeze({ action: 'DO_NOTHING', reason: 'NO_POSITIVE_EXTERNAL_VALUE' });

  eligible.sort((a, b) => {
    if (a.removes_runtime_bottleneck !== b.removes_runtime_bottleneck) return a.removes_runtime_bottleneck ? -1 : 1;
    return netValue(b) - netValue(a);
  });

  return Object.freeze({ action: eligible[0].action, reason: 'HIGHEST_NET_EXTERNAL_VALUE', candidate: eligible[0] });
}

module.exports = { ACTIONS, candidate, netValue, selectImprovement };
