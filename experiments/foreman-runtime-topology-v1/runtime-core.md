# Runtime Core v0.6 — Owner-Activated Successor Handoff + Recovery Fencing

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

## 1.5 Invocation lifecycle vs relay lifecycle — hard

Relay-program continuity and one ChatGPT invocation's lifecycle are distinct, but an active OWNER MUST NOT voluntarily finalize merely because it has produced a checkpoint, finished a unit, or prearmed a successor.

- `STATUS=CONTINUE` means the overall relay/program remains unfinished.
- While this invocation is the current OWNER, a user-visible final response is a voluntary close and is allowed only after `PROGRAM_COMPLETE` or verified `SUCCESSOR_HANDOFF_COMPLETE`.
- A SHADOW that was not selected, became stale, or lost deterministic successor arbitration may close without affecting program continuity because it never owned the baton.
- Platform/runtime forced termination can still occur outside model control. That is `ABNORMAL_INTERRUPTION`, never a normal handoff. Recovery must use durable liveness/lease evidence and generation fencing.
- Never rewrite an abnormal interruption as a successful close merely to make reporting neat.

## 2. No duration target

There is no minimum/target/planned voluntary work duration.

Work duration is an observed outcome of one of the two normal stop gates:
- `PROGRAM_COMPLETE`
- `SUCCESSOR_HANDOFF_COMPLETE`

Do not sleep, pad, idle, invent work, or stop because a time threshold was reached.
Finishing a subtask, PR, CI wait, checkpoint, or bounded unit is not a normal stop gate.

## 3. Owner-activated successor scheduling — hard

Scheduler mutation belongs to the substantive OWNER, not to every wake.

A newly activated OWNER MUST arm exactly one future successor wake on THIS SAME canonical automation after ownership is durably verified.

The wake delay is a mutable empirical runtime parameter from bounded durable state:

```text
SUCCESSOR_WAKE_AT =
OWNER_ACTIVATED_AT
+
successor_wake_delay
```

Current experiments may use 14 minutes, but +14m is NOT a permanent invariant.

Requirements:
- preserve the same canonical automation identity;
- preserve the recurring RRULE and exact-schedule semantics required by the active runtime;
- verify the returned scheduler state;
- do not create a replacement automation merely for normal continuation;
- persist `scheduler_armed_generation=<current_generation>` after verified arming;
- do not arm twice for the same generation except one corrective retry for a malformed/mismatched returned state.

A wake that starts as SHADOW MUST NOT mutate the scheduler.

After a SHADOW becomes OWNER through durable transfer/recovery, it immediately performs the one owner-activation scheduler arm for its new generation.

## 4. Scheduler lane follows ownership

```text
SCHEDULER_WRITE_AUTHORITY = CURRENT_OWNER_GENERATION
```

- OWNER: may perform the single owner-activation successor arm for its generation.
- SHADOW: no scheduler mutation.
- stale/non-owner generation: no scheduler mutation.
- scheduler arming never creates ownership; ownership must already be durable before the arm.

This restores single-scheduler-writer semantics and prevents overlapping wakes from racing on the canonical DTSTART.

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

## 5B. Steady-state successor handoff — hard

Every invocation has a unique durable identity derived from its START_MARKER:

```text
INVOCATION_ID = start:<START_MARKER_COMMENT_ID>
```

On wake, an invocation MUST compare its identity with bounded/deterministic ownership evidence.

### Current OWNER wake/continuation

If `INVOCATION_ID == current_owner` and generation matches, the invocation is OWNER and continues work.

### Successor wake

If another concrete OWNER already exists, the new invocation starts as SHADOW.

The SHADOW:
1. reconstructs bounded durable state;
2. prepares the immediate next safe work unit;
3. appends exactly one immutable READY event:

```text
[SUCCESSOR_READY]
expected_owner=<current_owner>
expected_generation=<g>
candidate_start_marker_id=<self START id>
checkpoint_ref=<compact ref or NONE>
```

For a given source generation, the deterministic candidate is the valid READY event with the smallest numeric GitHub comment id, unless a prior valid generation-advance event already selected another successor.

The SHADOW remains read/prepare-only and polls durable state/evidence while its invocation remains available. It does not schedule the next wake and does not perform OWNER-only product/control writes.

### Owner transfer

The current OWNER periodically re-reads bounded ownership and READY evidence after each bounded useful unit and before starting another long/risky unit.

When a valid deterministic successor READY exists, the OWNER:
1. persists a compact handoff checkpoint;
2. appends one immutable transfer event:

```text
[TRANSFER_COMMIT]
from_owner=<owner>
from_generation=<g>
ready_comment_id=<selected READY id>
to_owner=start:<successor START id>
to_generation=<g+1>
```

3. re-reads generation-advance evidence;
4. if this TRANSFER_COMMIT is the deterministic valid advance event for generation g, projects bounded state to the new OWNER/generation;
5. immediately stops OWNER-only side effects;
6. performs bounded close bookkeeping only.

The successor becomes OWNER only after it observes a valid generation-advance event selecting its own START identity and generation. It then re-reads bounded state, verifies fencing, and performs the one owner-activation successor schedule arm for its new generation before substantive OWNER work.

### Generation-advance arbitration

For each source generation g, authoritative ownership advancement is append-only.

A valid `TRANSFER_COMMIT` or valid `ORPHAN_RECOVERY_COMMIT` is a generation-advance event. If more than one valid advance event races for the same source generation, the smallest numeric GitHub comment id wins. Issue-body write order never overrides append-only generation-advance arbitration.

Before every OWNER-only side effect, resolve the authoritative generation chain and fail closed if the bounded projection disagrees.

