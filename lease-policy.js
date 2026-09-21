const LEASE_TYPE = 'relay-job-lease';
const LEASE_VERSION = 1;

function parseLeaseComment(body) {
  try {
    const value = JSON.parse(String(body || ''));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (value.type !== LEASE_TYPE || value.version !== LEASE_VERSION) return null;
    if (!['acquired', 'heartbeat', 'released'].includes(value.event)) return null;
    if (!value.job_id || !value.lease_id || !value.owner_run_id) return null;
    return value;
  } catch {
    return null;
  }
}

function leaseRecords(comments = [], jobId = '') {
  return comments
    .map((comment, index) => ({
      record: parseLeaseComment(comment?.body),
      comment_id: comment?.id ?? null,
      created_at: comment?.created_at || '',
      index
    }))
    .filter(x => x.record && (!jobId || x.record.job_id === jobId))
    .sort((a, b) => {
      const at = Date.parse(a.created_at || a.record.recorded_at || 0) || 0;
      const bt = Date.parse(b.created_at || b.record.recorded_at || 0) || 0;
      if (at !== bt) return at - bt;
      const ai = Number(a.comment_id);
      const bi = Number(b.comment_id);
      if (Number.isFinite(ai) && Number.isFinite(bi) && ai !== bi) return ai - bi;
      return a.index - b.index;
    });
}

function latestLease(comments = [], jobId = '') {
  const records = leaseRecords(comments, jobId);
  if (!records.length) return null;
  const latest = records[records.length - 1].record;
  if (latest.event === 'released') return { ...latest, active: false, expired: false };
  return { ...latest, active: true };
}

function leaseStatus(comments = [], jobId = '', now = Date.now()) {
  const latest = latestLease(comments, jobId);
  if (!latest) return { active: false, expired: false, lease: null };
  if (!latest.active) return { active: false, expired: false, lease: latest };
  const expiry = Date.parse(latest.lease_expires_at || 0) || 0;
  const expired = expiry <= now;
  return { active: !expired, expired, lease: { ...latest, expired } };
}

function canAcquire(comments = [], jobId = '', ownerRunId = '', now = Date.now()) {
  const status = leaseStatus(comments, jobId, now);
  if (!status.active) return { ok: true, reclaimed: !!status.expired, previous: status.lease };
  if (status.lease.owner_run_id === ownerRunId) return { ok: true, resumed: true, reclaimed: false, previous: status.lease };
  return { ok: false, reason: 'LEASE_HELD', previous: status.lease };
}

function makeLeaseRecord({ event, jobId, leaseId, ownerRunId, issueNumber, ttlMs, now = Date.now(), previous = null }) {
  const recordedAt = new Date(now).toISOString();
  const base = {
    type: LEASE_TYPE,
    version: LEASE_VERSION,
    event,
    job_id: String(jobId || ''),
    lease_id: String(leaseId || ''),
    owner_run_id: String(ownerRunId || ''),
    issue_number: issueNumber ?? null,
    recorded_at: recordedAt
  };
  if (event !== 'released') base.lease_expires_at = new Date(now + ttlMs).toISOString();
  if (previous?.owner_run_id && previous.owner_run_id !== ownerRunId) {
    base.reclaimed_from_run_id = previous.owner_run_id;
    base.reclaimed_from_lease_id = previous.lease_id || '';
  }
  return base;
}

module.exports = {
  LEASE_TYPE,
  LEASE_VERSION,
  parseLeaseComment,
  leaseRecords,
  latestLease,
  leaseStatus,
  canAcquire,
  makeLeaseRecord
};
