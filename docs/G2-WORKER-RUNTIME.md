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

## Bootstrap-to-work admission

Bootstrap, protocol, policy, work-order, checkpoint, and authority loading are CONTROL work inside the current wake. They are not permission to consume a whole wake and wait for another turn.

When bootstrap/policy/work-order loading succeeds, authority and claim are valid, and safe runnable work exists, the Worker must enter RUNNING and start the first safe runnable unit in the same wake. There is no READY-only turn.

Waiting is valid only for a real dependency, verification requirement, invalid/missing authority, external blocker, or genuine absence of runnable work. Cold resume follows the same rule: once its durable checkpoint and authority are loaded, a runnable Worker resumes useful work in that wake.

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

1. checkpoint cadence: fixed interval vs meaningful-unit boundary;
2. continuation delay: +1m vs adaptive scheduler-jitter estimate;
3. Foreman dispatch strategy: eager saturation vs bounded reserve;
4. claim granularity under equal 10-minute Worker turns.

The operator-fixed 10-minute turn envelope is not an A/B variable. Safety invariants remain fixed across variants.
