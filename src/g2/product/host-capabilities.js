'use strict';

const CAPABILITIES = Object.freeze({
  DURABLE_VERSIONED_STORAGE: 'durable_versioned_storage',
  VERIFIED_WAKE: 'verified_wake',
  RESEARCH: 'research'
});

function bool(value) { return value === true; }

function normalizeHostCapabilities(input = {}) {
  return Object.freeze({
    durable_versioned_storage: bool(input.durable_versioned_storage),
    verified_wake: bool(input.verified_wake),
    research: bool(input.research),
    storage_mapping: String(input.storage_mapping || '').trim() || null,
    wake_mapping: String(input.wake_mapping || '').trim() || null,
    research_mapping: String(input.research_mapping || '').trim() || null
  });
}

function requiredCapabilities({ unattended = true, research_required = false } = {}) {
  const required = [CAPABILITIES.DURABLE_VERSIONED_STORAGE];
  if (unattended) required.push(CAPABILITIES.VERIFIED_WAKE);
  if (research_required) required.push(CAPABILITIES.RESEARCH);
  return Object.freeze(required);
}

function assessHostCapabilities(input = {}, options = {}) {
  const capabilities = normalizeHostCapabilities(input);
  const required = requiredCapabilities(options);
  const missing = required.filter((name) => capabilities[name] !== true);
  const missing_mappings = [];
  if (capabilities.durable_versioned_storage && !capabilities.storage_mapping) missing_mappings.push('storage_mapping');
  if (options.unattended !== false && capabilities.verified_wake && !capabilities.wake_mapping) missing_mappings.push('wake_mapping');
  if (options.research_required === true && capabilities.research && !capabilities.research_mapping) missing_mappings.push('research_mapping');
  return Object.freeze({
    ready: missing.length === 0 && missing_mappings.length === 0,
    capabilities,
    required,
    missing: Object.freeze(missing),
    missing_mappings: Object.freeze(missing_mappings)
  });
}

function assertHostClaim(input = {}, options = {}) {
  const result = assessHostCapabilities(input, options);
  if (!result.ready) {
    const failures = [...result.missing, ...result.missing_mappings];
    throw new Error(`host capability claim is not proven: ${failures.join(', ')}`);
  }
  return result;
}

module.exports = { CAPABILITIES, normalizeHostCapabilities, requiredCapabilities, assessHostCapabilities, assertHostClaim };
