# Runtime Core v0.5 — Overlap Baton Relay + Deterministic Owner Bootstrap

Status: EXPERIMENTAL / shared runtime core for topology variants on this branch.

Purpose: define clock authority, wake continuity, ownership, handoff, termination, recovery, and reporting independently from product/role logic.

Normative companion specs:
- `server-observed-work-clock.md`
- `overlap-handoff.md`

## 1. Work-duration invariant — hard / canonical

WORKED uses a paired external-clock hierarchy. Never mix clock sources inside one duration calculation.

Priority 1 — GitHub marker pair:

```text
WORKED =
END_MARKER.created_at
-
START_MARKER.created_at

CLOCK_SOURCE=GITHUB_MARKER
```

Priority 2 — authoritative external current-time pair captured at the real START and END:

```text
WORKED =
END_EXTERNAL_NOW
-
START_EXTERNAL_NOW

CLOCK_SOURCE=AUTHORITATIVE_CURRENT_TIME
```

Use Priority 2 only when a complete GitHub START/END marker timestamp pair cannot be obtained. START_EXTERNAL_NOW must be captured at substantive-work start and END_EXTERNAL_NOW at actual close. Neither may be inferred from model prose, an old DTSTART, last_run_time, a guessed wake time, or any stored schedule metadata.

If neither complete pair exists:

```text
WORKED=UNKNOWN
CLOCK_SOURCE=NONE
```

Model-written START/END/elapsed/local-clock strings remain display metadata only. They MUST NOT drive duration classification, stopping, handoff, promotion, or utilization evidence.

Never compute WORKED from mixed sources such as GitHub START + external-current-time END.

Whenever GitHub server timestamps are shown to the operator, show raw GitHub UTC first and exact Asia/Seoul conversion in parentheses. External-current-time fallback may be shown in its authoritative offset-aware form plus KST display.

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

## 5A. Initial OWNER bootstrap — hard / deterministic

A relay with no concrete durable OWNER MUST NOT remain SHADOW forever.

The bounded state MUST represent initial ownership explicitly:

```text
ownership_state = UNINITIALIZED | OWNED
ownership_epoch = stable bootstrap epoch token
current_owner = NONE | <invocation identity>
current_generation = 0 | positive integer
```

`RECONSTRUCT_ON_WAKE` is not a valid steady-state ownership value. It is only a migration/recovery hint.

### Eligibility

Initial bootstrap is allowed only when all are true:
- program state is CONTINUE;
- no concrete current OWNER exists;
- `current_generation` is absent/0/unresolved;
- no prior valid bootstrap winner exists for the active `ownership_epoch`;
- this invocation has already completed and verified its wake-start +14m prearm;
- this invocation has a durable START_MARKER/comment id.

### Claim protocol

An eligible invocation writes exactly one append-only GitHub issue comment:

```text
[OWNER_BOOTSTRAP_CLAIM]
epoch=<ownership_epoch>
candidate_start_marker_id=<GitHub START marker comment id>
canonical_automation=<canonical automation id>
```

GitHub's returned numeric claim-comment id is the arbitration token.

After the claim is created, every candidate MUST re-read the issue comments and collect all syntactically valid bootstrap claims for the same epoch.

```text
BOOTSTRAP_WINNER =
valid claim with the smallest numeric GitHub claim-comment id
```

Do not use model time, local time, comment-body time strings, or arrival guesses to choose the winner.

The winner alone may materialize:

```text
ownership_state=OWNED
current_owner=start:<candidate_start_marker_id>
current_generation=1
bootstrap_claim_comment_id=<winning claim id>
```

All non-winners remain SHADOW.

### Race/fencing rule

Issue-body writes are not treated as atomic compare-and-swap.

Therefore, before every OWNER-only side effect, the invocation MUST verify BOTH:
1. bounded CURRENT_STATE names its invocation/generation; and
2. deterministic bootstrap/handoff evidence still resolves to the same owner/generation.

If a conflicting state write races with the bootstrap, deterministic append-only evidence wins and the loser fails closed.

The initial winner becomes the first OWNER and may immediately continue substantive product work in the same invocation.

### Migration rule for existing unresolved state

When legacy state contains:

```text
current_owner=RECONSTRUCT_ON_WAKE
current_generation=RECONSTRUCT_ON_WAKE
```

and no concrete recoverable owner can be proven from durable evidence, normalize it to:

```text
ownership_state=UNINITIALIZED
current_owner=NONE
current_generation=0
```

then execute the deterministic claim protocol above.

Do not loop indefinitely in SHADOW merely because legacy state is unresolved.

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
