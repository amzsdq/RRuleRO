# G2 Capability Contract

G2 is a capability reimplementation, not a source migration.

## Reference policy

The private predecessor may be inspected to learn:

- failure modes;
- behavioral requirements;
- invariants that proved necessary;
- test scenarios;
- recovery semantics;
- performance bottlenecks.

The following are not copied into G2 by default:

- source files;
- deployment configuration;
- historical state;
- operator identifiers;
- incident payloads;
- private URLs;
- account-specific routing;
- secret-backed workflow definitions.

A predecessor implementation is not normative merely because it already exists.

## Required capabilities

### Durable continuation

A disposable actor must be able to cold-start and recover the latest authorized work from durable state.

### Lease safety

Concurrent actors must not perform conflicting work under the same exclusive authority.

Lease expiration and recovery must be explicit and deterministic.

### Idempotent effects

Every externally visible side effect must have a stable logical identity or another mechanism that prevents accidental duplication.

### Liveness and recovery

The system must distinguish:

- productive work;
- waiting on a real dependency;
- actor disappearance;
- scheduler failure;
- verification failure;
- retryable transport failure;
- terminal ambiguity.

Recovery must preserve the newest valid authority and must not roll back to stale scheduler state.

### Delegation

Foreman and Worker are distinct responsibilities.

A Foreman optimizes aggregate throughput and correctness.
A Worker optimizes sustained execution of an assigned objective.

### Checkpoint continuation

Progress must be recorded at boundaries that permit a replacement actor to continue without depending on hidden conversational context.

### Completion verification

A task is not complete merely because an action was attempted.

Completion requires independently checkable evidence appropriate to the effect.

### Scheduler replaceability

Scheduler mechanics are adapters.

The control model must survive migration between one-shot schedules, rolling recurrence, event wakeups, or another scheduler.

## Performance contract

Under sufficient runnable backlog, a healthy Worker should target 50–55 minutes of evidenced useful work per hour.

This is a system optimization target, not a license to pad activity.

Foreman performance is evaluated primarily by:

- aggregate worker useful-time;
- runnable backlog starvation;
- dispatch latency;
- avoidable continuation gaps;
- recovery latency;
- verification latency;
- duplicate/conflicting work rate.

## Anti-regression rule

A cleaner G2 design is not accepted if it silently removes a proven capability.

Each replacement must demonstrate either behavioral parity or an intentional, documented improvement.
