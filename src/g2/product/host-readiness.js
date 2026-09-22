'use strict';

const { adapterContract } = require('../scheduler');

function validatePersonalHostReadiness({ profile, scheduler, research_provider = null, research_required = false } = {}) {
  const missing = [];
  if (!profile || !profile.durableState || typeof profile.durableState.read !== 'function' || typeof profile.durableState.commit !== 'function') missing.push('durable_state');
  const wake = adapterContract.validateSchedulerAdapter(scheduler);
  if (!wake.ok) missing.push(...wake.missing.map((name) => `scheduler.${name}`));
  if (research_required && (!research_provider || typeof research_provider.search !== 'function')) missing.push('research_provider.search');
  return Object.freeze({ ready: missing.length === 0, unattended: missing.length === 0, missing: Object.freeze([...new Set(missing)]) });
}

function requirePersonalHostReadiness(input = {}) {
  const result = validatePersonalHostReadiness(input);
  if (!result.ready) throw new Error(`Personal host is not ready for unattended execution: ${result.missing.join(', ')}`);
  return result;
}

module.exports = { validatePersonalHostReadiness, requirePersonalHostReadiness };
