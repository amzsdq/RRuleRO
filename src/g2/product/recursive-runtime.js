'use strict';

const recursive = require('./recursive');
const evaluator = require('./throughput-evaluator');

function startExperiment(candidates, options = {}) {
  const selection = recursive.selectImprovement(candidates, options);
  if (selection.action === 'DO_NOTHING') {
    return Object.freeze({ state: 'NO_CHANGE', selection, stable_ref: String(options.stable_ref || ''), experimental_ref: null });
  }
  const stable = String(options.stable_ref || '').trim();
  const experimental = String(options.experimental_ref || '').trim();
  if (!stable || !experimental) throw new Error('stable_ref and experimental_ref required for experiment');
  if (stable === experimental) throw new Error('experimental_ref must differ from stable_ref');
  return Object.freeze({ state: 'EXPERIMENTAL', selection, stable_ref: stable, experimental_ref: experimental });
}

function evaluateExperiment(experiment, baseline, candidate, options = {}) {
  if (!experiment || experiment.state !== 'EXPERIMENTAL') throw new Error('active experimental candidate required');
  const evaluation = evaluator.compareThroughput(baseline, candidate, options);
  const terminal = {
    ADOPT: 'PROMOTE',
    REVISE: 'REVISE',
    REJECT: 'REJECT',
    ROLLBACK: 'ROLLBACK',
    DO_NOTHING: 'REJECT'
  }[evaluation.decision];
  return Object.freeze({
    ...experiment,
    state: terminal,
    evaluation,
    promoted_ref: terminal === 'PROMOTE' ? experiment.experimental_ref : experiment.stable_ref,
    rollback_ref: terminal === 'ROLLBACK' ? experiment.stable_ref : null
  });
}

module.exports = { startExperiment, evaluateExperiment };
