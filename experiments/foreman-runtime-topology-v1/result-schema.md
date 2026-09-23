# Result ledger schema

One record per real payload wake. Keep records append-only because they are experimental observations; candidate specs themselves may be replaced on the experiment branch when iteration is intentional.

```text
FOREMAN_TOPOLOGY_RESULT
run_id=<stable timestamp/ref>
variant=A|B|C
payload_repo=<repo>
payload_checkpoint=<issue/comment/ref>
start=<timestamp>
end=<timestamp>
useful_work_min=<measured/estimated with method>
control_restore_min=<measured/estimated with method>
control_prompt_size=<bytes/chars when available>
context_reads=<count>
durable_writes=<count>
duplicate_investigation=<YES/NO + evidence>
stale_continuation=<YES/NO + evidence>
premature_completion=<YES/NO>
truncation_or_cold_restore=<NONE|SUCCESS|FAIL + evidence>
context_caused_rework=<YES/NO + evidence>
scheduler_result=<success/failure + jitter>
worker_spawned=<YES/NO>
worker_value=<N/A|POSITIVE|NEUTRAL|NEGATIVE + reason>
user_intervention=<count/reason>
correctness_regression=<YES/NO + evidence>
result=<KEEP_TESTING|PROMOTE_CANDIDATE|REJECT|SUPERSEDED>
supersedes=<optional prior record/spec>
notes=<short>
```

Comparison rule: never compare raw token/time savings alone. Reject a candidate if it creates a correctness/recovery regression even when cheaper. Prefer the simplest topology that meets the current workload's recovery and decomposition needs.
