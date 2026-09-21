'use strict';

const DEFAULT_AUTHORITATIVE_GRACE_MS = 1500;

function isConflict(evidence) {
  return !!evidence &&
    evidence.found === true &&
    evidence.ok === false &&
    evidence.status === 'IDENTITY_CONFLICT';
}

function isExact(evidence) {
  return !!evidence && evidence.found === true && evidence.ok === true;
}

function classifyEvidence(localEvidence, authoritativeEvidence) {
  if (authoritativeEvidence?.authoritative === true && isConflict(authoritativeEvidence)) {
    return { state: 'CONFLICT', source: 'authoritative', evidence: authoritativeEvidence };
  }
  if (isConflict(localEvidence)) {
    return { state: 'CONFLICT', source: 'local', evidence: localEvidence };
  }
  if (authoritativeEvidence?.authoritative === true && isExact(authoritativeEvidence)) {
    return { state: 'EXACT', source: 'authoritative', evidence: authoritativeEvidence };
  }
  if (isExact(localEvidence)) {
    return { state: 'EXACT', source: 'local', evidence: localEvidence };
  }
  return { state: 'PENDING' };
}

function shouldQueryAuthoritative({
  fast_path: fastPath,
  target_kind: targetKind,
  elapsed_ms: elapsedMs,
  grace_ms: graceMs = DEFAULT_AUTHORITATIVE_GRACE_MS
} = {}) {
  return fastPath !== true &&
    targetKind === 'EXISTING' &&
    Number(elapsedMs) >= Number(graceMs);
}

module.exports = {
  DEFAULT_AUTHORITATIVE_GRACE_MS,
  isConflict,
  isExact,
  classifyEvidence,
  shouldQueryAuthoritative
};
