# Runtime Core v0.1 — Experimental Common Invariants

Status: EXPERIMENTAL / shared by all topology variants on this branch.

Purpose: keep liveness, useful-work duration, scheduling, termination, recovery, and timing accounting independent from Foreman/Worker role design. Topology experiments may change who decides or executes work; they must not silently weaken these invariants.

## Common wake contract

1. Record actual START immediately.
2. Restore the bounded current runtime state first: current useful-work target, last confirmed safe target, pre-arm gap/mode, prior scheduled due/result pointer. Read long audit history only when the bounded state is missing, stale, ambiguous, or forensic reconstruction is required.
3. Once START and current target are known, perform the configured pre-arm exactly once using the same canonical recurring automation. Preserve the recurring RRULE and enabled state. Inspect the mutation result. Do not create a replacement relay.
4. Perform real useful payload work continuously. Finishing one unit, opening/merging a PR, posting a checkpoint, answering one research question, or waiting on CI does not end a CONTINUE wake; select the next safe useful unit.
5. Never sleep, pad, idle, or manufacture work merely to satisfy a duration target.
6. Before any final/handoff, run the terminal gate below.
7. Record actual END, WORKED, target, scheduled due, observed wake timing when available, and final status. Keep hot current state bounded; preserve audit/experiment evidence separately when causal history matters.

## Terminal gate — hard

A normal CONTINUE wake may not end below the current useful-work target.

Pseudo-rule:

CONTINUE && WORKED < TARGET
=> FINAL/HANDOFF FORBIDDEN
=> choose the next safe useful unit and continue.

Early end below target is allowed only for PROGRAM_COMPLETE, BLOCKED, or RISK. BLOCKED/RISK require reasonable alternative useful paths to be exhausted and the concrete evidence recorded.

A platform/tool hard truncation is not reclassified as a valid normal handoff. The pre-arm exists as recovery insurance for that case.

## Idle-time invariant

Primary objective is useful-work duty cycle, not duration in isolation.

Measure:
- useful_work_window
- control/restore overhead
- end-to-next-actual-start idle
- scheduled_due vs actual_start jitter
- avoidable idle caused by premature normal termination
- recovery delay after genuine truncation

Do not optimize idle by creating overlapping duplicate executions or unsafe scheduler churn. A scheduling change is promoted only if it reduces expected idle/control cost without materially increasing duplicate/stale execution or recovery risk.

The current START + TARGET + GAP pre-arm remains the baseline fail-safe until a better policy is demonstrated by repeated dogfood evidence.

## Role independence

These invariants apply equally to:
- Foreman
- Foreman/Executor
- bounded Worker
- researcher/reviewer
- future runtime roles

Role specs define decision rights, assignment scope, and product work. They do not redefine duration, scheduler, terminal, or recovery semantics.

## State semantics

Use the mutation model that matches the state:
- bounded mutable snapshot/pointer for hot current state;
- append-only event/result history for experiments, audit, and causal reconstruction;
- ordinary Git-tracked replacement for evolving specs/code/config;
- explicit supersession when a prior conclusion is corrected.

Append-only is not a universal rule.

## Promotion discipline

Treat Runtime Core and topology as separate experimental dimensions:
- Runtime Core changes require runtime/liveness evidence.
- Foreman/Worker topology changes require coordination/useful-work evidence.
- Do not attribute an outcome to topology if the runtime invariant changed in the same comparison window.
- Keep main as rollback target until repeated evidence supports promotion.
