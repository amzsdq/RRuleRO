'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const P = require('../src/g2/product'); const { personalWorkspace } = require('../src/g2/adapters');
function workspace() { const files = new Map(); let n = 0; return { async readText({path}) { return files.get(path) || null; }, async writeText({path, content, expected_version}) { const old = files.get(path) || null; if ((old && old.version || null) !== (expected_version || null)) throw new Error('version conflict'); const next = { content, version: `v${++n}` }; files.set(path, next); return next; } }; }
test('Personal product E2E: research -> plan -> work -> durable loss/resume -> progress', async () => {
  const input = { intent: 'implement current upstream behavior', plan_id: 'e2e', multi_stage: true, current_info_required: true, objective_ref: '#30', subject_sha: 'sha-1', steps: [{ id: 'implement', description: 'implement current behavior' }, { id: 'verify', description: 'verify result', dependencies: ['implement'] }] };
  const provider = { async search() { return [{ id: 'official', source: 'official docs', claim: 'current behavior verified', authority: 'OFFICIAL' }]; } };
  const project = await P.researchRuntime.startResearchedProject(input, provider);
  assert.equal(project.state, 'RUNNING'); assert.equal(project.work_items.length, 2);
  const preview = P.humanInterface.planPreview(project); assert.equal(preview.informational, true);
  const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace: workspace() });
  const firstWorker = P.profileSession.createProfileSession({ profile, logical_id: 'e2e' });
  await firstWorker.checkpoint({ generation: 1, subject_sha: 'sha-1', checkpoint: { plan_revision: project.plan.revision, completed: ['research'], next: 'implement' } });
  const replacementWorker = P.profileSession.createProfileSession({ profile, logical_id: 'e2e' });
  const resumed = await replacementWorker.resume(); assert.equal(resumed.checkpoint.next, 'implement');
  const progress = P.humanInterface.progressSummary({ completed: ['research'], active: ['implement'], remaining: ['verify'], next: 'verify after implementation' });
  assert.equal(progress.status, 'CONTINUE'); assert.match(progress.summary, /Remaining: verify/);
});
