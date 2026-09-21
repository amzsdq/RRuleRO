const POLICY = require('./control-plane/foreman-work-spec-policy.v1.json');

const PREFIX = POLICY.record_prefix;
const EDITOR_ROLES = new Set(POLICY.ownership.authoritative_editor_roles);

function fail(message) { throw new Error(message); }
function nonEmpty(value, label, max = 12000) {
  const text = String(value || '').trim();
  if (!text || text.length > max) fail(`${label} required`);
  return text;
}
function stableId(value, label = 'id', max = 256) {
  const id = String(value || '').trim();
  if (!id || id.length > max || !/^[A-Za-z0-9._:-]+$/.test(id)) fail(`valid ${label} required`);
  return id;
}
function positiveInt(value, label) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) fail(`positive ${label} required`);
  return n;
}
function stringList(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value.map((v, i) => nonEmpty(v, `${label}[${i}]`, 4000));
}
function plainObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(`${label} must be an object`);
  return value;
}
function iso(value, label) {
  const ms = Date.parse(String(value || ''));
  if (!Number.isFinite(ms)) fail(`valid ${label} required`);
  return new Date(ms).toISOString();
}
function editorRole(value) {
  const role = String(value || '').trim().toUpperCase();
  if (!EDITOR_ROLES.has(role)) fail('work spec editor must be FOREMAN or DISPATCHER');
  return role;
}

function buildWorkSpecRevision(input = {}, now = new Date().toISOString()) {
  const createdAt = iso(input.created_at || now, 'created_at');
  return {
    schema_version: 1,
    record_type: 'R_WORK_SPEC',
    root_job_id: stableId(input.root_job_id, 'root_job_id'),
    root_issue_number: positiveInt(input.root_issue_number, 'root_issue_number'),
    revision: positiveInt(input.revision, 'revision'),
    editor_role: editorRole(input.editor_role),
    root_goal: nonEmpty(input.root_goal, 'root_goal'),
    scope: stringList(input.scope, 'scope'),
    non_goals: stringList(input.non_goals, 'non_goals'),
    architectural_decisions: stringList(input.architectural_decisions, 'architectural_decisions'),
    constraints: stringList(input.constraints, 'constraints'),
    acceptance: stringList(input.acceptance, 'acceptance'),
    authority_boundary: plainObject(input.authority_boundary, 'authority_boundary'),
    source_note: String(input.source_note || '').trim(),
    created_at: createdAt
  };
}

function nextWorkSpecRevision(currentInput, patch = {}, now = new Date().toISOString()) {
  const current = buildWorkSpecRevision(currentInput, currentInput.created_at || now);
  return buildWorkSpecRevision({
    ...current,
    ...patch,
    root_job_id: current.root_job_id,
    root_issue_number: current.root_issue_number,
    revision: current.revision + 1,
    created_at: now
  }, now);
}

function serializeWorkSpec(input) {
  return PREFIX + JSON.stringify(buildWorkSpecRevision(input, input.created_at || new Date().toISOString()));
}

function parseWorkSpecComment(body) {
  const text = String(body || '');
  if (!text.startsWith(PREFIX)) return null;
  let parsed;
  try { parsed = JSON.parse(text.slice(PREFIX.length)); }
  catch { return null; }
  try { return buildWorkSpecRevision(parsed, parsed.created_at); }
  catch { return null; }
}

function trusted(comment, allowed) {
  return !allowed.size || allowed.has(String(comment?.user?.login || ''));
}

function latestWorkSpecRevision(comments = [], rootJobId, options = {}) {
  const wanted = stableId(rootJobId, 'root_job_id');
  const allowed = new Set((options.allowed_logins || []).map(String));
  let latest = null;
  let commentId = null;
  for (const comment of comments) {
    if (!trusted(comment || {}, allowed)) continue;
    const record = parseWorkSpecComment(comment?.body);
    if (!record || record.root_job_id !== wanted) continue;
    if (!latest || record.revision > latest.revision ||
        (record.revision === latest.revision && Number(comment?.id || 0) > Number(commentId || 0))) {
      latest = record;
      commentId = comment?.id ?? null;
    }
  }
  return latest ? { record: latest, comment_id: commentId } : null;
}

function buildWorkSpecRef(recordInput, commentId) {
  const record = buildWorkSpecRevision(recordInput, recordInput.created_at);
  return {
    root_job_id: record.root_job_id,
    root_issue_number: record.root_issue_number,
    revision: record.revision,
    comment_id: positiveInt(commentId, 'comment_id')
  };
}

function validateWorkSpecRef(ref = {}, expectedRootJobId = '') {
  if (!ref || typeof ref !== 'object' || Array.isArray(ref)) fail('work_spec_ref must be an object');
  const normalized = {
    root_job_id: stableId(ref.root_job_id, 'work_spec_ref.root_job_id'),
    root_issue_number: positiveInt(ref.root_issue_number, 'work_spec_ref.root_issue_number'),
    revision: positiveInt(ref.revision, 'work_spec_ref.revision'),
    comment_id: positiveInt(ref.comment_id, 'work_spec_ref.comment_id')
  };
  if (expectedRootJobId && normalized.root_job_id !== stableId(expectedRootJobId, 'expected_root_job_id')) {
    fail('work_spec_ref root_job_id mismatch');
  }
  return normalized;
}

function bindWorkAssignToSpec(envelopeInput, workSpecRef) {
  if (!envelopeInput || typeof envelopeInput !== 'object' || Array.isArray(envelopeInput)) fail('WORK_ASSIGN envelope required');
  if (String(envelopeInput.message_type || '').toUpperCase() !== 'WORK_ASSIGN') fail('WORK_ASSIGN envelope required');
  const rootJobId = envelopeInput.identity?.root_job_id || envelopeInput.root_job_id;
  const ref = validateWorkSpecRef(workSpecRef, rootJobId);
  const content = envelopeInput.content && typeof envelopeInput.content === 'object' && !Array.isArray(envelopeInput.content)
    ? envelopeInput.content : {};
  const control = envelopeInput.control && typeof envelopeInput.control === 'object' && !Array.isArray(envelopeInput.control)
    ? envelopeInput.control : {};
  return {
    ...envelopeInput,
    control: {
      ...control,
      work_spec_contract: 'R_WORK_SPEC_V1'
    },
    content: {
      ...content,
      work_spec_ref: ref
    }
  };
}

function validateWorkAssignSpecBinding(envelope = {}) {
  if (String(envelope.message_type || '').toUpperCase() !== 'WORK_ASSIGN') return true;
  const contract = String(envelope.control?.work_spec_contract || '').trim();
  const hasRef = !!envelope.content?.work_spec_ref;
  if (!contract && !hasRef) return true; // legacy compatibility; new Foreman delegation must use the v1 contract.
  if (contract !== 'R_WORK_SPEC_V1') fail('unsupported work_spec_contract');
  validateWorkSpecRef(envelope.content?.work_spec_ref, envelope.identity?.root_job_id);
  return true;
}

module.exports = {
  POLICY,
  PREFIX,
  buildWorkSpecRevision,
  nextWorkSpecRevision,
  serializeWorkSpec,
  parseWorkSpecComment,
  latestWorkSpecRevision,
  buildWorkSpecRef,
  validateWorkSpecRef,
  bindWorkAssignToSpec,
  validateWorkAssignSpecBinding
};
