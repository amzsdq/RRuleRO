const { summarizeEvidence } = require('./runtime');

function interruptionLoss(policy, workload, envelopeIndex, useful) {
  const interruptions = workload.interruptions || [];
  const hit = interruptions.find(x => x.envelopeIndex === envelopeIndex);
  if (!hit) return 0;
  const elapsed = Math.max(0, Math.min(useful, hit.afterUsefulMs));
  const durableInterval = policy.durableCheckpointIntervalMs || policy.envelopeMs;
  return elapsed % durableInterval;
}

function simulatePolicy(policy, workload) {
  const evidence = [];
  let remaining = workload.usefulMs;
  let envelopes = 0;
  let recoveryRequired = 0;
  let replayedUsefulMs = 0;
  while (remaining > 0) {
    envelopes += 1;
    const useful = Math.min(policy.envelopeMs, remaining);
    evidence.push({ kind: 'useful', durationMs: useful });
    remaining -= useful;

    const lostUseful = interruptionLoss(policy, workload, envelopes, useful);
    if (lostUseful > 0) {
      recoveryRequired += 1;
      replayedUsefulMs += lostUseful;
      evidence.push({ kind: 'lost', reason: 'recovery', durationMs: (policy.recoveryOverheadMs || 0) + lostUseful });
    }

    if (remaining > 0) {
      evidence.push({ kind: 'control', durationMs: policy.checkpointOverheadMs });
      evidence.push({ kind: 'scheduler', durationMs: policy.continuationOverheadMs });
      evidence.push({ kind: 'lost', reason: 'scheduler_gap', durationMs: policy.continuationGapMs });
    }
  }
  return { policy: policy.name, envelopes, recoveryRequired, replayedUsefulMs, evidence, summary: summarizeEvidence(evidence) };
}

function score(result) {
  return {
    usefulCoverage: result.summary.usefulCoverage,
    overheadMs: result.summary.controlMs + result.summary.schedulerMs,
    schedulerGapMs: result.summary.lostByReason.scheduler_gap || 0,
    recoveryLossMs: result.summary.lostByReason.recovery || 0,
    recoveryRequired: result.recoveryRequired
  };
}

function comparePolicies(a, b, workload) {
  const A = simulatePolicy(a, workload);
  const B = simulatePolicy(b, workload);
  A.score = score(A);
  B.score = score(B);

  const safetyRegression = B.score.recoveryLossMs > A.score.recoveryLossMs || B.score.recoveryRequired > A.score.recoveryRequired;
  const efficiencyImprovement = B.score.usefulCoverage > A.score.usefulCoverage && B.score.overheadMs < A.score.overheadMs && B.score.schedulerGapMs <= A.score.schedulerGapMs;
  const verdict = efficiencyImprovement && !safetyRegression ? 'PROMOTE_B' : 'INCONCLUSIVE';

  return {
    hypothesis: 'larger safe work envelopes may reduce continuation/control overhead, but only if interruption/recovery exposure does not regress',
    metrics: ['usefulCoverage','overheadMs','schedulerGapMs','recoveryLossMs','recoveryRequired'],
    promotionCriterion: 'candidate must improve useful coverage and overhead with no scheduler-gap or recovery regression; otherwise INCONCLUSIVE',
    verdict,
    A,
    B
  };
}

module.exports = { simulatePolicy, comparePolicies };
