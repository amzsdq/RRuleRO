# Overlap Handoff Relay v2 — +14m Baton Prearm

Status: EXPERIMENTAL / not promoted.
Rollback baseline: serial single-executor behavior on main.

Goal: minimize handoff idle while preserving exactly-one-owner substantive authority.

## Wake model

Every actual invocation performs exactly one continuity prearm before substantive work:

```text
PREARM_NEXT = observed_wake_time + 14 minutes
```

The same canonical automation is updated while preserving recurring RRULE, exact_schedule, and enabled state.

This +14m value is a scheduler lead/continuity parameter, NOT a work-duration target.

A SHADOW may perform the wake-start prearm.

```text
PREARM DOES NOT CONFER OWNERSHIP.
```

## Initial ownership bootstrap

A fresh relay cannot require a predecessor baton before any OWNER exists.

When bounded state is UNINITIALIZED, each eligible wake may append one `OWNER_BOOTSTRAP_CLAIM` for the active ownership epoch after verified +14m prearm and durable START_MARKER creation. The valid claim with the smallest numeric GitHub claim-comment id is the deterministic winner. The winner becomes OWNER generation 1; every other claimant remains SHADOW.

Legacy `RECONSTRUCT_ON_WAKE` with no provable concrete predecessor is migrated to UNINITIALIZED rather than repeated indefinitely.

This bootstrap election is used only to establish the first concrete OWNER for an epoch. Later ownership changes use the normal durable baton/generation transfer.

## State machine

`UNASSIGNED -> OWNER -> TRANSFERRING -> RETIRED`

A successor may wake before transfer:

`SCHEDULED_SUCCESSOR -> SHADOW -> OWNER`

### OWNER
- exactly one current generation owns substantive shared-state/product/control writes;
- keeps doing safe useful work while the program is unfinished and no verified successor transfer exists;
- writes a recoverable compact checkpoint before transfer;
- may close normally only through PROGRAM_COMPLETE or SUCCESSOR_HANDOFF_COMPLETE.

### SHADOW
- performs its single wake-start +14m prearm;
- may read durable state/checkpoints;
- may prepare the next work unit, sources, branch/PR context, and acceptance checks;
- may write only immutable own evidence when needed;
- MUST NOT perform OWNER-only shared-state/product/control writes;
- MUST NOT claim completion or ownership.

### Transfer
1. Successor has actually woken and produced READY evidence.
2. Current OWNER finalizes the latest durable checkpoint.
3. Durable transfer advances `generation`.
4. Durable ownership state records successor as new OWNER.
5. Old OWNER immediately stops OWNER-only side effects.
6. New OWNER re-reads durable state and verifies its generation before any OWNER-only write.
7. Old OWNER performs only bounded close bookkeeping and creates its END marker.
8. The new OWNER continues work; its already-performed wake-start prearm provides the next continuation.

## Hard safety invariants

1. SINGLE OWNER — exactly one generation may perform OWNER-only substantive writes.
2. SHADOW PREARM ALLOWED — scheduler continuity prearm is permitted before ownership.
3. PREARM != OWNERSHIP — scheduler mutation never grants substantive authority.
4. GENERATION FENCING — every handoff advances generation; stale owner writes fail closed.
5. DURABLE HANDOFF — successor resumes from durable state/checkpoint, not prior chat-response copying.
6. READY BEFORE TRANSFER — successor must be a real invocation, not a planned future wake.
7. TRANSFER BEFORE PREDECESSOR CLOSE — predecessor cannot normally END before durable transfer is confirmed.
8. NO DURATION STOP — elapsed time, target minutes, PR completion, or CI completion do not grant stop authority.
9. TWO NORMAL STOP GATES — PROGRAM_COMPLETE or SUCCESSOR_HANDOFF_COMPLETE only.

## Missing/late successor

If successor wake/READY/transfer is late or absent:
- current OWNER keeps doing safe useful work;
- already-prearmed continuation remains in force;
- do not create END merely because the expected handoff time passed.

## Scheduler mutation rule

Each invocation gets exactly one normal scheduler mutation: wake-start +14m prearm.

After that, no further scheduler mutation is allowed in the same wake except one safe verification retry if the returned state is malformed/mismatched.

This separation reduces scheduler races while allowing SHADOW continuity insurance.

## Fencing requirement / activation gate

Overlap mode MUST NOT be promoted merely because concurrent wakes are possible.

Before promotion, repeated dogfood must demonstrate fail-closed stale-writer behavior and acceptable scheduler behavior.

Because scheduler mutation itself has no atomic generation CAS, scheduler continuity is intentionally separated from substantive ownership fencing.

## Metrics

Primary:
- HANDOFF_IDLE_GAP_SEC

Also record:
- scheduled due vs actual wake;
- successor preparation time;
- READY-before-transfer;
- ownership transfer latency;
- actual overlap;
- duplicate owner;
- scheduler conflict;
- stale-owner write blocked/succeeded;
- lost continuation;
- successor first substantive-work time;
- long-run useful-work utilization;
- WORKED from GitHub server markers.

Safety acceptance:
- duplicate owner = 0;
- stale owner substantive write success = 0;
- lost continuation = 0;
- scheduler conflicts remain bounded/non-destructive.

Promotion principle: prefer the simplest overlap-baton mechanism that keeps safety counters at zero and materially reduces handoff idle. The +14m prearm is the current experimental baseline, not a permanent architecture constant.
