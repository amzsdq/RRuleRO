# Result ledger schema

One record per real payload wake. Keep observations append-only because they are experimental evidence; candidate specs/config may evolve normally under Git history.

WORKED is authoritative only when derived from GitHub START/END marker `created_at`.

```text
FOREMAN_TOPOLOGY_RESULT
run_id=<stable session/ref>
variant=A|B|C
payload_repo=<repo>
payload_checkpoint=<issue/comment/ref>

clock_mode=GITHUB_SERVER_MARKERS
start_marker_ref=<GitHub comment ref>
start_created_at=<GitHub server timestamp>
check_marker_ref=<GitHub comment ref used for terminal gate>
end_marker_ref=<GitHub comment ref>
end_created_at=<GitHub server timestamp>
worked_sec=<END_MARKER.created_at - START_MARKER.created_at>
duration_certification=<SERVER_VERIFIED|OPEN_SESSION|INVALID_SESSION|LEGACY_UNVERIFIED>

target_min=<active target>
scheduler_mode=<SERIAL_PREARM_FIXED_GAP|OVERLAP_HANDOFF_EXPERIMENT>
scheduled_next_or_successor_wake=<server-derived timestamp>
wake_lateness_sec=<when observable>

generation=<integer>
role_at_start=<OWNER|SHADOW>
role_at_end=<OWNER|RETIRED|SHADOW>
owner_activated_at=<server/durable timestamp>
shadow_wake_at=<optional>
successor_ready_before_transfer=<YES|NO|N/A>
ownership_transfer_sec=<optional>
handoff_idle_gap_sec=<optional>
actual_overlap_sec=<optional>
duplicate_owner=<YES|NO>
scheduler_conflict=<YES|NO>
stale_owner_write_success=<YES|NO>
lost_continuation=<YES|NO>

control_restore_sec=<measured/estimated with method>
control_prompt_size=<bytes/chars when available>
context_reads=<count>
durable_writes=<count>
duplicate_investigation=<YES/NO + evidence>
stale_continuation=<YES/NO + evidence>
premature_completion=<YES/NO>
truncation_or_cold_restore=<NONE|SUCCESS|FAIL + evidence>
context_caused_rework=<YES/NO + evidence>
worker_spawned=<YES/NO>
worker_value=<N/A|POSITIVE|NEUTRAL|NEGATIVE + reason>
user_intervention=<count/reason>
correctness_regression=<YES/NO + evidence>
result=<KEEP_TESTING|PROMOTE_CANDIDATE|REJECT|SUPERSEDED>
supersedes=<optional prior record/spec>
notes=<short>
```

Comparison rules:
- Never compare raw token/time savings alone.
- Reject a candidate if it creates a correctness/recovery regression even when cheaper.
- For overlap, safety counters must remain zero before performance gains matter.
- Prefer the simplest topology/scheduler that meets the workload's recovery, ownership, and decomposition needs.