## 5C. Orphaned OWNER recovery — abnormal but self-healing

A predecessor may disappear because the platform/runtime ended its invocation before normal handoff. A successor MUST NOT remain SHADOW forever in that case.

Each OWNER generation must emit immutable liveness evidence:
- `OWNER_ACTIVATED` when ownership becomes active;
- `OWNER_HEARTBEAT` after each material bounded unit and before/after long waits when practical;
- transfer/program-complete events when leaving normally.

Bounded state carries a provisional empirical parameter:

```text
orphan_timeout_sec
```

A SHADOW may attempt orphan recovery only when:
1. it has already emitted SUCCESSOR_READY for the current owner/generation;
2. no valid generation-advance event exists yet;
3. it creates a durable `RECOVERY_PROBE` and obtains its authoritative server time;
4. the latest valid liveness evidence for the current owner/generation is older than `orphan_timeout_sec` at the probe time.

It then appends:

```text
[ORPHAN_RECOVERY_CLAIM]
expected_owner=<owner>
expected_generation=<g>
candidate_start_marker_id=<self START id>
ready_comment_id=<self READY id>
recovery_probe_comment_id=<probe id>
latest_owner_liveness_comment_id=<id>
```

If multiple valid recovery claims exist, the smallest numeric claim comment id is the recovery winner.

The winner appends:

```text
[ORPHAN_RECOVERY_COMMIT]
from_owner=<stale owner>
from_generation=<g>
claim_comment_id=<winning recovery claim id>
to_owner=start:<candidate START id>
to_generation=<g+1>
```

The valid recovery commit participates in the same generation-advance arbitration as a normal TRANSFER_COMMIT.

Once the recovery commit wins, the old generation is fenced. If the predecessor was merely slow rather than dead, its next OWNER-only write MUST fail closed after re-reading the generation chain.

Orphan recovery is an abnormal continuity mechanism, not a normal handoff success.

## 6. Normal voluntary stop gates — exactly two

The only normal voluntary stop gates are:

```text
1. PROGRAM_COMPLETE
2. SUCCESSOR_HANDOFF_COMPLETE
```

If the program is unfinished and successor transfer is not confirmed, the current OWNER MUST continue safe useful work.

A missing/late successor is not permission for a live OWNER to stop. If the OWNER disappears abnormally, a READY SHADOW may recover only through the fenced orphan-recovery protocol.

## 7. Abnormal interruption states

`BLOCKED`, `RISK`, tool/provider failure, bootstrap fault, authority ambiguity, or platform-enforced truncation are abnormal interruption classifications, not successful normal stop gates.

On abnormal interruption:
- persist the exact evidence;
- preserve the already-prearmed recurring continuation;
- continue any other safe useful work when available;
- never fabricate ownership, completion, or handoff;
- never reinterpret interruption as `SUCCESSOR_HANDOFF_COMPLETE`.

If runtime/role/ownership state cannot be reconstructed, fail closed and report `BOOTSTRAP_FAULT`.

## 7A. Bounded self-healing authority

For this experimental relay, a recoverable runtime/control defect is not by itself a reason to remain BLOCKED when a safe local repair is available.

When execution evidence shows that relay mechanics are failing or looping, the active invocation may:
1. diagnose the smallest concrete cause from durable evidence;
2. patch the experimental RRuleRO runtime/role/handoff docs and, when required for semantic alignment, update THIS SAME deployed canonical automation prompt;
3. preserve product acceptance criteria, canonical automation identity, single-owner fencing, append-only generation arbitration, and user pause/stop authority;
4. verify the repaired state/mechanism;
5. continue the relay under the repaired rule in the same or next recoverable invocation.

Self-healing MUST NOT:
- weaken ownership/generation fencing merely to make progress;
- fabricate READY/transfer/liveness evidence;
- create uncontrolled replacement relay automations;
- override an explicit operator PAUSE/STOP;
- merge experimental topology into main solely because a repair appears to work once;
- mutate unrelated repositories or user settings.

If multiple repair options exist, prefer the smallest proven change that removes the observed failure mode. Record material runtime repairs in the topology experiment ledger (#73) and project the current operational state in #72.

## 8. Invocation / marker lifecycle

For each invocation:
1. create a unique START_MARKER and derive `INVOCATION_ID=start:<comment id>`;
2. read bounded state + append-only ownership evidence before deciding OWNER/SHADOW;
3. if no owner exists, run initial bootstrap;
4. if another owner exists, become SHADOW, prepare, and publish SUCCESSOR_READY;
5. if selected by TRANSFER_COMMIT or ORPHAN_RECOVERY_COMMIT, become OWNER at generation g+1;
6. on OWNER activation, emit OWNER_ACTIVATED, arm exactly one successor wake for the new generation, then work continuously;
7. after each bounded material unit, emit/refresh owner liveness and check for READY successor evidence;
8. on normal transfer, old OWNER emits END only after durable transfer; on PROGRAM_COMPLETE, emit END after completion bookkeeping;
9. a SHADOW that loses arbitration may close as obsolete without an OWNER END marker;
10. abnormal runtime disappearance is recovered by lease/liveness fencing rather than retroactively fabricated END.

WORKED for a closed OWNER session uses the highest-priority complete authoritative clock pair defined in section 1.

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

The owner-activated overlap-baton runtime remains experimental until repeated dogfood evidence shows:
- zero duplicate owners;
- zero stale-owner shared-state successes;
- zero lost continuations;
- acceptable scheduler conflict rate;
- materially lower handoff idle than serial fallback.

Keep a serial/main rollback path until promotion evidence is sufficient.
