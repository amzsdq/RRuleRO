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

test('compact foreman restores bounded current state before append-only audit history', () => {
  const prompt = fs.readFileSync(path.join(EXPERIMENT, 'compact-foreman.txt'), 'utf8')
  const source = prompt.split('\n').find((line) => line.startsWith('SOURCE=')) ?? ''

  assert.match(source, /CURRENT_STATE first/)
  assert.match(source, /append-only audit history only when/)
  assert.match(prompt, /CURRENT_STATE\.scheduler/)
  assert.match(prompt, /Refresh bounded CURRENT_STATE after a material state transition/)
})
