'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { workerAdmission } = require('../src/g2/runtime');

const ready = { bootstrap_loaded: true, policy_loaded: true, work_order_loaded: true, authority_valid: true, claim_valid: true, runnable_work: true };

test('ready Worker starts useful work in the same wake', () => {
  const result = workerAdmission.admitWorker(ready);
  assert.equal(result.decision, workerAdmission.ADMISSION.RUN_SAME_WAKE);
  assert.equal(result.same_wake, true);
});

test('bootstrap readiness alone never creates an artificial READY-only turn', () => {
  assert.equal(workerAdmission.admitWorker({ ...ready, runnable_work: false }).decision, workerAdmission.ADMISSION.NO_RUNNABLE_WORK);
  assert.equal(workerAdmission.admitWorker({ ...ready, dependency_blocked: true }).decision, workerAdmission.ADMISSION.WAIT_DEPENDENCY);
  assert.equal(workerAdmission.admitWorker({ ...ready, verification_blocked: true }).decision, workerAdmission.ADMISSION.WAIT_VERIFICATION);
});

test('invalid authority blocks substantive work', () => {
  const result = workerAdmission.admitWorker({ ...ready, authority_valid: false });
  assert.equal(result.decision, workerAdmission.ADMISSION.BLOCKED_AUTHORITY);
  assert.equal(result.same_wake, false);
});

test('cold resume also starts same wake after checkpoint and authority load', () => {
  assert.equal(workerAdmission.admitColdResume({ ...ready, checkpoint_loaded: true }).decision, workerAdmission.ADMISSION.RUN_SAME_WAKE);
  assert.equal(workerAdmission.admitColdResume({ ...ready, checkpoint_loaded: false }).decision, workerAdmission.ADMISSION.BLOCKED_AUTHORITY);
});
