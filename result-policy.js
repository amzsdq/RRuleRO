const { applyJobState } = require('./durable-job-state');

function stableJobId(cmd = {}, issueNumber, runId) {
  if (cmd?.job_id) return String(cmd.job_id);
  if (issueNumber) return `GH-ISSUE-${issueNumber}`;
  return `GH-DISPATCH-${runId || 'local'}`;
}

function positiveSequence(value, fallback = 0) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

// Transport results describe message delivery, never completion of the recipient's work.
function metadata(cmd = {}, issueNumber, runId) {
  cmd = cmd || {};
  const jobId = stableJobId(cmd, issueNumber, runId);
  const callback = /^\[RELAY_RESULT CALLBACK\]/i.test(cmd.message || '') || cmd.origin === 'relay-result-callback';
  return {
    job_id: jobId,
    root_job_id: String(cmd.root_job_id || jobId),
    run_id: String(runId || ''),
    milestone_id: String(cmd.milestone_id || ''),
    origin: String(cmd.origin || ''),
    transport_attempt_seq: positiveSequence(cmd.transport_attempt_seq),
    transport_max_runs: positiveSequence(cmd.transport_max_runs),
    outbox_id: String(cmd.outbox_id || ''),
    outbox_source_issue: Number.isInteger(Number(cmd.outbox_source_issue)) && Number(cmd.outbox_source_issue) > 0 ? Number(cmd.outbox_source_issue) : null,
    agent_retry: Number.isSafeInteger(cmd.agent_retry) && cmd.agent_retry >= 0 ? cmd.agent_retry : 0,
    sender_target: cmd.sender_target || '',
    sender_id: cmd.sender_id || '',
    callback_target: cmd.callback_target || cmd.sender_target || '',
    provision_id: String(cmd.provision_id || ''),
    create_request_id: String(cmd.create_request_id || ''),
    requested_section_id: String(cmd.requested_section_id || ''),
    requested_role: String(cmd.requested_role || ''),
    creator_section_id: String(cmd.creator_section_id || ''),
    parent_section_id: String(cmd.parent_section_id || ''),
    result_scope: 'delivery',
    notify: !callback && cmd.notify !== false
  };
}

function persistentProvisionIssue(result = {}) {
  return result.origin === 'section-provision' && !!result.provision_id && !!result.create_request_id;
}

function persistVerifiedIdentityDiagnostic(result = {}) {
  if (result.status !== 'NEW_CHAT_CREATED_VERIFIED') return result;
  const canonicalUrl = String(result.canonical_url || '').trim();
  const serverConversationId = String(result.server_conversation_id || '').trim();
  if (!canonicalUrl || !serverConversationId) return result;
  const existing = result.receipt_diagnostic && typeof result.receipt_diagnostic === 'object' && !Array.isArray(result.receipt_diagnostic)
    ? result.receipt_diagnostic
    : {};
  result.receipt_diagnostic = {
    ...existing,
    verified_conversation_identity: {
      canonical_url: canonicalUrl,
      server_conversation_id: serverConversationId
    }
  };
  return result;
}

async function persistAndReport(result, write, postComment, close, now = Date.now()) {
  // A reporting failure must never erase an observed delivery result or lifecycle state.
  applyJobState(result, now);
  persistVerifiedIdentityDiagnostic(result);
  if (persistentProvisionIssue(result)) {
    result.issue_action = 'keep_open';
    result.persistent_provision_issue = true;
  }
  write(result);
  try {
    await postComment(result);
    if (result.issue_action === 'close') await close();
  } catch (error) {
    result.reporting_error = String(error?.message || error).slice(0, 2000);
    write(result);
  }
  return result;
}

module.exports = { stableJobId, positiveSequence, metadata, persistentProvisionIssue, persistVerifiedIdentityDiagnostic, persistAndReport };
