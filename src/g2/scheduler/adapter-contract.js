'use strict';

const REQUIRED_METHODS = Object.freeze([
  'read',
  'arm',
  'verify',
  'disable'
]);

function validateSchedulerAdapter(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    return { ok: false, missing: REQUIRED_METHODS.slice() };
  }
  const missing = REQUIRED_METHODS.filter(name => typeof adapter[name] !== 'function');
  return { ok: missing.length === 0, missing };
}

const CONTRACT = Object.freeze({
  read: 'Return the live schedule handle, enabled state, generation if supported, and next due time.',
  arm: 'Mutate or create the scheduler-specific wake representation for the same logical actor.',
  verify: 'Independently read back and confirm the requested live schedule state.',
  disable: 'Disable the logical actor schedule only after explicit terminal authority.'
});

module.exports = { REQUIRED_METHODS, CONTRACT, validateSchedulerAdapter };
