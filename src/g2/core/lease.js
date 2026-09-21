'use strict';

const LEASE_RECORD_TYPE = 'g2-lease';
const LEASE_VERSION = 1;
const EVENTS = new Set(['ACQUIRE', 'HEARTBEAT', 'RELEASE']);

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function makeLeaseRecord({ event, workId, leaseId, ownerId, ttlMs = 0, now = Date.now() }) {
  const normalizedEvent = String(event || '').toUpperCase();
  if (!EVENTS.has(normalizedEvent)) throw new Error('invalid lease event');
  const record = {
    type: LEASE_RECORD_TYPE,
    version: LEASE_VERSION,
    event: normalizedEvent,
    work_id: required(workId, 'workId'),
    lease_id: required(leaseId, 'leaseId'),
    owner_id: required(ownerId, 'ownerId'),
    recorded_at: new Date(now).toISOString()
  };
  if (normalizedEvent !== 'RELEASE') {
    const ttl = Number(ttlMs);
    if (!Number.isFinite(ttl) || ttl <= 0) throw new Error('ttlMs must be positive');
    record.expires_at = new Date(now + ttl).toISOString();
  }
  return Object.freeze(record);
}

function isLeaseRecord(value) {
  return !!value &&
    value.type === LEASE_RECORD_TYPE &&
    Number(value.version) === LEASE_VERSION &&
    EVENTS.has(String(value.event || '').toUpperCase()) &&
    !!value.work_id &&
    !!value.lease_id &&
    !!value.owner_id;
}

function latestLease(records = [], workId) {
  const relevant = records
    .filter(isLeaseRecord)
    .filter(record => !workId || record.work_id === workId)
    .sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
  return relevant.length ? relevant[relevant.length - 1] : null;
}

function leaseStatus(records = [], workId, now = Date.now()) {
  const latest = latestLease(records, workId);
  if (!latest || latest.event === 'RELEASE') {
    return { active: false, expired: false, lease: latest };
  }
  const expiresAt = Date.parse(latest.expires_at || '');
  const expired = !Number.isFinite(expiresAt) || expiresAt <= now;
  return { active: !expired, expired, lease: latest };
}

function canAcquire(records = [], workId, ownerId, now = Date.now()) {
  const status = leaseStatus(records, workId, now);
  if (!status.active) {
    return { ok: true, reclaimed: status.expired, previous: status.lease };
  }
  if (status.lease.owner_id === ownerId) {
    return { ok: true, resumed: true, reclaimed: false, previous: status.lease };
  }
  return { ok: false, reason: 'LEASE_HELD', previous: status.lease };
}

module.exports = {
  LEASE_RECORD_TYPE,
  LEASE_VERSION,
  makeLeaseRecord,
  isLeaseRecord,
  latestLease,
  leaseStatus,
  canAcquire
};
