# RRuleRO Minimal RRULE Relay Policy

This policy applies the measured conclusions from the ChatGPT Automation RRULE relay experiments to the normal RRuleRO unattended continuation path.

## Objective

1. Maximize sustained useful work.
2. Minimize avoidable idle time.
3. Minimize scheduler mutation and state-loading overhead.
4. Preserve recoverability, correctness, and verifiability.

## Normal clean-success hot path

1. Wake on the same canonical automation.
2. Read the latest compact durable checkpoint/tail first.
3. If the tail is sufficient, begin useful work without broad state reload.
4. Perform substantive work.
5. Append the required durable checkpoint/event.
6. Immediately before handoff, observe the actual current time.
7. Compute `FINAL_NEXT` using the current experimental baseline of approximately +3 minutes.
8. Update the **same** automation exactly once with a complete recurring VEVENT containing `RRULE:FREQ=HOURLY`, keeping it enabled.
9. Validate the returned update object for same automation id, intended DTSTART, recurring RRULE, and enabled state.
10. If it matches, end the normal path without a second scheduler metadata read.

The +3 minute lead is an empirical promoted baseline, not a provider/platform guarantee. It remains tunable and must be re-evaluated with longer soak/fault data.

## Scheduler invariants

- Reuse the same automation id.
- Keep recurring RRULE.
- Do not create a replacement automation for normal continuation.
- Do not use DTSTART-only one-shot or `dtstart_offset_json` as the normal relay path.
- Normal clean-success target: one final scheduler mutation.
- Additional scheduler read/mutation is exception handling, not routine observability.

## Evidence semantics

Do not overload `WAKE_OK`.

- `PREV_WAKE_OK`: the current invocation itself proves the previous handoff woke successfully.
- `NEXT_WRITE_OK`: this turn's scheduler update call succeeded.
- `NEXT_STATE_OK`: the returned update object matches the intended id / DTSTART / RRULE / enabled state.
- `NEXT_WAKE_OK`: remains unknown until the next invocation actually occurs.

Therefore `NEXT_WRITE_OK=YES` never means `NEXT_WAKE_OK=YES`.

## State restoration

Use progressive disclosure:

`checkpoint/issue tail -> useful work`

Read broader policy/history only when one of these applies:

- compact tail is insufficient or ambiguous;
- boundary/reconciliation;
- rollback;
- promotion/rejection;
- recovery;
- invariant reconstruction.

A full state read on every normal wake is not part of the hot path.

## Durable evidence

Prefer canonical append-only events/records. Derived current-state summaries may be rewritten only when they are explicitly rebuildable from canonical history.

Preferred model:

`append-only canonical events -> reducible current state`

Avoid read/merge/full-rewrite ledgers on the normal path when the same evidence can be appended.

## Logging

Clean success should be compact. Exception states must be explicit.

Routine success may omit redundant positive fields when their meaning is unambiguous. Explicitly record anomalies such as:

- PENDING / NO;
- malformed or state mismatch;
- duplicate observed;
- recovery;
- rollback;
- boundary/reconciliation.

## Further promotion evidence

Do not add more normal-path ceremony merely for confidence. The next valuable evidence comes from:

- missed-wake fault injection;
- duplicate invocation fault injection;
- scheduler write failure;
- durable-store read/write failure;
- stale checkpoint recovery;
- concurrent authority collision;
- long relay soak tests;
- measured useful-work duty cycle and idle-gap distribution.

A simpler mechanism should be preferred when it preserves or improves continuation reliability and the correctness/recovery floors.
