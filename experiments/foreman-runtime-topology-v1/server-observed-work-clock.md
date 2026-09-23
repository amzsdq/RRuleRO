# Server-Observed Work Clock v1

Status: EXPERIMENTAL CANDIDATE / required by Runtime Core on this branch.

Purpose: eliminate model-authored START/END arithmetic as duration evidence. GitHub issue-comment `created_at` is the external observation clock.

## Terms

- `SERVER_OBSERVED_WORK_DURATION`: elapsed wall-clock time between the GitHub server timestamps of one valid START marker and one valid END marker.
- This is not CPU time or pure reasoning time. It includes API/tool latency and other activity inside the observed work window.
- Model-written clock strings are labels only and MUST NOT satisfy a duration gate.

## Session protocol

1. Restore only enough bounded runtime state to know the active target, scheduler mode, marker issue, and ownership generation.
2. Before substantive payload work, create a GitHub issue comment:

```text
[WORK_MARKER]
session=<stable unique session id>
phase=START
generation=<current generation>
automation=<canonical automation id>
```

3. Require comment creation success and capture the returned comment id plus GitHub `created_at`. Payload work MUST NOT start before the valid START marker exists.
4. Store `start_marker_ref` and `start_created_at` in bounded hot state.
5. Run the scheduler mutation required by the active scheduler mode, anchored to `START_MARKER.created_at`, not a model-authored time.
6. Continue useful work.
7. When considering a normal CONTINUE handoff, create a CHECK marker for the same session. Use its GitHub `created_at` as the external current-time observation. If `CHECK.created_at - START.created_at < TARGET`, final/handoff is forbidden and useful work continues.
8. At actual terminal/handoff, create:

```text
[WORK_MARKER]
session=<same session id>
phase=END
generation=<current generation>
start_marker=<GitHub comment id/ref>
status=<CONTINUE|PROGRAM_COMPLETE|BLOCKED|RISK>
```

9. Compute only from GitHub timestamps:

```text
SERVER_OBSERVED_WORK_DURATION =
END_MARKER.created_at - START_MARKER.created_at
```

10. Persist marker refs and computed duration. Human-readable START/END values, when shown, are derived from those server timestamps.

## Duplicate / invalid marker handling

For one logical `session`:
- valid START candidates are matching START markers for the expected automation + generation;
- if retries created multiple valid START markers, choose the earliest valid START and persist its comment id as canonical;
- valid END candidates must match the same session/generation and reference the canonical START;
- if multiple valid END markers exist, choose the earliest valid END after canonical START;
- no START => `INVALID_SESSION`;
- START without END => `OPEN_SESSION`;
- END before START => `INVALID_SESSION`;
- generation mismatch => marker is stale and ignored for ownership/duration certification.

Once a canonical marker id is persisted in hot state, later retries MUST reuse that canonical reference rather than silently selecting a different marker.

## Certification rule

A duration sample counts toward target promotion only when:
- canonical START and END GitHub marker refs exist;
- both GitHub `created_at` values are available;
- END is after START;
- observed duration meets/exceeds TARGET for normal CONTINUE;
- no material work loss or forced-runtime ambiguity invalidates the sample;
- the following continuation is accounted for when the active experiment requires it.

Legacy self-reported `START/END/WORKED` records may remain forensic history but are `LEGACY_MODEL_TIME_UNVERIFIED` unless independently server-verifiable. They MUST NOT be used as strict duration-certification evidence.
