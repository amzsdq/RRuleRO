'use strict';
const intakeApi = require('./intake');
const evidenceApi = require('./evidence');
const projectRuntime = require('./project-runtime');

async function gatherEvidence(input = {}, provider) {
  const intake = intakeApi.compileIntent(input);
  if (!intake.research_required) return Object.freeze([]);
  if (!provider || typeof provider.search !== 'function') throw new Error('research provider.search required');
  const queries = Array.isArray(input.research_queries) && input.research_queries.length ? input.research_queries : [input.intent];
  const raw = [];
  for (const query of queries) {
    const results = await provider.search({ query: String(query), depth: intake.research_depth, intent: intake.intent });
    if (Array.isArray(results)) raw.push(...results);
  }
  const evidence = evidenceApi.normalizeEvidence(raw);
  if (!evidence.length) throw new Error('research required but provider returned no usable evidence');
  return evidence;
}

async function compilePlanInput(input, evidence, planner) {
  const intake = intakeApi.compileIntent(input);
  if (Array.isArray(input.steps) && input.steps.length) return input;
  if (intake.mode === intakeApi.MODES.FAST) return input;
  if (!planner || typeof planner.compile !== 'function') throw new Error('planner.compile required when planned work has no supplied steps');
  const result = await planner.compile({
    intent: intake.intent,
    mode: intake.mode,
    research_depth: intake.research_depth,
    evidence: evidence.map((item) => ({ id: item.id, source: item.source, claim: item.claim, authority: item.authority }))
  });
  if (!result || !Array.isArray(result.steps) || !result.steps.length) throw new Error('planner.compile must return non-empty steps');
  return { ...input, goal: String(result.goal || input.goal || input.intent), steps: result.steps };
}

async function startResearchedProject(input = {}, provider, planner = null) {
  const evidence = await gatherEvidence(input, provider);
  const planned = await compilePlanInput(input, evidence, planner);
  return projectRuntime.startProject({ ...planned, evidence });
}

module.exports = { gatherEvidence, compilePlanInput, startResearchedProject };
