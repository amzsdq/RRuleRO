# G2 Architecture

## Mission

G2 is a public-first multi-agent orchestration runtime designed for sustained autonomous work with durable recovery.

The private predecessor is a reference implementation and forensic evidence source, not a codebase to mirror. G2 imports capabilities only when their purpose is still valid and reimplements them against a clean public architecture.

## Primary objective

Optimize useful system throughput while preserving correctness, recovery, and verifiability.

Worker target under sufficient runnable backlog:

- useful work: 50–55 minutes per hour per worker;
- scheduler/control overhead must not be counted as useful work;
- idle time must be classified as queue starvation, dependency wait, external block, recovery, verification wait, or system inefficiency.

Foreman objective:

- maximize aggregate worker useful-time and safe concurrency;
- minimize dispatch latency, avoidable queue starvation, recovery latency, and verification latency;
- the Foreman's own busy-time is not a primary KPI.

## Architecture

### Core invariants

These express outcomes, not historical mechanisms:

- durable logical identity;
- exclusive or conflict-safe lease ownership;
- idempotent external side effects;
- checkpointed cold resume;
- independently verified completion;
- fail-closed handling of ambiguous external effects;
- forward-only recovery from stale scheduler events;
- explicit terminal authority.

### Scheduler kernel

Responsibilities:

- same-actor continuation;
- provisional cold-rescue coverage;
- fast continuation after productive work;
- stale-wake forward reconciliation;
- scheduler implementation replaceability.

Rolling RRULE is an admitted implementation, not an eternal invariant.

### Worker runtime

Responsibilities:

- acquire authorized runnable work;
- hold a valid lease or conflict-safe claim;
- sustain useful work across bounded checkpoints;
- checkpoint frequently enough for cold resume;
- verify external effects;
- continue while the assigned objective remains nonterminal.

### Foreman runtime

Responsibilities:

- maintain runnable queues;
- construct dependency and conflict domains;
- dispatch independent work in parallel;
- maintain worker saturation without unsafe duplication;
- detect starvation, stalls, liveness loss, and verification bottlenecks;
- rebalance or recover work when actors disappear.

### Control plane

The public control plane contains deployment-neutral schemas and state machines only.

Live identities, operator routes, runtime sessions, private callbacks, account-specific state, and deployment credentials do not belong in the public core.

### Adapters

Adapters connect the core to schedulers, Git hosting, reasoning runtimes, transports, or other SaaS systems.

Adapters must not weaken the core safety contracts.

## Rule lifecycle

Every rule must have a current purpose.

Rules are classified as:

- INVARIANT: removing it would violate a required safety/correctness outcome;
- CURRENT_DEFAULT: best known mechanism but replaceable;
- COMPATIBILITY: retained only for an older execution path;
- RETIRED: no longer authoritative.

A rule that begins to obstruct the outcome it was created to protect must be revised, downgraded, or retired after its protected failure mode is covered by an equal or stronger replacement.

## Concurrency model

Global serialization is not a default invariant.

Parallel execution is allowed when work partitions have:

- satisfied dependencies;
- non-conflicting effect domains, or a conflict-safe protocol;
- independent or compatible leases;
- idempotent side effects;
- independent completion verification.

When independence cannot be established, G2 falls back to serialization.
