# Overlap Handoff Relay v1 — Experimental Baseline

Status: EXPERIMENTAL / not promoted.
Rollback baseline: serial single-executor pre-arm policy on main / prior Runtime Core.

Goal: reduce handoff idle by waking the successor before the active owner finishes, while preserving exactly-one-owner control semantics.

## General timing model

```text
SUCCESSOR_WAKE_TARGET =
OWNER_ACTIVATED_AT + OWNER_WORK_TARGET - REQUIRED_HANDOFF_LEAD
```

Initial candidate:
- OWNER_WORK_TARGET = 15m
- SUCCESSOR_WAKE_OFFSET = +12m
- NOMINAL_OVERLAP = 3m

Comparison candidates:
- 15/11 => nominal overlap 4m
- 15/12 => nominal overlap 3m
- 15/13 => nominal overlap 2m

For target-ascent dogfood, the same formula may be used with a fixed 3m required lead so only one primary variable changes at a time.

## State machine

`UNASSIGNED -> OWNER -> TRANSFERRING -> RETIRED`

A successor may enter `SHADOW` before ownership transfer:

`SCHEDULED_SUCCESSOR -> SHADOW -> OWNER`

### OWNER
- exactly one execution owns owner-only scheduler/control writes;
- substantive product work continues until the active work target or a legitimate terminal state;
- owner writes a recoverable compact checkpoint before transfer.

### SHADOW
- may read durable state/checkpoints;
- may prepare the next work unit, source material, branch/PR context, and acceptance checks;
- MUST NOT mutate owner-only scheduler/control state;
- MUST NOT claim root completion;
- MUST NOT perform conflicting owner-only product writes unless explicitly assigned a conflict-free read/review unit.

### Transfer
1. Owner finalizes the latest durable checkpoint.
2. Transfer increments `generation`.
3. Durable ownership state records successor as the new OWNER and records `OWNER_ACTIVATED_AT`.
4. Old owner stops owner-only scheduler/control writes immediately and performs close-only work.
5. New owner re-reads durable ownership state and verifies its generation before any owner-only write.
6. Only the new owner schedules the next successor, anchored to its `OWNER_ACTIVATED_AT`, never its earlier shadow wake.

## Hard safety invariants

1. SINGLE OWNER — exactly one owner may mutate owner-only scheduler/control state.
2. SHADOW NO WRITE — shadow cannot perform owner-only scheduler/control writes.
3. GENERATION FENCING — every handoff increments a generation/lease token; stale-generation owner writes must be rejected or fail closed.
4. DURABLE HANDOFF — successor resumes from durable checkpoint/state, not prior chat-response copying.
5. OWNER ACTIVATION ANCHOR — next cycle timing is anchored to `OWNER_ACTIVATED_AT`, not `SHADOW_WAKE_AT`.
6. TRANSFER BEFORE FULL EXIT — once safe fencing exists, old owner may remain alive only for close/read-only work after transfer.

## Fencing requirement / activation gate

Overlap mode MUST NOT be promoted merely because two executions can overlap.

Before active owner transfer is considered safe, the implementation must demonstrate a durable fencing primitive with fail-closed stale-writer behavior. Preferred experiment: GitHub content-state update with current blob SHA / generation check for ownership state, plus a mandatory generation re-read before any scheduler mutation.

Because the scheduler mutation API itself does not expose a compare-and-swap generation precondition, protocol-only scheduler fencing remains a residual race. Until repeated dogfood demonstrates duplicate owner = 0 and scheduler conflict = 0, classify overlap as experimental and keep serial mode as rollback.

## Metrics

Primary:
- HANDOFF_IDLE_GAP_SEC

Also record:
- wake lateness
- successor preparation time
- READY-before-transfer
- ownership transfer time
- actual overlap
- duplicate owner
- scheduler conflict
- stale-owner write blocked/succeeded
- lost continuation
- successor first substantive-work time
- long-run useful-work utilization

Safety acceptance:
- duplicate owner = 0
- scheduler conflict = 0
- stale owner write success = 0
- lost continuation = 0

Promotion principle: choose the shortest overlap that keeps all safety conditions at zero while driving handoff idle close to zero. 15/12 is a baseline candidate, not a permanent rule.
