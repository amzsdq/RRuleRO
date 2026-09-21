# G2 Worker Runtime

## Purpose

A Worker is a disposable executor for one authorized objective. It is optimized for sustained useful work, cold resume, and measurable utilization.

## State model

- IDLE
- CLAIMING
- RUNNING
- CHECKPOINTING
- WAITING_DEPENDENCY
- WAITING_VERIFICATION
- RECOVERING
- BLOCKED_EXTERNAL
- COMPLETE

A Worker may not jump from IDLE directly to COMPLETE. It must claim authority before substantive work.

## Utilization evidence

Time is classified as:

- USEFUL
- CONTROL
- VERIFICATION_WAIT
- DEPENDENCY_WAIT
- EXTERNAL_BLOCK
- RECOVERY
- SCHEDULER_GAP
- QUEUE_STARVATION
- SYSTEM_IDLE

Only USEFUL contributes to the Worker 50–55 minutes/hour target.

The target applies only when sufficient runnable backlog exists. A Worker is not penalized for genuine lack of authorized work.

## Checkpoint rule

Checkpoints are resumability artifacts, not stopping permission.

A checkpoint must preserve enough state for a cold replacement Worker to continue without hidden chat context.

## Experiment rule

Material timing or policy choices are treated as hypotheses.

Before observing results, define:
- competing variants;
- safety invariants;
- measured metrics;
- minimum observations;
- promotion rule.

A/B comparison reports observed statistics but does not invent statistical significance.

## Immediate experiment candidates

1. target useful-work envelope: 8m vs 10m vs adaptive;
2. checkpoint cadence: fixed interval vs meaningful-unit boundary;
3. continuation delay: +1m vs adaptive scheduler-jitter estimate;
4. Foreman dispatch strategy: eager saturation vs bounded reserve.

Safety invariants remain fixed across variants.
