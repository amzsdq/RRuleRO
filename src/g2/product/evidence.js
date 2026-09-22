'use strict';

function required(value, name) {
  const result = String(value || '').trim();
  if (!result) throw new Error(`${name} is required`);
  return result;
}

function normalizeEvidence(items = []) {
  if (!Array.isArray(items)) throw new Error('evidence must be an array');
  return Object.freeze(items.map((item, index) => Object.freeze({
    id: required(item && (item.id || `evidence-${index + 1}`), 'evidence.id'),
    source: required(item && item.source, 'evidence.source'),
    claim: required(item && item.claim, 'evidence.claim'),
    authority: String((item && item.authority) || 'SECONDARY').trim().toUpperCase(),
    current: item && item.current !== false,
    supports: Array.isArray(item && item.supports) ? Object.freeze(item.supports.map(String).filter(Boolean)) : Object.freeze([])
  })));
}

function evidenceSummary(items = []) {
  const evidence = normalizeEvidence(items);
  return Object.freeze({
    count: evidence.length,
    refs: Object.freeze(evidence.map((x) => x.id)),
    current_count: evidence.filter((x) => x.current).length,
    primary_count: evidence.filter((x) => ['PRIMARY', 'OFFICIAL'].includes(x.authority)).length
  });
}

function requireResearchEvidence(intake, items = []) {
  const evidence = normalizeEvidence(items);
  if (intake && intake.research_required === true && evidence.length === 0) {
    throw new Error('research_required intake needs evidence before planning');
  }
  return evidence;
}

module.exports = { normalizeEvidence, evidenceSummary, requireResearchEvidence };
