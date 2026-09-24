# Overlap Handoff Relay v3 — Owner-Activated Successor Baton

Status: EXPERIMENTAL / not promoted.
Rollback baseline: serial single-executor behavior on main.

Goal: minimize inter-run idle while preserving exactly-one-owner substantive and scheduler authority.

## 1. Identity

Every invocation creates a durable START_MARKER and derives:

```text
INVOCATION_ID=start:<START_MARKER_COMMENT_ID>
```

That identity is never inherited from an earlier invocation.

## 2. Scheduler ownership

Only the current OWNER generation may mutate the canonical scheduler.

A newly activated OWNER arms exactly one successor wake using the bounded empirical parameter:

```text
SUCCESSOR_WAKE_AT =
OWNER_ACTIVATED_AT
+
successor_wake_delay
```

Current state may use 14m as an experiment, but it is not a permanent invariant.

SHADOW:
- does NOT mutate scheduler;
- does NOT inherit predecessor scheduler authority.

After transfer/recovery, the new OWNER immediately arms the next successor for its own generation.

## 3. Initial bootstrap

When no concrete owner exists:
- eligible invocation writes OWNER_BOOTSTRAP_CLAIM;
- smallest valid numeric GitHub claim comment id wins;
- winner becomes generation 1 OWNER;
- winner emits OWNER_ACTIVATED and arms the first successor.

Bootstrap is used only for the first concrete owner of an ownership epoch.

## 4. Normal steady-state handoff

State sequence:

```text
OWNER(g)
  -> SUCCESSOR_AWAKE(SHADOW)
  -> SUCCESSOR_READY
  -> TRANSFER_COMMIT
  -> OWNER(g+1)
```

### SHADOW

A new wake seeing another concrete OWNER:
1. restores bounded state;
2. prepares the immediate next safe unit;
3. appends exactly one immutable SUCCESSOR_READY:

```text
[SUCCESSOR_READY]
expected_owner=<owner>
expected_generation=<g>
candidate_start_marker_id=<self START id>
checkpoint_ref=<ref|NONE>
```

For a source generation, the smallest valid READY comment id is the deterministic candidate unless an earlier valid generation-advance event already selected a successor.

The SHADOW may read/prepare/poll only. It may not perform OWNER-only product/control writes and may not schedule another wake.

### OWNER

A live OWNER:
- continues useful work;
- emits liveness after bounded material units;
- re-reads READY evidence after each bounded unit and before another long/risky unit.

When deterministic READY exists:
1. persist compact checkpoint;
2. append immutable TRANSFER_COMMIT;
3. re-read append-only generation-advance evidence;
4. if the commit wins arbitration, project bounded state to successor/g+1;
5. stop OWNER-only writes immediately;
6. close only with bounded bookkeeping.

TRANSFER_COMMIT form:

```text
[TRANSFER_COMMIT]
from_owner=<owner>
from_generation=<g>
ready_comment_id=<selected ready>
to_owner=start:<successor START id>
to_generation=<g+1>
```

### New OWNER

The successor becomes OWNER only after observing a valid winning generation-advance event selecting its own START identity. Then it:
- verifies bounded projection + append-only evidence;
- emits OWNER_ACTIVATED;
- arms exactly one next successor wake for its new generation;
- starts OWNER work.

## 5. Generation arbitration

For each source generation, authoritative advancement is append-only.

Valid event types:
- TRANSFER_COMMIT
- ORPHAN_RECOVERY_COMMIT

If valid advance events race for the same source generation, the smallest numeric GitHub comment id wins.

Issue-body update order is only a projection; it never overrides append-only arbitration.

Every OWNER-only write must resolve the authoritative generation chain first.

## 6. Abnormal predecessor loss / orphan recovery

A Scheduled Task invocation can disappear before normal handoff. This must not leave SHADOW forever.

OWNER liveness evidence:
- OWNER_ACTIVATED
- OWNER_HEARTBEAT
- later owner-specific material checkpoint/progress explicitly tagged with owner+generation
- normal TRANSFER_COMMIT / PROGRAM_COMPLETE terminal evidence

A READY SHADOW may recover only if:
1. no generation-advance event exists;
2. it writes RECOVERY_PROBE and obtains authoritative server time;
3. the latest valid owner liveness for the source generation is older than bounded `orphan_timeout_sec`.

Then it writes ORPHAN_RECOVERY_CLAIM. Smallest valid numeric claim id wins.

Winner writes ORPHAN_RECOVERY_COMMIT:

```text
[ORPHAN_RECOVERY_COMMIT]
from_owner=<stale owner>
from_generation=<g>
claim_comment_id=<winning claim>
to_owner=start:<candidate START id>
to_generation=<g+1>
```

That commit joins normal generation arbitration. Once it wins, the stale owner generation is fenced. A merely slow predecessor must fail closed before its next OWNER-only write.

Recovery is abnormal continuity, not SUCCESSOR_HANDOFF_COMPLETE.

## 7. Owner liveness cadence

The OWNER should emit OWNER_HEARTBEAT after each bounded material unit and before/after long waits when practical.

The timeout is intentionally mutable/empirical. It must be long enough to avoid false takeover during legitimate long tool/CI operations and short enough to recover from vanished owners.

Current provisional value lives only in #72 CURRENT_STATE.

## 8. Stop semantics

OWNER normal voluntary stop gates:
- PROGRAM_COMPLETE
- SUCCESSOR_HANDOFF_COMPLETE

SHADOW may close if:
- another successor wins deterministic arbitration;
- it becomes stale/obsolete;
- program completed before it acquired ownership.

Platform/runtime disappearance of an OWNER is ABNORMAL_INTERRUPTION and must be recovered, not reclassified as successful handoff.

## 9. Metrics

Record where authoritative:
- owner activation
- successor scheduled time
- successor actual wake
- successor READY
- transfer commit
- new owner activation
- predecessor END
- successor first OWNER work
- handoff idle gap
- overlap
- orphan recovery delay
- duplicate owner count
- scheduler conflict count
- stale-owner write blocked/succeeded
- lost continuation

Safety target:
- duplicate OWNER substantive writes = 0
- stale-owner write success = 0
- scheduler writers per generation = 1
- lost continuation = 0

Promotion requires repeated live dogfood with authoritative timing.
