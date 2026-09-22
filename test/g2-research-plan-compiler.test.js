'use strict';
const test = require('node:test'); const assert = require('node:assert/strict'); const { researchRuntime } = require('../src/g2/product');
test('planned researched goal can generate goal/steps from evidence instead of requiring caller-authored plan', async () => {
  const seen = [];
  const project = await researchRuntime.startResearchedProject({ intent:'implement current upstream behavior', plan_id:'generated-plan', multi_stage:true, current_info_required:true, objective_ref:'#30', subject_sha:'head' }, { async search(){ return [{id:'official',source:'official docs',claim:'use v2 behavior',authority:'OFFICIAL'}]; } }, { async compile(context){ seen.push(context); return { goal:'implement verified v2 behavior', steps:[{id:'implement',description:'implement v2'},{id:'verify',description:'verify v2',dependencies:['implement']}] }; } });
  assert.equal(seen.length,1); assert.equal(seen[0].evidence[0].id,'official'); assert.equal(project.plan.goal,'implement verified v2 behavior'); assert.deepEqual(project.plan.evidence_refs,['official']); assert.equal(project.work_items.length,2); assert.match(project.work_items[1].dependencies[0],/:implement$/);
});
test('planned work without supplied steps or planner fails instead of inventing a plan', async () => { await assert.rejects(() => researchRuntime.startResearchedProject({ intent:'complex current task', plan_id:'no-plan', multi_stage:true, current_info_required:true, objective_ref:'#30', subject_sha:'head' }, { async search(){ return [{id:'e',source:'official',claim:'fact'}]; } }), /planner\.compile required/); });
