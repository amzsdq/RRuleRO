'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/g2/foreman');

const SHA = 'synthetic-benchmark-subject';
const NOW = Date.parse('2026-01-01T00:00:00Z');

function workload(seed, variant) {
  const units = [];
  for (let domain = 0; domain < 4; domain += 1) {
    for (let unit = 0; unit < 3; unit += 1) {
      units.push(F.normalizeWorkItem({
        work_id: `seed-${seed}-d${domain}-u${unit}`,
        generation: seed,
        objective_ref: 'synthetic-claim-benchmark',
        subject_sha: SHA,
        state: 'QUEUED',
        work_domain: variant === 'A' ? 'parent.orchestration' : `domain.${domain}`,
        effect_domain: `effect.${domain}`,
        verification_contract: 'synthetic-check',
        order: domain * 3 + unit
      }));
    }
  }
  return units;
}

function schedulingPass(seed, variant) {
  const units = workload(seed, variant);
  const accepted = [];
  let falseSerialization = 0;
  let operations = 0;
  for (const unit of units) {
    operations += 1;
    const conflict = accepted.some(active => F.domainsConflict(unit, active));
    if (!conflict) accepted.push({ ...unit, state: 'RUNNING' });
    else if (!accepted.some(active => active.effect_domain === unit.effect_domain)) falseSerialization += 1;
  }
  return { admitted: accepted.length, falseSerialization, operations };
}

function safetyFixture(seed) {
  const current = { work_domain: 'domain.0', subject_sha: SHA, claim_generation: seed, expires_at: '2026-01-01T00:10:00Z' };
  const duplicate = { ...current };
  const stale = { ...current, claim_generation: seed - 1 };
  const expired = { ...current, expires_at: '2025-12-31T23:59:00Z' };
  return {
    duplicateExcluded: F.sameClaimDomain(current, duplicate),
    staleRejected: !F.sameClaimDomain(current, stale),
    expiredReclaimable: F.reclaimable(expired, NOW),
    liveNotReclaimable: !F.reclaimable(current, NOW)
  };
}

for (const variant of ['A', 'B']) {
  test(`claim granularity benchmark ${variant}: five deterministic generations preserve invariants`, () => {
    const raw = [];
    for (let seed = 1; seed <= 5; seed += 1) {
      const metrics = schedulingPass(seed, variant);
      const safety = safetyFixture(seed);
      assert.deepEqual(safety, {
        duplicateExcluded: true,
        staleRejected: true,
        expiredReclaimable: true,
        liveNotReclaimable: true
      });
      raw.push({ seed, ...metrics, ...safety });
    }
    assert.equal(raw.length, 5);
    assert.ok(raw.every(row => row.operations === 12));
    if (variant === 'A') {
      assert.ok(raw.every(row => row.admitted === 1 && row.falseSerialization === 9));
    } else {
      assert.ok(raw.every(row => row.admitted === 4 && row.falseSerialization === 0));
    }
  });
}
