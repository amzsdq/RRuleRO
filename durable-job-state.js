const SUCCESS = new Set(['SENT_VERIFIED', 'NEW_CHAT_CREATED_VERIFIED']);
const AMBIGUOUS = new Set(['DELIVERY_UNCONFIRMED', 'SEND_NOT_VERIFIED', 'NEW_CHAT_NOT_VERIFIED', 'NO_RESULT_FILE']);

function positiveInt(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.trunc(n) : fallback;
}

function retryBudgetExhausted(result = {}) {
  const attempts = positiveInt(result.attempts, 0);
  const maxAttempts = positiveInt(result.max_attempts, 0);
  const transportSeq = positiveInt(result.transport_attempt_seq, 0);
  const transportMax = positiveInt(result.transport_max_runs, 0);
  return (maxAttempts > 0 && attempts >= maxAttempts) ||
    (transportMax > 0 && transportSeq >= transportMax);
}

function terminalInvalid(result = {}) {
  if (result.error_code === 'INVALID_COMMAND') return true;
  if (result.error_code !== 'FATAL_SETUP_ERROR') return false;
  const text = String(result.error || '');
  return /Issue body must be valid JSON|body must be a JSON object command|message is required|mode must be send or new|valid target required|continuation_required needs job_id/i.test(text);
}

function classifyJobState(result = {}, now = Date.now()) {
  const status = String(result.status || '');
  const code = String(result.error_code || '');

  if (SUCCESS.has(status)) return { job_state: 'AWAITING_WORK_ACK', issue_action: 'close', next_attempt_at: '' };
  if (code === 'DURABLE_ISSUE_CLOSED') return { job_state: 'CANCELLED', issue_action: 'close', next_attempt_at: '' };
  if (terminalInvalid(result)) return { job_state: 'TERMINAL_INVALID', issue_action: 'close', next_attempt_at: '' };
  if (AMBIGUOUS.has(code)) return { job_state: 'RECONCILE_REQUIRED', issue_action: 'keep_open', next_attempt_at: '' };

  if (result.retryable_at_end === true) {
    if (retryBudgetExhausted(result)) {
      return { job_state: 'RETRY_EXHAUSTED', issue_action: 'close', next_attempt_at: '' };
    }
    const retryDelayMs = positiveInt(result.retry_delay_ms, 60_000);
    return { job_state: 'RETRY_WAIT', issue_action: 'keep_open', next_attempt_at: new Date(now + retryDelayMs).toISOString() };
  }

  return { job_state: 'REPAIR_REQUIRED', issue_action: 'keep_open', next_attempt_at: '' };
}

function applyJobState(result = {}, now = Date.now()) { return Object.assign(result, classifyJobState(result, now)); }

function stateRecord(result = {}) {
  return {
    type: 'relay-job-state', version: 1, job_id: result.job_id || '', root_job_id: result.root_job_id || result.job_id || '',
    issue_number: result.issue_number ?? null, run_id: result.run_id || '', delivery_id: result.delivery_id || '', origin: result.origin || '',
    transport_attempt_seq: result.transport_attempt_seq ?? 0, transport_max_runs: result.transport_max_runs ?? 0,
    transport_status: result.status || '', error_code: result.error_code || '', job_state: result.job_state || '',
    issue_action: result.issue_action || '', next_attempt_at: result.next_attempt_at || '', attempts: result.attempts ?? 0,
    max_attempts: result.max_attempts ?? 0, milestone_id: result.milestone_id || '', recorded_at: new Date().toISOString()
  };
}

module.exports = { SUCCESS, AMBIGUOUS, retryBudgetExhausted, terminalInvalid, classifyJobState, applyJobState, stateRecord };
