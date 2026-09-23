const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const EXPERIMENT = path.join(ROOT, 'experiments', 'foreman-runtime-topology-v1')
const { resolveWorkSession } = require('../experiments/foreman-runtime-topology-v1/work-marker.js')

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(EXPERIMENT, name), 'utf8'))
}

test('compact current-state example carries server clock, scheduler, and ownership hot state', () => {
  const state = readJson('current-state.example.json')

  assert.equal(state.schemaVersion, 2)
  assert.equal(state.status, 'CONTINUE')
  assert.ok(state.checkpointRef)
  assert.ok(state.next.objective)

  assert.equal(state.clock.mode, 'GITHUB_SERVER_MARKERS')
  assert.equal(state.clock.strictCertification, true)
  assert.equal(state.clock.legacyDurationStatus, 'LEGACY_MODEL_TIME_UNVERIFIED')

  assert.equal(state.scheduler.targetMin, 11)
  assert.equal(state.scheduler.lastOperationalTargetMin, 11)
  assert.equal(state.scheduler.mode, 'SERIAL_PREARM_FIXED_GAP')
  assert.equal(state.scheduler.prearmGapMin, 3)
  assert.equal(state.scheduler.ownerWorkTargetMin, 15)
  assert.equal(state.scheduler.requiredHandoffLeadMin, 3)
  assert.equal(state.scheduler.successorWakeOffsetMin, 12)

  assert.equal(state.ownership.generation, 0)
  assert.equal(state.ownership.role, 'UNASSIGNED')
  assert.ok(state.ownership.fencingMode)
  assert.ok(state.historyTailRef)
})

test('experimental schema requires bounded clock, scheduler, and ownership snapshots', () => {
  const schema = readJson('current-state-schema.json')

  assert.ok(schema.required.includes('clock'))
  assert.ok(schema.required.includes('scheduler'))
  assert.ok(schema.required.includes('ownership'))
  assert.equal(schema.properties.clock.properties.workedSec.type, 'integer')
  assert.equal(schema.properties.clock.additionalProperties, false)
  assert.equal(schema.properties.scheduler.additionalProperties, false)
  assert.equal(schema.properties.ownership.additionalProperties, false)
})

test('compact foreman restores bounded state and reports WORKED only', () => {
  const prompt = fs.readFileSync(path.join(EXPERIMENT, 'compact-foreman.txt'), 'utf8')
  const source = prompt.split('\n').find((line) => line.startsWith('SOURCE=')) ?? ''

  assert.match(source, /CURRENT_STATE first/)
  assert.match(source, /clock\/ownership\/scheduler/)
  assert.match(source, /append-only audit history only when/)
  assert.match(prompt, /RUNTIME_CORE=/)
  assert.match(prompt, /REPORT=.*WORKED/)
  assert.doesNotMatch(prompt, /SERVER_OBSERVED_WORK_DURATION/)
})

test('foreman and worker share the same runtime core', () => {
  const foreman = fs.readFileSync(path.join(EXPERIMENT, 'compact-foreman.txt'), 'utf8')
  const worker = fs.readFileSync(path.join(EXPERIMENT, 'worker-envelope.txt'), 'utf8')

  assert.match(foreman, /runtime-core\.md/)
  assert.match(worker, /runtime-core\.md/)
  assert.match(foreman, /Role\/topology experiments must not weaken/)
  assert.match(worker, /Worker role does not redefine/)
})

test('runtime core has one canonical WORKED formula from GitHub created_at', () => {
  const core = fs.readFileSync(path.join(EXPERIMENT, 'runtime-core.md'), 'utf8')

  assert.match(core, /WORK_DURATION의 Source of Truth는/)
  assert.match(core, /모델 출력이 아니라 GitHub 서버 timestamp이다/)
  assert.match(core, /WORKED =\s*END_MARKER\.created_at\s*-\s*START_MARKER\.created_at/s)
  assert.match(core, /모델이 작성한 시간 문자열은 작업시간 판정에 사용하지 않는다/)
  assert.doesNotMatch(core, /SERVER_OBSERVED_WORK_DURATION/)
})

test('overlap handoff spec preserves owner fencing and activation anchor', () => {
  const overlap = fs.readFileSync(path.join(EXPERIMENT, 'overlap-handoff.md'), 'utf8')

  assert.match(overlap, /OWNER_WORK_TARGET = 15m/)
  assert.match(overlap, /SUCCESSOR_WAKE_OFFSET = \+12m/)
  assert.match(overlap, /SINGLE OWNER/)
  assert.match(overlap, /SHADOW NO WRITE/)
  assert.match(overlap, /GENERATION FENCING/)
  assert.match(overlap, /OWNER ACTIVATION ANCHOR/)
  assert.match(overlap, /duplicate owner = 0/)
  assert.match(overlap, /15\/12 is a baseline candidate, not a permanent rule/)
})

test('work-marker resolver chooses canonical start and computes WORKED from server timestamps', () => {
  const comments = [
    {
      id: 101,
      created_at: '2026-09-23T12:00:02Z',
      body: '[WORK_MARKER]\nsession=session-7\nphase=START\ngeneration=7\nautomation=a1',
    },
    {
      id: 100,
      created_at: '2026-09-23T12:00:00Z',
      body: '[WORK_MARKER]\nsession=session-7\nphase=START\ngeneration=7\nautomation=a1',
    },
    {
      id: 150,
      created_at: '2026-09-23T12:10:00Z',
      body: '[WORK_MARKER]\nsession=session-7\nphase=CHECK\ngeneration=7\nautomation=a1',
    },
    {
      id: 200,
      created_at: '2026-09-23T12:11:03Z',
      body: '[WORK_MARKER]\nsession=session-7\nphase=END\ngeneration=7\nautomation=a1\nstart_marker=100\nstatus=CONTINUE',
    },
  ]

  const result = resolveWorkSession(comments, { session: 'session-7', generation: 7, automation: 'a1' })

  assert.equal(result.state, 'CLOSED')
  assert.equal(result.start.id, '100')
  assert.equal(result.end.id, '200')
  assert.equal(result.workedSec, 663)
  assert.equal(result.serverObservedWorkDurationSec, undefined)
})

test('work-marker resolver ignores stale generation and rejects end bound to duplicate start', () => {
  const comments = [
    {
      id: 10,
      created_at: '2026-09-23T12:00:00Z',
      body: '[WORK_MARKER]\nsession=s\nphase=START\ngeneration=4\nautomation=a1',
    },
    {
      id: 11,
      created_at: '2026-09-23T12:00:01Z',
      body: '[WORK_MARKER]\nsession=s\nphase=START\ngeneration=5\nautomation=a1',
    },
    {
      id: 12,
      created_at: '2026-09-23T12:11:02Z',
      body: '[WORK_MARKER]\nsession=s\nphase=END\ngeneration=5\nautomation=a1\nstart_marker=999\nstatus=CONTINUE',
    },
  ]

  const result = resolveWorkSession(comments, { session: 's', generation: 5, automation: 'a1' })

  assert.equal(result.state, 'OPEN_SESSION')
  assert.equal(result.start.id, '11')
  assert.equal(result.workedSec, undefined)
})
