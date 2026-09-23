# Work Duration Clock v3

Status: EXPERIMENTAL CANDIDATE / required by Runtime Core on this branch.

The duration definition is canonical in Runtime Core:

```text
WORK_DURATION의 Source of Truth는
모델 출력이 아니라 GitHub 서버 timestamp이다.

WORKED =
END_MARKER.created_at
-
START_MARKER.created_at
```

Model-written START/END/elapsed/local-clock strings are display metadata only and are never timing authority.

This file defines only marker/session handling.

## Session protocol

1. Restore only enough bounded runtime state to know canonical automation, marker issue, ownership role, and generation.
2. Immediately before substantive payload work, create:

```text
[WORK_MARKER]
session=<stable unique session id>
phase=START
generation=<current generation>
automation=<canonical automation id>
```

3. Require comment creation success and capture the returned comment id plus GitHub `created_at`.
4. Payload work MUST NOT begin before the valid START marker exists.
5. Persist `start_marker_ref` and `start_created_at`.
6. Continue useful work while OWNER and the program is unfinished.
7. Do not create periodic CHECK markers for duration control. There is no duration target.
8. Create END only when the owner session closes through:
   - `PROGRAM_COMPLETE`; or
   - verified `SUCCESSOR_HANDOFF_COMPLETE`.
9. END marker shape:

```text
[WORK_MARKER]
session=<same session id>
phase=END
generation=<closing generation>
start_marker=<GitHub comment id/ref>
close_gate=<PROGRAM_COMPLETE|SUCCESSOR_HANDOFF_COMPLETE>
```

10. Calculate WORKED only with the canonical formula.
11. When timestamps are shown to the operator, show raw GitHub UTC first and exact KST conversion in parentheses. KST is display-only.

## Duplicate / invalid marker handling

For one logical `session`:
- valid START candidates match expected automation + generation;
- if retries created multiple valid START markers, choose the earliest valid START and persist its comment id as canonical;
- valid END candidates match the same session/generation and reference the canonical START;
- if multiple valid END markers exist, choose the earliest valid END after canonical START;
- no START => `INVALID_SESSION`;
- START without END => `OPEN_SESSION`;
- END before START => `INVALID_SESSION`;
- generation mismatch => stale marker, ignored for duration/ownership evidence.

Once a canonical marker id is persisted, later retries reuse that canonical reference.

## Evidence rule

A WORKED sample is valid only when:
- canonical START and END refs exist;
- both GitHub `created_at` values exist;
- END is after START;
- the END corresponds to a legitimate normal close gate or explicitly recorded abnormal truncation evidence.

WORKED is observational evidence only. It does not grant stop authority and is not used for duration-target promotion.

Legacy duration-target certifications remain forensic history only and MUST NOT govern the current relay.
