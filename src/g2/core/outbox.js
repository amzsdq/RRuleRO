'use strict';

const { createHash } = require('node:crypto');

const ITEM_TYPE = 'g2-outbox-item';
const EVENT_TYPE = 'g2-outbox-event';
const VERSION = 1;

function hash(value) {
  return createHash('sha256').update(String(value)).digest('hex');
}

function required(value, name) {
  const text = String(value || '').trim();
  if (!text) throw new Error(`${name} is required`);
  return text;
}

function stableOutboxId(intent = {}) {
  return hash(JSON.stringify([
    required(intent.root_job_id, 'root_job_id'),
    required(intent.wake_key, 'wake_key'),
    required(intent.destination_key, 'destination_key')
  ]));
}

function itemRecord(intent = {}, now = Date.now()) {
  return Object.freeze({
    type: ITEM_TYPE,
    version: VERSION,
    outbox_id: String(intent.outbox_id || stableOutboxId(intent)),
    root_job_id: required(intent.root_job_id, 'root_job_id'),
    objective_id: String(intent.objective_id || ''),
    wake_key: required(intent.wake_key, 'wake_key'),
    destination_key: required(intent.destination_key, 'destination_key'),
    state: 'PENDING',
    created_at: new Date(now).toISOString()
  });
}

function eventRecord(outboxId, state, fields = {}, now = Date.now()) {
  const allowed = new Set([
    'CLAIMED', 'DISPATCHING', 'DISPATCHED', 'PENDING',
    'RECONCILE_REQUIRED', 'DELIVERED', 'FAILED_TERMINAL', 'CANCELLED'
  ]);
  const normalized = String(state || '').toUpperCase();
  if (!allowed.has(normalized)) throw new Error('unsupported outbox state');
  const record = {
    type: EVENT_TYPE,
    version: VERSION,
    outbox_id: required(outboxId, 'outbox_id'),
    state: normalized,
    actor_id: String(fields.actor_id || ''),
    error_code: String(fields.error_code || ''),
    detail: String(fields.detail || '').slice(0, 1000),
    recorded_at: new Date(now).toISOString()
  };
  if (normalized === 'CLAIMED') {
    record.claim_token = String(fields.claim_token || fields.actor_id || '');
    record.claim_expires_at = String(fields.claim_expires_at || '');
  }
  return Object.freeze(record);
}

function aggregate(records = []) {
  const items = new Map();
  for (const record of records) {
    if (!record || !record.outbox_id) continue;
    if (record.type === ITEM_TYPE) {
      if (!items.has(record.outbox_id)) items.set(record.outbox_id, { ...record, events: [] });
      continue;
    }
    if (record.type !== EVENT_TYPE) continue;
    const current = items.get(record.outbox_id);
    if (!current) continue;
    current.events.push(record);
    current.state = record.state;
    current.last_event = record;
  }
  return items;
}

function claimable(item, actorId, now = Date.now()) {
  if (!item) return false;
  if (item.state === 'PENDING') return true;
  if (item.state !== 'CLAIMED') return false;
  const claim = item.last_event || {};
  if (String(claim.actor_id || '') === String(actorId || '')) return true;
  const expiry = Date.parse(String(claim.claim_expires_at || ''));
  return Number.isFinite(expiry) && expiry <= now;
}

module.exports = {
  ITEM_TYPE,
  EVENT_TYPE,
  VERSION,
  stableOutboxId,
  itemRecord,
  eventRecord,
  aggregate,
  claimable
};
