# Runtime Core v0.4 — Overlap Baton Relay Invariants

Status: EXPERIMENTAL / shared runtime core for topology variants on this branch.

Purpose: define clock authority, wake continuity, ownership, handoff, termination, recovery, and reporting independently from product/role logic.

Normative companion specs:
- `server-observed-work-clock.md`
- `overlap-handoff.md`

## 1. Work-duration invariant — hard / canonical

```text
WORK_DURATION의 Source of Truth는
모델 출력이 아니라 GitHub 서버 timestamp이다.
```

```text
WORKED =
END_MARKER.created_at
-
START_MARKER.created_at
```

Model-written START/END/elapsed/local-clock strings are display metadata only.
They MUST NOT be used for duration classification, stopping, handoff, promotion, or utilization evidence.

If either authoritative marker timestamp is missing or ambiguous:

```text
WORKED = UNKNOWN
```

Never substitute model/local time.

Whenever server timestamps are shown to the operator, show raw GitHub UTC first and exact Asia/Seoul conversion in parentheses. KST is display-only.

## 2. No duration target

There is no minimum/target/planned voluntary work duration.

Work duration is an observed outcome of one of the two normal stop gates:
- `PROGRAM_COMPLETE`
- `SUCCESSOR_HANDOFF_COMPLETE`

Do not sleep, pad, idle, invent work, or stop because a time threshold was reached.
Finishing a subtask, PR, CI wait, checkpoint, or bounded unit is not a normal stop gate.

## 3. Wake-start continuity prearm — hard

Every actual invocation MUST, before substantive payload work, prearm THIS SAME canonical automation to:

```text
PREARM_NEXT = observed_wake_time + 14 minutes
```

Requirements:
- preserve the same canonical automation identity;
- preserve `RRULE:FREQ=HOURLY`;
- preserve `exact_schedule`;
- preserve `enabled=true`;
- verify the returned live/update state;
- do not create a replacement automation.

Each invocation gets exactly one normal scheduler mutation: this wake-start prearm.
After the verified prearm, scheduler mutation is forbidden for the rest of that wake except one safe verification retry when the returned state is malformed or mismatched.

The +14m offset is continuity plumbing. It is not a work-duration target.

## 4. Scheduler lane != ownership lane

```text
PREARM DOES NOT CONFER OWNERSHIP.
```

Every actual invocation, including a SHADOW, may perform the single wake-start +14m prearm.

Substantive authority is separate:
- `OWNER`: may perform owner-authorized shared-state/product side effects.
- `SHADOW`: read/prepare/validate only until durable transfer.
- stale/non-owner generation: fail closed.

A SHADOW prearming the next wake does not become OWNER.

## 5. Durable baton / generation invariant

Every owner cycle has a monotonically increasing `generation`.

Only durable baton/generation transfer confers ownership.

Before every OWNER-only shared-state/control/product write:
1. re-read bounded durable ownership state;
2. verify `role=OWNER` and expected generation;
3. fail closed on mismatch;
4. perform the write;
5. persist evidence/checkpoint as required.

A successor that wakes early remains SHADOW until transfer.

`SUCCESSOR_HANDOFF_COMPLETE` requires all of:
- a real successor invocation;
- successor READY evidence;
- durable baton/ownership transfer;
- generation advance/fencing that makes the predecessor stale.

After transfer, the predecessor immediately stops OWNER-only side effects.

## 6. Normal voluntary stop gates — exactly two

The only normal voluntary stop gates are:

```text
1. PROGRAM_COMPLETE
2. SUCCESSOR_HANDOFF_COMPLETE
```

If the program is unfinished and successor transfer is not confirmed, the current OWNER MUST continue safe useful work.

A missing/late successor is not permission to stop.

## 7. Abnormal interruption states

`BLOCKED`, `RISK`, tool/provider failure, bootstrap fault, authority ambiguity, or platform-enforced truncation are abnormal interruption classifications, not successful normal stop gates.

On abnormal interruption:
- persist the exact evidence;
- preserve the already-prearmed recurring continuation;
- continue any other safe useful work when available;
- never fabricate ownership, completion, or handoff;
- never reinterpret interruption as `SUCCESSOR_HANDOFF_COMPLETE`.

If runtime/role/ownership state cannot be reconstructed, fail closed and report `BOOTSTRAP_FAULT`.

## 8. Marker lifecycle

For each owner work session:
1. create and confirm a unique GitHub START_MARKER immediately before substantive work;
2. capture its GitHub server `created_at`;
3. work continuously while OWNER and program remains unfinished;
4. at `PROGRAM_COMPLETE` or after verified `SUCCESSOR_HANDOFF_COMPLETE`, create the matching END_MARKER;
5. compute WORKED only from GitHub server timestamps.

END_MARKER is terminal bookkeeping for that owner session.
Do not create END merely because a unit, target duration, CI check, or checkpoint finished.

## 9. Useful-work / idle objective

Primary performance objective is high useful-work duty cycle with correctness, ownership safety, recoverability, and continuity as hard floors.

Measure separately where observable:
- WORKED;
- restore/control overhead;
- prearm overhead;
- scheduled_due vs actual wake;
- successor preparation time;
- actual overlap;
- handoff idle gap;
- duplicate owner count;
- scheduler conflict count;
- stale-owner write outcome;
- lost continuation;
- recovery delay after genuine interruption.

Do not optimize idle by weakening ownership or fencing.

## 10. State placement

Stable execution invariants belong in:
- deployed automation prompt; and
- canonical GitHub runtime docs for propagation/recovery.

Mutable runtime state belongs only in bounded durable GitHub state, including:
- current OWNER/SHADOW;
- generation;
- baton/transfer state;
- product checkpoint;
- current task/step;
- current continuation evidence.

Do not duplicate mutable runtime state into the deployed prompt.

## 11. Role independence

These invariants apply to:
- Foreman;
- Foreman/Executor;
- bounded Worker;
- researcher/reviewer;
- future runtime roles.

Role specs define decision rights and product scope.
They MUST NOT redefine clock, scheduler, ownership/fencing, normal stop gates, or recovery semantics.

## 12. Promotion discipline

The +14m overlap-baton runtime remains experimental until repeated dogfood evidence shows:
- zero duplicate owners;
- zero stale-owner shared-state successes;
- zero lost continuations;
- acceptable scheduler conflict rate;
- materially lower handoff idle than serial fallback.

Keep a serial/main rollback path until promotion evidence is sufficient.
