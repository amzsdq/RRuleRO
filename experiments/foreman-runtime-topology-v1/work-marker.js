'use strict'

function parseWorkMarker(body) {
  if (typeof body !== 'string') return null
  const lines = body.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines[0] !== '[WORK_MARKER]') return null

  const fields = {}
  for (const line of lines.slice(1)) {
    const index = line.indexOf('=')
    if (index <= 0) continue
    fields[line.slice(0, index).trim()] = line.slice(index + 1).trim()
  }

  if (!fields.session || !fields.phase || fields.generation == null) return null
  if (!['START', 'CHECK', 'END'].includes(fields.phase)) return null

  const generation = Number(fields.generation)
  if (!Number.isInteger(generation) || generation < 0) return null

  return {
    session: fields.session,
    phase: fields.phase,
    generation,
    automation: fields.automation || null,
    startMarker: fields.start_marker || null,
    status: fields.status || null,
  }
}

function toMarker(comment) {
  const marker = parseWorkMarker(comment?.body)
  if (!marker) return null
  const createdAt = new Date(comment.created_at)
  if (!Number.isFinite(createdAt.getTime())) return null
  return {
    ...marker,
    id: String(comment.id),
    createdAt,
    createdAtRaw: comment.created_at,
  }
}

function resolveWorkSession(comments, { session, generation, automation = null }) {
  const markers = comments
    .map(toMarker)
    .filter(Boolean)
    .filter((marker) =>
      marker.session === session &&
      marker.generation === generation &&
      (automation == null || marker.automation === automation)
    )
    .sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))

  const starts = markers.filter((marker) => marker.phase === 'START')
  if (starts.length === 0) {
    return { state: 'INVALID_SESSION', reason: 'NO_VALID_START' }
  }

  const start = starts[0]
  const checks = markers.filter(
    (marker) => marker.phase === 'CHECK' && marker.createdAt >= start.createdAt,
  )
  const ends = markers.filter(
    (marker) =>
      marker.phase === 'END' &&
      marker.createdAt >= start.createdAt &&
      marker.startMarker === start.id,
  )

  if (ends.length === 0) {
    return {
      state: 'OPEN_SESSION',
      start,
      latestCheck: checks.at(-1) || null,
      elapsedAtLatestCheckSec: checks.length
        ? Math.floor((checks.at(-1).createdAt - start.createdAt) / 1000)
        : null,
    }
  }

  const end = ends[0]
  return {
    state: 'CLOSED',
    start,
    end,
    latestCheck: checks.filter((marker) => marker.createdAt <= end.createdAt).at(-1) || null,
    workedSec: Math.floor((end.createdAt - start.createdAt) / 1000),
  }
}

module.exports = {
  parseWorkMarker,
  resolveWorkSession,
}
