const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const ROOT = path.resolve(__dirname, '..')
const EXPERIMENT = path.join(ROOT, 'experiments', 'foreman-runtime-topology-v1')

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(EXPERIMENT, name), 'utf8'))
}

test('compact current-state example carries scheduler hot state without history scan', () => {
  const state = readJson('current-state.example.json')

  assert.equal(state.schemaVersion, 1)
  assert.equal(state.status, 'CONTINUE')
  assert.ok(state.checkpointRef)
  assert.ok(state.next.objective)
  assert.equal(state.scheduler.targetMin, 11)
  assert.equal(state.scheduler.lastConfirmedSafeMin, 11)
  assert.equal(state.scheduler.prearmGapMin, 3)
  assert.ok(state.scheduler.mode)
  assert.ok(state.scheduler.lastResultRef)
  assert.ok(state.historyTailRef)
})

test('experimental schema requires the bounded scheduler snapshot', () => {
  const schema = readJson('current-state-schema.json')

  assert.ok(schema.required.includes('scheduler'))
  assert.deepEqual(
    schema.properties.scheduler.required,
    ['targetMin', 'lastConfirmedSafeMin', 'prearmGapMin', 'mode'],
  )
  assert.equal(schema.properties.scheduler.additionalProperties, false)
})

test('compact foreman restores bounded current state before audit history', () => {
  const prompt = fs.readFileSync(path.join(EXPERIMENT, 'compact-foreman.txt'), 'utf8')
  const source = prompt.split('\n').find((line) => line.startsWith('SOURCE=')) ?? ''

  assert.match(source, /CURRENT_STATE first/)
  assert.match(source, /append-only audit history only when/)
  assert.match(prompt, /RUNTIME_CORE=/)
  assert.match(prompt, /Refresh bounded CURRENT_STATE after a material state transition/)
})

test('foreman and worker share the same runtime core', () => {
  const foreman = fs.readFileSync(path.join(EXPERIMENT, 'compact-foreman.txt'), 'utf8')
  const worker = fs.readFileSync(path.join(EXPERIMENT, 'worker-envelope.txt'), 'utf8')

  assert.match(foreman, /runtime-core\.md/)
  assert.match(worker, /runtime-core\.md/)
  assert.match(foreman, /Role\/topology experiments must not weaken/)
  assert.match(worker, /Worker role does not redefine/)
})

test('runtime core forbids premature CONTINUE handoff', () => {
  const core = fs.readFileSync(path.join(EXPERIMENT, 'runtime-core.md'), 'utf8')

  assert.match(core, /CONTINUE && WORKED < TARGET/)
  assert.match(core, /FINAL\/HANDOFF FORBIDDEN/)
  assert.match(core, /START \+ TARGET \+ GAP pre-arm remains the baseline fail-safe/)
  assert.match(core, /Append-only is not a universal rule/)
})
