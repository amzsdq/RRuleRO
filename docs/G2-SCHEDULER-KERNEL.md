# G2 Scheduler Kernel

The scheduler is a replaceable adapter. Continuation correctness must not depend on one calendar syntax or one vendor.

## Protected outcomes

G2 preserves four outcomes learned from prior runtime evidence:

1. a nonterminal actor has a verified future recovery opportunity before risky substantive work;
2. normal close moves the next wake close to actual completion rather than waiting for a coarse fixed boundary;
3. stale wake events never roll schedule generation or authority backward;
4. the same logical actor is continued unless an explicit handoff changes authority.

## Startup sequence

1. read the minimum durable continuation fence;
2. read the live scheduler state;
3. reconcile stale or mismatched wake state forward;
4. arm provisional rescue;
5. independently verify the arm;
6. restore the full checkpoint;
7. perform useful work.

If arm mutation fails, retry once when safe. If a previously verified future wake is still alive, the runtime may enter degraded continuation only within that wake's safety envelope. Without a verified future continuation, conflicting substantive effects fail closed.

## Normal close

1. persist the latest resumable checkpoint;
2. compute a completion-relative continuation;
3. arm the same logical actor through the active scheduler adapter;
4. verify the live schedule;
5. persist the verified generation and due time;
6. only then relinquish the invocation.

## Current defaults, not invariants

The initial defaults are based on successful runtime evidence:

- target work envelope: 10 minutes;
- provisional safety margin: 3 minutes;
- fast continuation delay: 1 minute;
- due-time comparison tolerance: 4 minutes.

These values are CURRENT_DEFAULT settings. They may be tuned or replaced when measurement shows a better configuration.

## Forward-only fence

If an old scheduler event arrives after a newer continuation has already been verified, the old event is stale.

The stale event must not:

- restore an older prompt or role definition;
- move the next due time backward;
- reduce authority generation;
- disable the newer continuation;
- cause an idle no-op merely because its original schedule is obsolete.

It should recover forward to the newest verified continuation and resume from durable state.

## Adapter contract

A scheduler adapter exposes:

- `read`
- `arm`
- `verify`
- `disable`

RRULE, one-shot schedules, GitHub event wakes, or another provider may implement the contract.

No adapter is itself a G2 invariant.
