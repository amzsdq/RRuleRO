'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/g2/product');
const { githubProfile, personalWorkspace, toolWorkspace } = require('../src/g2/adapters');

function versionedStore() {
  const files = new Map();
  let n = 0;
  return {
    async readText({ path }) { return files.get(path) || null; },
    async writeText({ path, content, expected_version }) {
      const old = files.get(path) || null;
      const actual = old ? old.version : null;
      if (actual !== (expected_version || null)) throw new Error('version conflict');
      const next = { content, version: `v${++n}` };
      files.set(path, next);
      return next;
    }
  };
}

function github() {
  return githubProfile.createGithubProfile({ transport: versionedStore() });
}

function personalTool() {
  const store = versionedStore();
  const workspace = toolWorkspace.createToolWorkspace({
    read: (request) => store.readText(request),
    write: (request) => store.writeText(request)
  });
  return personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
}

for (const [name, profileFactory] of [['GitHub', github], ['PersonalTool', personalTool]]) {
  test(`${name} profile satisfies the shared durable project acceptance path`, async () => {
    const project = await P.researchRuntime.startResearchedProject({
      intent: 'implement behavior from current authoritative evidence',
      plan_id: `accept-${name}`,
      multi_stage: true,
      current_info_required: true,
      objective_ref: '#30',
      subject_sha: 'accept-head',
      steps: [
        { id: 'implement', description: 'implement evidence-backed behavior' },
        { id: 'verify', description: 'verify result', dependencies: ['implement'] }
      ]
    }, {
      async search() {
        return [{ id: 'official', source: 'official source', claim: 'current behavior', authority: 'OFFICIAL' }];
      }
    });

    assert.equal(project.state, 'RUNNING');
    assert.deepEqual(project.plan.evidence_refs, ['official']);
    assert.equal(project.work_items.length, 2);
    assert.equal(P.humanInterface.planPreview(project).informational, true);

    const profile = profileFactory();
    const first = P.profileSession.createProfileSession({ profile, logical_id: `accept-${name}` });
    await first.checkpoint({ generation: 1, subject_sha: 'accept-head', checkpoint: { next: project.work_items[0].work_id } });

    const replacement = P.profileSession.createProfileSession({ profile, logical_id: `accept-${name}` });
    const resumed = await replacement.resume();
    assert.equal(resumed.found, true);
    assert.equal(resumed.checkpoint.next, project.work_items[0].work_id);

    const progress = P.humanInterface.progressSummary({
      completed: ['research'], active: ['implement'], remaining: ['verify'], next: 'verify'
    });
    assert.equal(progress.status, 'CONTINUE');
  });
}

test('FAST mode enters canonical runnable work with no preview/approval ceremony', () => {
  const project = P.projectRuntime.startProject({
    intent: 'perform a bounded low-risk transformation',
    plan_id: 'accept-fast',
    objective_ref: '#30',
    subject_sha: 'accept-head'
  });
  assert.equal(project.intake.mode, 'FAST');
  assert.equal(project.intake.plan_preview, 'NONE');
  assert.equal(project.state, 'RUNNING');
  assert.equal(project.work_items.length, 1);
});
