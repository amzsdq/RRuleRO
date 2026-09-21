const test = require('node:test');
const assert = require('node:assert/strict');
const {
  DEFAULT_DOM_GRACE_MS,
  classifyReceiptRound,
  shouldReadServer
} = require('../receipt-verification-policy');

const exact = { found: true, ok: true, status: 'OK' };
const conflict = { found: true, ok: false, status: 'DELIVERY_ID_CONFLICT' };
const serverExact = { ...exact, server_authoritative: true };
const serverConflict = { ...conflict, server_authoritative: true };

test('authoritative conflict dominates exact evidence in the same bounded round', () => {
  assert.deepEqual(classifyReceiptRound(exact, serverConflict), {
    state: 'CONFLICT',
    source: 'server',
    seen: serverConflict
  });
});

test('authoritative server exact may verify a local false negative', () => {
  assert.deepEqual(classifyReceiptRound({ found: false, ok: false }, serverExact), {
    state: 'EXACT',
    source: 'server',
    seen: serverExact
  });
});

test('no exact or conflict evidence remains pending', () => {
  assert.deepEqual(classifyReceiptRound({ found: false }, { found: false }), { state: 'PENDING' });
});

test('server verification waits for grace and is skipped for fast/new targets', () => {
  assert.equal(shouldReadServer({ fast: false, target: 'synthetic-existing-target', elapsedMs: DEFAULT_DOM_GRACE_MS - 1 }), false);
  assert.equal(shouldReadServer({ fast: false, target: 'synthetic-existing-target', elapsedMs: DEFAULT_DOM_GRACE_MS }), true);
  assert.equal(shouldReadServer({ fast: true, target: 'synthetic-existing-target', elapsedMs: 99999 }), false);
  assert.equal(shouldReadServer({ fast: false, target: 'new', elapsedMs: 99999 }), false);
});
