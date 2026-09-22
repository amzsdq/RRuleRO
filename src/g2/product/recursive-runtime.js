'use strict';

const recursive = require('./recursive');
const evaluator = require('./throughput-evaluator');

function startExperiment(candidates, options = {}) {
  const selection = recursive.selectImprovement(candidates, options);
  if (selection.action === 'DO_NOTHING') return Object.freeze({ state: 'NO_CHANGE', selection, stable_ref: String(options.stable_ref || ''), experimental_ref: null });
  const stable = String(options.stable_ref || '').trim(); const experimental = String(options.experimental_ref || '').trim();
  if (!stable || !experimental) throw new Error('stable_ref and experimental_ref required for experiment');
  if (stable === experimental) throw new Error('experimental_ref must differ from stable_ref');
  return Object.freeze({ state: 'EXPERIMENTAL', selection, stable_ref: stable, experimental_ref: experimental });
}

function evaluateExperiment(experiment, baseline, candidate, options = {}) {
  if (!experiment || experiment.state !== 'EXPERIMENTAL') throw new Error('active experimental candidate required');
  const evaluation = evaluator.compareThroughput(baseline, candidate, options);
  const terminal = { ADOPT: 'PROMOTE', REVISE: 'REVISE', REJECT: 'REJECT', ROLLBACK: 'ROLLBACK', DO_NOTHING: 'REJECT' }[evaluation.decision];
  return Object.freeze({ ...experiment, state: terminal, evaluation, promoted_ref: terminal === 'PROMOTE' ? experiment.experimental_ref : experiment.stable_ref, rollback_ref: terminal === 'ROLLBACK' ? experiment.stable_ref : null });
}

function requiredFunction(value, name) { if (typeof value !== 'function') throw new Error(`${name} is required`); return value; }

async function runImprovementCycle(hooks = {}, options = {}) {
  const observe = requiredFunction(hooks.observe, 'observe'); const generateCandidates = requiredFunction(hooks.generateCandidates, 'generateCandidates'); const implement = requiredFunction(hooks.implement, 'implement'); const measure = requiredFunction(hooks.measure, 'measure');
  const observation = await observe(); const candidates = await generateCandidates(observation);
  if (!Array.isArray(candidates)) throw new Error('generateCandidates must return an array');
  const selection = recursive.selectImprovement(candidates, options);
  if (selection.action === 'DO_NOTHING') return Object.freeze({ state: 'NO_CHANGE', observation, selection, experiment: null, result: null });
  const implementation = await implement(selection.candidate, observation);
  if (!implementation || typeof implementation !== 'object') throw new Error('implement must return experiment refs');
  const experiment = startExperiment([selection.candidate], { ...options, stable_ref: implementation.stable_ref, experimental_ref: implementation.experimental_ref });
  const measured = await measure({ observation, selection, implementation, experiment });
  if (!measured || !measured.baseline || !measured.candidate) throw new Error('measure must return baseline and candidate samples');
  const result = evaluateExperiment(experiment, measured.baseline, measured.candidate, options.evaluator || {});
  return Object.freeze({ state: result.state, observation, selection, experiment, result });
}

async function runAppliedImprovementCycle(hooks = {}, options = {}) {
  const cycle = await runImprovementCycle(hooks, options);
  if (cycle.state === 'NO_CHANGE') return Object.freeze({ ...cycle, application: null });
  const applyDecision = requiredFunction(hooks.applyDecision, 'applyDecision');
  const application = await applyDecision({ state: cycle.state, result: cycle.result, selection: cycle.selection, observation: cycle.observation });
  if (!application || application.verified !== true) throw new Error('applyDecision must return independently verified application evidence');
  const expectedRef = cycle.state === 'PROMOTE' || cycle.state === 'ROLLBACK' ? cycle.result.promoted_ref : cycle.result.stable_ref;
  if (String(application.active_ref || '') !== String(expectedRef || '')) throw new Error('applied active_ref does not match evaluated decision');
  return Object.freeze({ ...cycle, application: Object.freeze({ ...application }) });
}

module.exports = { startExperiment, evaluateExperiment, runImprovementCycle, runAppliedImprovementCycle };
