'use strict';

const { assertHostClaim } = require('./host-capabilities');

const CHATGPT_PERSONAL_HOST = Object.freeze({
  host: 'ChatGPT',
  durable_versioned_storage: true,
  storage_mapping: 'Google Drive connector: Google Docs get_document.revisionId + batch_update_document.write_control.requiredRevisionId',
  verified_wake: true,
  wake_mapping: 'ChatGPT Automations: recurring automation update with enabled-state verification',
  research: true,
  research_mapping: 'ChatGPT web research/search tools'
});

function assertChatGPTPersonalHost(options = {}) {
  return assertHostClaim(CHATGPT_PERSONAL_HOST, {
    unattended: options.unattended !== false,
    research_required: options.research_required === true
  });
}

module.exports = { CHATGPT_PERSONAL_HOST, assertChatGPTPersonalHost };
