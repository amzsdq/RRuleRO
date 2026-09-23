# Runtime Core v0.2 — Experimental Common Invariants

Status: EXPERIMENTAL / shared by all topology variants on this branch.

Purpose: keep liveness, useful-work duration, scheduling, termination, recovery, timing evidence, and handoff ownership independent from Foreman/Worker role design.

Normative companion specs:
- `server-observed-work-clock.md`
- `overlap-handoff.md`

## Common wake contract

1. Restore the bounded current runtime state first: active target, scheduler mode, marker issue, prior result pointer, ownership generation, and handoff mode. Read long audit history only when bounded state is missing, stale, ambiguous, or forensic reconstruction is required.
2. Before substantive payload work, create a GitHub `[WORK_MARKER] phase=START` for a stable session id and current generation. Require successful creation and capture the GitHub comment id + server `created_at`.
3. Payload work MUST NOT begin before the valid START marker exists. Model-authored clock strings do not establish START.
4. Anchor the scheduler to `START_MARKER.created_at` and mutate the configured scheduler exactly once for that owner cycle. Inspect the mutation result.
5. Perform real useful payload work continuously. Finishing one unit, opening/merging a PR, posting a checkpoint, answering one research question, or waiting on CI does not end a CONTINUE wake; select the next safe useful unit.
6. Never sleep, pad, idle, or manufacture work merely to satisfy a duration target.
7. Before any normal CONTINUE final/handoff, create a server-timestamped CHECK marker for the same session/generation. Run the terminal gate using `CHECK.created_at - START.created_at`.
8. At actual terminal/handoff, create the matching END marker and derive `SERVER_OBSERVED_WORK_DURATION = END.created_at - START.created_at`.
9. Keep hot current state bounded; preserve append-only marker/audit/experiment evidence separately when causal history matters.

## Work-clock invariant — hard

GitHub issue-comment `created_at` is the duration authority for this experiment.

Model-written values such as:

```text
START=22:01
END=22:12
WORKED=11m
```

are descriptive only and MUST NOT satisfy a target gate.

Strict duration certification requires canonical GitHub START/END marker refs and their server timestamps. Legacy self-reported duration history is `LEGACY_MODEL_TIME_UNVERIFIED` unless independently server-verifiable.

See `server-observed-work-clock.md` for duplicate/invalid marker handling.

## Terminal gate — hard

A normal CONTINUE wake may not end below the active useful-work target.

Pseudo-rule:

```text
SERVER_ELAPSED_AT_CHECK = CHECK_MARKER.created_at - START_MARKER.created_at

CONTINUE && SERVER_ELAPSED_AT_CHECK < TARGET
=> FINAL/HANDOFF FORBIDDEN
=> choose the next safe useful unit and continue
```

At finalization, the END marker must also show:

```text
SERVER_OBSERVED_WORK_DURATION >= TARGET
```

for a normal CONTINUE result.

Early end below target is allowed only for PROGRAM_COMPLETE, BLOCKED, or RISK. BLOCKED/RISK require reasonable alternative useful paths to be exhausted and the concrete evidence recorded.

A platform/tool hard truncation is not reclassified as a valid normal handoff.

## Scheduler modes

### SERIAL_PREARM_FIXED_GAP — rollback/baseline

One owner execution schedules the next wake from server-observed START:

```text
NEXT_WAKE = START_MARKER.created_at + TARGET + GAP
```

This remains the rollback baseline until an overlap mode is demonstrated safe.

### OVERLAP_HANDOFF_EXPERIMENT — candidate

General rule:

```text
SUCCESSOR_WAKE_TARGET =
OWNER_ACTIVATED_AT + OWNER_WORK_TARGET - REQUIRED_HANDOFF_LEAD
```

Initial baseline candidate is 15/12: 15m owner target, successor wake at +12m, nominal overlap 3m.

Overlap mode obeys all invariants in `overlap-handoff.md`:
- SINGLE OWNER
- SHADOW NO WRITE
- GENERATION FENCING
- DURABLE HANDOFF
- OWNER ACTIVATION ANCHOR
- TRANSFER BEFORE FULL EXIT

A shadow wake is preparation-only until durable ownership transfer is verified.

The next cycle is anchored to the new `OWNER_ACTIVATED_AT`, never the earlier shadow wake.

Because scheduler mutation does not expose an atomic generation compare-and-swap precondition, overlap remains experimental until repeated evidence shows zero duplicate owners, zero scheduler conflicts, zero stale-owner write success, and zero lost continuations. Main/serial mode remains rollback.

## Ownership / fencing invariant

Every owner cycle has a monotonically increasing `generation`.

Before an owner-only scheduler/control write:
1. re-read bounded durable ownership state;
2. verify `role=OWNER` and expected generation;
3. fail closed on mismatch;
4. perform the write;
5. persist the resulting evidence.

After transfer, the old owner stops owner-only writes immediately.

Where GitHub content-state is used for ownership, prefer current blob SHA + generation checks so stale state writes fail rather than silently overwrite.

## Idle-time invariant

Primary objective is useful-work duty cycle, not duration in isolation.

Measure:
- server_observed_work_duration
- control/restore overhead
- end-to-next-owner-substantive-work idle
- scheduled_due vs actual_start jitter
- successor preparation time
- actual overlap
- handoff idle gap
- duplicate owner
- scheduler conflict
- stale-owner write outcome
- lost continuation
- recovery delay after genuine truncation

For overlap experiments, primary performance metric is `HANDOFF_IDLE_GAP_SEC`, subject to all safety counters remaining zero.

Do not optimize idle by accepting ambiguous ownership or unsafe scheduler churn.

## Role independence

These invariants apply equally to:
- Foreman
- Foreman/Executor
- bounded Worker
- researcher/reviewer
- future runtime roles

Role specs define decision rights, assignment scope, and product work. They do not redefine clock, duration, scheduler, ownership, terminal, or recovery semantics.

## State semantics

Use the mutation model that matches the state:
- bounded mutable snapshot/pointer for hot current state;
- append-only marker/event/result history for experiments, audit, and causal reconstruction;
- ordinary Git-tracked replacement for evolving specs/code/config;
- explicit supersession when a prior conclusion is corrected.

Append-only is not a universal rule.

## Promotion discipline

Treat these as separable experimental dimensions:
- work-clock changes require measurement-integrity evidence;
- scheduler/handoff changes require liveness + ownership evidence;
- topology changes require coordination/useful-work evidence.

Do not attribute an outcome to topology when clock/scheduler/ownership invariants changed in the same comparison window.

Keep main and serial scheduling as rollback until repeated dogfood evidence supports promotion.
