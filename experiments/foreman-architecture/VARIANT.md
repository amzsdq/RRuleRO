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

## Variant C — SPLIT FOREMAN / WORKER
Foreman owns only prioritization, invariant/repo-boundary checks, assignment, merge/review decisions, and durable checkpointing.
Worker owns implementation/research/test execution for one bounded assignment and returns evidence/checkpoint only.

The split is justified only if it beats Variant B after including:
- extra handoff/restore cost;
- duplicate context loading;
- assignment latency;
- coordination failures;
- merge/conflict overhead.

Prefer no split when the next task depends heavily on the immediately preceding implementation context.
Prefer split only when parallelism, isolation, or independent verification creates measurable net value.

Hypothesis: useful for parallel/heterogeneous or review-heavy work, but may be worse for serial tightly-coupled coding.
