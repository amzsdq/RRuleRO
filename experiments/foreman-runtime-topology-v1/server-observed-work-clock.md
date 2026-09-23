# Work Duration Clock v2

Status: EXPERIMENTAL CANDIDATE / required by Runtime Core on this branch.

The duration definition is not redefined here. Runtime Core has the single canonical invariant:

```text
WORK_DURATION의 Source of Truth는
모델 출력이 아니라 GitHub 서버 timestamp이다.

WORKED =
END_MARKER.created_at
-
START_MARKER.created_at
```

모델이 작성한 시간 문자열은 작업시간 판정에 사용하지 않는다.

This file only defines marker/session handling needed to apply that invariant safely.

## Session protocol

1. Restore only enough bounded runtime state to know the active target, scheduler mode, marker issue, and ownership generation.
2. Before substantive payload work, create:

```text
[WORK_MARKER]
session=<stable unique session id>
phase=START
generation=<current generation>
automation=<canonical automation id>
```

3. Require comment creation success and capture the returned comment id plus GitHub `created_at`. Payload work MUST NOT start before the valid START marker exists.
4. Persist `start_marker_ref` and `start_created_at`.
5. Run scheduler math from the server timestamp required by the active scheduler mode.
6. Continue useful work.
7. Before a normal CONTINUE handoff/final, create a CHECK marker for the same session/generation. If `CHECK.created_at - START.created_at < TARGET`, final/handoff is forbidden.
8. At actual terminal/handoff, create:

```text
[WORK_MARKER]
session=<same session id>
phase=END
generation=<current generation>
start_marker=<GitHub comment id/ref>
status=<CONTINUE|PROGRAM_COMPLETE|BLOCKED|RISK>
```

9. Calculate WORKED only with the canonical formula.
10. Human-readable START/END values, when shown, are derived from marker `created_at`.

## Duplicate / invalid marker handling

For one logical `session`:
- valid START candidates are matching START markers for the expected automation + generation;
- if retries created multiple valid START markers, choose the earliest valid START and persist its comment id as canonical;
- valid END candidates must match the same session/generation and reference the canonical START;
- if multiple valid END markers exist, choose the earliest valid END after canonical START;
- no START => `INVALID_SESSION`;
- START without END => `OPEN_SESSION`;
- END before START => `INVALID_SESSION`;
- generation mismatch => stale marker, ignored for ownership/duration certification.

Once a canonical marker id is persisted, later retries MUST reuse that canonical reference rather than silently selecting another marker.

## Certification rule

A duration sample counts toward target promotion only when:
- canonical START and END GitHub marker refs exist;
- both GitHub `created_at` values are available;
- END is after START;
- WORKED meets/exceeds TARGET for normal CONTINUE;
- no material work loss or forced-runtime ambiguity invalidates the sample;
- the following continuation is accounted for when the active experiment requires it.

Legacy model-authored START/END/WORKED records remain forensic history only unless independently server-verifiable. They MUST NOT be used as strict duration-certification evidence.
