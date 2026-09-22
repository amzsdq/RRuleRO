'use strict';

const { validateSchedulerAdapter } = require('./adapter-contract');

function requiredCallback(value, name) {
  if (typeof value !== 'function') throw new Error(`${name} callback required`);
  return value;
}

function createToolSchedulerAdapter({ read, arm, verify, disable } = {}) {
  const callbacks = Object.freeze({
    read: requiredCallback(read, 'read'),
    arm: requiredCallback(arm, 'arm'),
    verify: requiredCallback(verify, 'verify'),
    disable: requiredCallback(disable, 'disable')
  });

  const adapter = Object.freeze({
    async read(input) { return callbacks.read(input); },
    async arm(input) { return callbacks.arm(input); },
    async verify(input) { return callbacks.verify(input); },
    async disable(input) { return callbacks.disable(input); }
  });

  const validation = validateSchedulerAdapter(adapter);
  if (!validation.ok) throw new Error(`invalid scheduler adapter: ${validation.missing.join(',')}`);
  return adapter;
}

module.exports = { createToolSchedulerAdapter };
