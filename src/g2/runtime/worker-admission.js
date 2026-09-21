'use strict';

const ADMISSION = Object.freeze({
  RUN_SAME_WAKE: 'RUN_SAME_WAKE',
  WAIT_DEPENDENCY: 'WAIT_DEPENDENCY',
  WAIT_VERIFICATION: 'WAIT_VERIFICATION',
  BLOCKED_AUTHORITY: 'BLOCKED_AUTHORITY',
  BLOCKED_EXTERNAL: 'BLOCKED_EXTERNAL',
  NO_RUNNABLE_WORK: 'NO_RUNNABLE_WORK'
});

function admitWorker({ bootstrap_loaded, policy_loaded, work_order_loaded, authority_valid, claim_valid, runnable_work, dependency_blocked = false, verification_blocked = false, external_blocked = false } = {}) {
  if (!bootstrap_loaded || !policy_loaded || !work_order_loaded || !authority_valid || !claim_valid) {
    return { decision: ADMISSION.BLOCKED_AUTHORITY, same_wake: false };
  }
  if (external_blocked) return { decision: ADMISSION.BLOCKED_EXTERNAL, same_wake: false };
  if (dependency_blocked) return { decision: ADMISSION.WAIT_DEPENDENCY, same_wake: false };
  if (verification_blocked) return { decision: ADMISSION.WAIT_VERIFICATION, same_wake: false };
  if (!runnable_work) return { decision: ADMISSION.NO_RUNNABLE_WORK, same_wake: false };
  return { decision: ADMISSION.RUN_SAME_WAKE, same_wake: true };
}

function admitColdResume(input = {}) {
  if (!input.checkpoint_loaded) return { decision: ADMISSION.BLOCKED_AUTHORITY, same_wake: false };
  return admitWorker(input);
}

module.exports = { ADMISSION, admitWorker, admitColdResume };
