const WORKER_STATES = Object.freeze(['COLD','READY','WORKING','CHECKPOINTED','WAITING','COMPLETE','FAILED']);
const LOST_TIME = Object.freeze(['queue_starvation','dependency_wait','external_block','recovery','verification_wait','scheduler_gap','system_inefficiency']);
const EVIDENCE_KINDS = Object.freeze(['useful','control','scheduler','heartbeat','noop','lost']);

function assertRecord(record) {
  if (!record || !EVIDENCE_KINDS.includes(record.kind)) throw new Error('invalid evidence kind');
  if (!Number.isFinite(record.durationMs) || record.durationMs < 0) throw new Error('invalid durationMs');
  if (record.kind === 'lost' && !LOST_TIME.includes(record.reason)) throw new Error('invalid lost-time reason');
}

function summarizeEvidence(records) {
  const totals = { usefulMs: 0, controlMs: 0, schedulerMs: 0, heartbeatMs: 0, noopMs: 0, lostMs: 0, totalMs: 0, lostByReason: {} };
  for (const record of records) {
    assertRecord(record);
    totals.totalMs += record.durationMs;
    if (record.kind === 'useful') totals.usefulMs += record.durationMs;
    else if (record.kind === 'lost') {
      totals.lostMs += record.durationMs;
      totals.lostByReason[record.reason] = (totals.lostByReason[record.reason] || 0) + record.durationMs;
    } else totals[`${record.kind}Ms`] += record.durationMs;
  }
  totals.usefulCoverage = totals.totalMs === 0 ? 0 : totals.usefulMs / totals.totalMs;
  return totals;
}

class DisposableWorker {
  constructor({ workerId, taskId, checkpoint = null }) {
    if (!workerId || !taskId) throw new Error('workerId and taskId required');
    this.workerId = workerId;
    this.taskId = taskId;
    this.checkpoint = checkpoint;
    this.state = 'COLD';
    this.evidence = [];
  }
  coldStart() { this.state = 'READY'; return this.snapshot(); }
  begin() { if (!['READY','CHECKPOINTED','WAITING'].includes(this.state)) throw new Error('worker not runnable'); this.state = 'WORKING'; }
  record(record) { assertRecord(record); this.evidence.push({ ...record }); }
  persistCheckpoint(checkpoint) { if (this.state !== 'WORKING') throw new Error('checkpoint requires WORKING'); this.checkpoint = checkpoint; this.state = 'CHECKPOINTED'; return this.snapshot(); }
  wait(reason) { if (!LOST_TIME.includes(reason)) throw new Error('invalid wait reason'); this.state = 'WAITING'; }
  complete() { if (!['WORKING','CHECKPOINTED'].includes(this.state)) throw new Error('worker not completable'); this.state = 'COMPLETE'; return this.snapshot(); }
  fail() { this.state = 'FAILED'; return this.snapshot(); }
  snapshot() { return { workerId: this.workerId, taskId: this.taskId, checkpoint: this.checkpoint, state: this.state, evidence: this.evidence.map(x => ({ ...x })), summary: summarizeEvidence(this.evidence) }; }
  static restore(snapshot) { const w = new DisposableWorker(snapshot); w.state = snapshot.state === 'WORKING' ? 'CHECKPOINTED' : snapshot.state; w.evidence = (snapshot.evidence || []).map(x => ({ ...x })); return w; }
}

module.exports = { WORKER_STATES, LOST_TIME, EVIDENCE_KINDS, summarizeEvidence, DisposableWorker };
