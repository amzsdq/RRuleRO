'use strict';

const DEFAULT_DOM_GRACE_MS = 1500;
const DEFAULT_SERVER_POLL_MS = 1000;

function authoritativeConflict(seen) {
  return !!(seen && seen.found && seen.ok === false && seen.status === 'DELIVERY_ID_CONFLICT');
}

function authoritativeServerConflict(seen) {
  return !!(seen && seen.server_authoritative === true && authoritativeConflict(seen));
}

function exactDom(seen) {
  return !!(seen && seen.found && seen.ok === true);
}

function exactServer(seen) {
  return !!(seen && seen.server_authoritative === true && seen.found && seen.ok === true);
}

function classifyReceiptRound(domSeen, serverSeen) {
  // Conflict evidence always dominates success evidence from the same bounded round.
  if (authoritativeConflict(domSeen)) return { state: 'CONFLICT', source: 'dom', seen: domSeen };
  if (authoritativeServerConflict(serverSeen)) return { state: 'CONFLICT', source: 'server', seen: serverSeen };
  if (exactServer(serverSeen)) return { state: 'EXACT', source: 'server', seen: serverSeen };
  if (exactDom(domSeen)) return { state: 'EXACT', source: 'dom', seen: domSeen };
  return { state: 'PENDING' };
}

function shouldReadServer({ fast, target, elapsedMs, domGraceMs = DEFAULT_DOM_GRACE_MS }) {
  return fast !== true && typeof target === 'string' && target !== 'new' && elapsedMs >= domGraceMs;
}

module.exports = {
  DEFAULT_DOM_GRACE_MS,
  DEFAULT_SERVER_POLL_MS,
  authoritativeConflict,
  authoritativeServerConflict,
  exactDom,
  exactServer,
  classifyReceiptRound,
  shouldReadServer
};
