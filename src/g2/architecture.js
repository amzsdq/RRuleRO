'use strict';

const G2_ARCHITECTURE_VERSION = 1;

const LAYERS = Object.freeze([
  'core',
  'scheduler',
  'worker',
  'foreman',
  'control-plane',
  'adapters'
]);

const RULE_CLASSES = Object.freeze([
  'INVARIANT',
  'CURRENT_DEFAULT',
  'COMPATIBILITY',
  'RETIRED'
]);

const WORKER_UTILIZATION_TARGET = Object.freeze({
  useful_minutes_per_hour_min: 50,
  useful_minutes_per_hour_max: 55,
  requires_sufficient_runnable_backlog: true,
  excludes_control_overhead: true,
  excludes_padding: true
});

const FOREMAN_PRIMARY_METRICS = Object.freeze([
  'aggregate_worker_useful_time',
  'runnable_backlog_starvation',
  'dispatch_latency',
  'avoidable_continuation_gap',
  'recovery_latency',
  'verification_latency',
  'duplicate_or_conflicting_work_rate'
]);

module.exports = {
  G2_ARCHITECTURE_VERSION,
  LAYERS,
  RULE_CLASSES,
  WORKER_UTILIZATION_TARGET,
  FOREMAN_PRIMARY_METRICS
};
