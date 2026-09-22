# G2 Product Runtime — Throughput-First Profile

## Primary objective

Maximize sustained useful work and minimize avoidable idle time.

Product UX and planning features are admitted only when they improve task completion, quality, safety, recovery, or user control enough to justify their control cost.

## Implemented product layer

### Adaptive intake

The product layer classifies new work as:

- `FAST`: execute directly;
- `PLANNED`: compile a plan/work structure, but do not wait for approval by default;
- `APPROVAL_REQUIRED`: wait only for genuine irreversible, high-impact, missing-authority, or user-decision gates.

A plan preview is informational for ordinary planned work. It is not a default idle gate.

### Research depth

Research is not unconditional.

The runtime distinguishes LOW / MEDIUM / HIGH research depth and performs research only when current evidence is required or the research has material expected value.

### Blocker handling

A blocked path is not equivalent to a blocked turn.

Before ending a turn as blocked, the runtime checks for another safe runnable path. If one exists, work continues there.

Only after reasonable safe alternatives are exhausted may the turn surface user-action, user-decision, external-block, or risk status.

### Reporting

Machine state stays exact. User reports remain compact.

The renderer requires observed start/end and explicit evidenced useful-work duration. It rejects worked time greater than elapsed runtime.

### Recursive development

Valid improvement actions include ADD, MODIFY, SIMPLIFY, REMOVE, and DO_NOTHING.

Meta-work yields to runnable substantive work unless the meta change directly removes a runtime bottleneck. Candidates without measurable external outcomes or positive net value are not promoted.

## Deliberately not implemented as default gates

The following ideas from the broader product direction are intentionally not default runtime requirements because they can reduce useful-time or add idle/control overhead:

- mandatory plan approval for ordinary low/medium-risk work;
- unconditional prior-art scans;
- repeated broad policy/document reads for every bounded unit;
- redundant telemetry artifacts;
- speculative storage adapters without an active profile need;
- recursive process-improvement work that delays runnable substantive work.

## Relationship to G2 core

This product layer does not replace or fork G2 core semantics.

Lease safety, durable continuation, checkpoint recovery, idempotent effects, liveness recovery, scheduler replaceability, and independently verified completion remain owned by the existing core/runtime/foreman modules.

The product layer only decides how intent, planning, blocking, reporting, and recursive-improvement choices are exposed without turning product ceremony into a throughput bottleneck.
