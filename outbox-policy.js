const { createHash } = require('node:crypto');

const ITEM_TYPE = 'relay-continuation-outbox';
const EVENT_TYPE = 'relay-continuation-outbox-event';
const VERSION = 1;

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function positiveIssue(value, name = 'issue') {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive issue number`);
  return n;
}

function stableOutboxId(intent = {}) {
  const root = String(intent.root_job_id || '').trim();
  const wakeKey = String(intent.wake_key || '').trim();
  const relayIssue = positiveIssue(intent.relay_issue_number, 'relay_issue_number');
  if (!root) throw new Error('root_job_id is required');
  if (!wakeKey) throw new Error('wake_key is required');
  return hash(JSON.stringify([root, wakeKey, relayIssue]));
}

function itemRecord(intent = {}, now = Date.now()) {
  const outboxId = String(intent.outbox_id || stableOutboxId(intent));
  return {
    type: ITEM_TYPE,
    version: VERSION,
    outbox_id: outboxId,
    root_job_id: String(intent.root_job_id || ''),
    milestone_id: String(intent.milestone_id || ''),
    wake_key: String(intent.wake_key || ''),
    relay_issue_number: positiveIssue(intent.relay_issue_number, 'relay_issue_number'),
    ref: String(intent.ref || 'main'),
    state: 'PENDING',
    created_at: new Date(now).toISOString()
  };
}

function eventRecord(outboxId, state, fields = {}, now = Date.now()) {
  const id = String(outboxId || '').trim();
  if (!id) throw new Error('outbox_id is required');
  const allowed = new Set(['CLAIMED', 'DISPATCHING', 'DISPATCHED', 'PENDING', 'RECONCILE_REQUIRED', 'DELIVERED', 'FAILED_TERMINAL', 'CANCELLED']);
  if (!allowed.has(state)) throw new Error(`unsupported outbox state: ${state}`);
  const record = {
    type: EVENT_TYPE,
    version: VERSION,
    outbox_id: id,
    state,
    run_id: String(fields.run_id || ''),
    error_code: String(fields.error_code || ''),
    detail: String(fields.detail || '').slice(0, 1000),
    recorded_at: new Date(now).toISOString()
  };
  if (state === 'CLAIMED') {
    record.claim_token = String(fields.claim_token || fields.run_id || '');
    record.claim_expires_at = String(fields.claim_expires_at || '');
  }
  return record;
}

function parseRecord(body) {
  try {
    const value = JSON.parse(String(body || ''));
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    if (value.type !== ITEM_TYPE && value.type !== EVENT_TYPE) return null;
    return value;
  } catch {
    return null;
  }
}

function aggregate(comments = []) {
  const items = new Map();
  for (const comment of comments) {
    const record = parseRecord(comment?.body);
    if (!record?.outbox_id) continue;
    if (record.type === ITEM_TYPE) {
      if (!items.has(record.outbox_id)) items.set(record.outbox_id, { ...record, events: [] });
      continue;
    }
    const current = items.get(record.outbox_id);
    if (!current) continue;
    current.events.push(record);
    current.state = record.state;
    current.last_event = record;
  }
  return items;
}

function dispatchable(item) {
  return !!item && item.state === 'PENDING';
}

function claimable(item, runId, now = Date.now()) {
  if (!item) return false;
  if (item.state === 'PENDING') return true;
  if (item.state !== 'CLAIMED') return false;
  const claim = item.last_event || {};
  if (String(claim.run_id || '') === String(runId || '')) return true;
  const expires = Date.parse(String(claim.claim_expires_at || ''));
  return Number.isFinite(expires) && expires <= Number(now);
}

function sameAuthoritativePayload(a = {}, b = {}) {
  return String(a.root_job_id || '') === String(b.root_job_id || '') &&
    String(a.milestone_id || '') === String(b.milestone_id || '') &&
    String(a.wake_key || '') === String(b.wake_key || '') &&
    Number(a.relay_issue_number) === Number(b.relay_issue_number) &&
    String(a.ref || 'main') === String(b.ref || 'main');
}

function outcomeState(jobState) {
  if (jobState === 'AWAITING_WORK_ACK') return 'DELIVERED';
  if (jobState === 'RECONCILE_REQUIRED') return 'RECONCILE_REQUIRED';
  if (jobState === 'TERMINAL_INVALID') return 'FAILED_TERMINAL';
  if (jobState === 'RETRY_WAIT') return 'PENDING';
  if (jobState === 'REPAIR_REQUIRED') return 'RECONCILE_REQUIRED';
  return '';
}

module.exports = {
  ITEM_TYPE,
  EVENT_TYPE,
  VERSION,
  stableOutboxId,
  itemRecord,
  eventRecord,
  parseRecord,
  aggregate,
  dispatchable,
  claimable,
  sameAuthoritativePayload,
  outcomeState
};
