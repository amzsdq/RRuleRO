const { summarizeEvidence } = require('./runtime');

function simulatePolicy(policy, workload) {
  const evidence = [];
  let remaining = workload.usefulMs;
  let envelopes = 0;
  while (remaining > 0) {
    envelopes += 1;
    const useful = Math.min(policy.envelopeMs, remaining);
    evidence.push({ kind: 'useful', durationMs: useful });
    remaining -= useful;
    if (remaining > 0) {
      evidence.push({ kind: 'control', durationMs: policy.checkpointOverheadMs });
      evidence.push({ kind: 'scheduler', durationMs: policy.continuationOverheadMs });
      evidence.push({ kind: 'lost', reason: 'scheduler_gap', durationMs: policy.continuationGapMs });
    }
  }
  return { policy: policy.name, envelopes, evidence, summary: summarizeEvidence(evidence) };
}

function comparePolicies(a, b, workload) {
  const A = simulatePolicy(a, workload);
  const B = simulatePolicy(b, workload);
  const score = x => ({ usefulCoverage: x.summary.usefulCoverage, overheadMs: x.summary.controlMs + x.summary.schedulerMs, schedulerGapMs: x.summary.lostByReason.scheduler_gap || 0 });
  return { hypothesis: 'larger safe work envelopes reduce continuation/control overhead without changing safety invariants', metrics: ['usefulCoverage','overheadMs','schedulerGapMs'], promotionCriterion: 'candidate must improve usefulCoverage and not increase schedulerGapMs for identical workload', A: { ...A, score: score(A) }, B: { ...B, score: score(B) } };
}

module.exports = { simulatePolicy, comparePolicies };
