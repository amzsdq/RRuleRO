'use strict';

const { normalizeWorkItem, runnableQueue } = require('./controller');

const QUEUE_STATUS = 'FOREMAN_QUEUE';

function queueId(value) {
  const id = String(value || '').trim();
  if (!id) throw new Error('queue_id is required');
  return id;
}

function normalizeQueueCheckpoint(input = {}) {
  const items = Array.isArray(input.items) ? input.items.map(normalizeWorkItem) : [];
  const claims = Array.isArray(input.claims) ? input.claims.map(claim => Object.freeze({
    work_id: String(claim.work_id || '').trim(),
    worker_id: String(claim.worker_id || '').trim(),
    claim_generation: Number(claim.claim_generation),
    expires_at: String(claim.expires_at || '').trim()
  })) : [];
  if (claims.some(x => !x.work_id || !x.worker_id || !Number.isSafeInteger(x.claim_generation) || x.claim_generation < 0 || !Number.isFinite(Date.parse(x.expires_at)))) {
    throw new Error('invalid durable claim');
  }
  return Object.freeze({ items: Object.freeze(items), claims: Object.freeze(claims) });
}

function createDurableForemanQueue({ durable_state, queue_id, subject_sha } = {}) {
  if (!durable_state || typeof durable_state.read !== 'function' || typeof durable_state.commit !== 'function') {
    throw new Error('durable_state read/commit adapter is required');
  }
  const logicalId = queueId(queue_id);
  const subject = String(subject_sha || '').trim();
  if (!subject) throw new Error('subject_sha is required');

  async function load() {
    const loaded = await durable_state.read(logicalId);
    if (!loaded.record) return Object.freeze({ version: null, generation: 0, checkpoint: normalizeQueueCheckpoint() });
    if (loaded.record.status !== QUEUE_STATUS) throw new Error('durable record is not a Foreman queue');
    if (loaded.record.subject_sha !== subject) throw new Error('Foreman queue subject mismatch');
    return Object.freeze({
      version: loaded.version,
      generation: loaded.record.generation,
      checkpoint: normalizeQueueCheckpoint(loaded.record.checkpoint)
    });
  }

  async function save(checkpointInput, { expected_version = null, generation = 0 } = {}) {
    const checkpoint = normalizeQueueCheckpoint(checkpointInput);
    return durable_state.commit({
      logical_id: logicalId,
      generation,
      subject_sha: subject,
      status: QUEUE_STATUS,
      checkpoint,
      durable_refs: []
    }, { expected_version });
  }

  async function enqueue(itemInput) {
    const current = await load();
    const item = normalizeWorkItem(itemInput);
    if (current.checkpoint.items.some(x => x.work_id === item.work_id)) throw new Error('work_id already exists');
    return save({
      items: [...current.checkpoint.items, item],
      claims: current.checkpoint.claims
    }, { expected_version: current.version, generation: current.generation });
  }

  async function claimNext({ worker_id, now = Date.now(), lease_ms = 300000, current_subject_sha = subject } = {}) {
    const worker = String(worker_id || '').trim();
    if (!worker) throw new Error('worker_id is required');
    if (!Number.isFinite(lease_ms) || lease_ms <= 0) throw new Error('lease_ms must be positive');
    const current = await load();
    const activeClaims = current.checkpoint.claims.filter(claim => Date.parse(claim.expires_at) > now);
    const claimedIds = new Set(activeClaims.map(x => x.work_id));
    const candidates = runnableQueue(
      current.checkpoint.items.filter(item => !claimedIds.has(item.work_id)),
      { current_subject_sha }
    );
    if (!candidates.length) return Object.freeze({ claimed: null, version: current.version });

    const selected = candidates[0];
    const items = current.checkpoint.items.map(item => item.work_id === selected.work_id
      ? normalizeWorkItem({ ...item, state: 'CLAIMED' })
      : item);
    const claim = Object.freeze({
      work_id: selected.work_id,
      worker_id: worker,
      claim_generation: selected.generation,
      expires_at: new Date(now + lease_ms).toISOString()
    });
    const saved = await save({ items, claims: [...activeClaims, claim] }, {
      expected_version: current.version,
      generation: current.generation
    });
    return Object.freeze({ claimed: selected, claim, version: saved.version });
  }

  return Object.freeze({ load, save, enqueue, claimNext });
}

module.exports = { QUEUE_STATUS, normalizeQueueCheckpoint, createDurableForemanQueue };
