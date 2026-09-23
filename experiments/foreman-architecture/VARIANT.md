# Foreman Architecture Dogfood Experiment

Date: 2026-09-23
Workload: real long-running product work; product artifacts remain in the product repo.
Purpose: find the lowest-control-overhead architecture that preserves correctness, recovery, and sustained useful work.

## Measurement contract
Per wake record:
- variant and branch
- scheduled_due, actual_start, end, useful_work_seconds
- control_restore_seconds (state restore / orchestration / scheduler / checkpoint work)
- prompt_chars (control-prompt size proxy)
- durable_reads and whether each read was necessary
- repeated_or_stale_work count
- CI_wait_reused_for_other_work yes/no
- recoverable_checkpoint_before_risky_work yes/no
- handoff_or_recovery_success on following wake
- correctness incidents: missed invariant, wrong completion, repo-boundary violation, lost work
- product output proxy: useful commits/PRs/tests/research decisions, without scoring trivial churn

Do not optimize one metric in isolation. Prefer the simplest architecture whose recovery/correctness is not materially worse and whose useful-work duty cycle is at least as good.

## Reversibility
- main is not changed by this experiment.
- Every variant is isolated on its own branch.
- Never delete prior experimental results; corrections supersede them.
- A variant may be abandoned immediately if it causes material product risk.

## Variant B — COMPACT SINGLE FOREMAN
One runtime/one canonical recurring relay remains responsible for both coordination and useful work.

Bootstrap prompt should contain only:
1. repository/workload pointers;
2. immutable safety/repo-boundary constraints;
3. instruction to read the latest compact durable checkpoint and this variant spec;
4. completion definition pointer;
5. scheduler/duration bootstrap;
6. report schema.

Everything else is restored from durable state only when needed.
Do not reread broad history unless the compact tail is ambiguous.

Hypothesis: same recovery/correctness as A with materially less control overhead.
Failure signal: lost invariant, repeated rediscovery, premature completion, or more broad rereads/rework.
