'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const P = require('../src/g2/product'); const { githubProfile } = require('../src/g2/adapters');
function transport() { const files = new Map(); let n = 0; return { async readText({path}) { return files.get(path) || null; }, async writeText({path, content, expected_version}) { const old = files.get(path) || null; if ((old && old.version || null) !== (expected_version || null)) throw new Error('version conflict'); const next = { content, version: `v${++n}` }; files.set(path, next); return next; } }; }
test('GitHub product E2E uses the same research-plan-work-resume path', async () => {
  const project = await P.researchRuntime.startResearchedProject({ intent: 'implement current dependency behavior', plan_id: 'gh-e2e', multi_stage: true, current_info_required: true, objective_ref: '#30', subject_sha: 'head-a', steps: [{ id: 'implement', description: 'implement' }] }, { async search() { return [{ id: 'upstream', source: 'upstream repository', claim: 'behavior verified', authority: 'PRIMARY' }]; } });
  assert.equal(project.state, 'RUNNING'); assert.equal(project.work_items.length, 1);
  const profile = githubProfile.createGithubProfile({ transport: transport() });
  const workerA = P.profileSession.createProfileSession({ profile, logical_id: 'gh-e2e' });
  await workerA.checkpoint({ generation: 1, subject_sha: 'head-a', checkpoint: { plan_revision: project.plan.revision, next: project.work_items[0].work_id } });
  const workerB = P.profileSession.createProfileSession({ profile, logical_id: 'gh-e2e' }); const resumed = await workerB.resume();
  assert.equal(resumed.found, true); assert.equal(resumed.checkpoint.next, project.work_items[0].work_id);
});
