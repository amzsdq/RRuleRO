'use strict';

const RECOVERY_ACTIONS = Object.freeze({
  HEALTHY: 'HEALTHY',
  RECLAIM_EXPIRED: 'RECLAIM_EXPIRED',
  RESUME_CHECKPOINT: 'RESUME_CHECKPOINT',
  BLOCKED_EXTERNAL: 'BLOCKED_EXTERNAL'
});

function isoMillis(value, field) {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) throw new Error(`${field} must be an ISO timestamp`);
  return ms;
}

function assessLiveness({ claim, checkpoint = null, now = Date.now(), checkpoint_stale_ms = 300000 } = {}) {
  if (!claim || !claim.work_id || !claim.worker_id) throw new Error('claim with work_id and worker_id is required');
  if (!Number.isFinite(now)) throw new Error('now must be finite');
  if (!Number.isFinite(checkpoint_stale_ms) || checkpoint_stale_ms <= 0) throw new Error('checkpoint_stale_ms must be positive');

  const leaseExpiry = isoMillis(claim.expires_at, 'claim.expires_at');
  if (leaseExpiry <= now) {
    return Object.freeze({ action: RECOVERY_ACTIONS.RECLAIM_EXPIRED, reason: 'LEASE_EXPIRED', work_id: claim.work_id });
  }

  if (!checkpoint) {
    return Object.freeze({ action: RECOVERY_ACTIONS.HEALTHY, reason: 'ACTIVE_LEASE_NO_CHECKPOINT_YET', work_id: claim.work_id });
  }

  const checkpointAt = isoMillis(checkpoint.checkpoint_at, 'checkpoint.checkpoint_at');
  if (checkpointAt + checkpoint_stale_ms <= now) {
    return Object.freeze({ action: RECOVERY_ACTIONS.RESUME_CHECKPOINT, reason: 'CHECKPOINT_STALE', work_id: claim.work_id });
  }

  return Object.freeze({ action: RECOVERY_ACTIONS.HEALTHY, reason: 'LEASE_AND_CHECKPOINT_FRESH', work_id: claim.work_id });
}

function recoveryPlan({ assessment, checkpoint = null } = {}) {
  if (!assessment || !assessment.action) throw new Error('assessment is required');
  if (assessment.action === RECOVERY_ACTIONS.RECLAIM_EXPIRED) {
    return Object.freeze({ release_claim: true, requeue: true, resume_checkpoint: false, work_id: assessment.work_id });
  }
  if (assessment.action === RECOVERY_ACTIONS.RESUME_CHECKPOINT) {
    if (!checkpoint) throw new Error('checkpoint is required for resume');
    return Object.freeze({ release_claim: false, requeue: false, resume_checkpoint: true, work_id: assessment.work_id, checkpoint });
  }
  return Object.freeze({ release_claim: false, requeue: false, resume_checkpoint: false, work_id: assessment.work_id });
}

module.exports = { RECOVERY_ACTIONS, assessLiveness, recoveryPlan };
