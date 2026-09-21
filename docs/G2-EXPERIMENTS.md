# G2 Experiment Registry

Experiments are preregistered before results are observed. Current operator constraints and Program Control override stale experiment registrations. A superseded experiment remains as historical design evidence and MUST NOT be executed or counted toward a current promotion decision.

## EXP-WORK-ENVELOPE-001

Status: SUPERSEDED — HISTORICAL PREREGISTRATION

Superseded because current Program Control fixes every Foreman/Worker work turn at a 10-minute substantive-work envelope and explicitly forbids A/B testing turn length while that constraint is active. This registration is retained only as historical design evidence. Do not execute its 8-minute variant, collect new samples for it, or use it to promote a current default unless the operator constraint is explicitly retired and the experiment is freshly preregistered.

Historical hypothesis: a 10-minute target work envelope reduces control/continuation overhead relative to an 8-minute envelope without increasing recovery loss or duplicate/conflicting work.

### Historical Variant A
- target work envelope: 8 minutes

### Historical Variant B
- target work envelope: 10 minutes

### Historical fixed safety invariants
- verified continuation before risky substantive work
- forward-only stale-wake reconciliation
- lease/conflict safety
- idempotent or verified external effects
- synthetic/public-safe workload
- no sleep or padding to meet a duration target

### Historical primary metrics
- useful minutes/hour
- control minutes/hour
- continuation gap seconds
- scheduler/control mutation count
- useful units completed

### Historical safety metrics
- duplicate/conflicting work
- recovery-required events
- verification failures
- premature return while safe runnable work remained

### Historical observation rule
The first real run per variant is feasibility evidence only.

Default promotion requires at least three comparable observations per variant unless an experiment is terminated early for a safety regression.

Unequal workload, queue starvation, or platform interruption makes an observation non-comparable rather than a forced win/loss.

### Historical promotion rule
Promote only when repeated evidence shows better useful coverage or lower overhead without safety regression.

If the finding concerns generic RRULE relay behavior rather than orchestration-specific behavior, record it as an RRuleR backport candidate.

---

## EXP-VERIFICATION-BATCHING-001

Status: IN_PROGRESS — PREREGISTERED

Parent evidence/work spec: GitHub issue #16 (P7 empirical hardening).

Constraint: the 10-minute Foreman/Worker turn envelope is fixed for both variants. This experiment changes only verification batching inside equal turns.

### Variant A — eager
Run verification after each bounded implementation/evidence unit when independently verifiable.

### Variant B — bounded batch
Accumulate compatible, non-conflicting verification items and verify once at the next checkpoint, never crossing the turn boundary or merge gate.

### Fixed safety invariants
- exact-head unit + public-safety PASS before merge
- post-merge recheck
- no unresolved recovery-required effect
- no private predecessor/non-public runtime payload in public artifacts
- claims, leases, and effect domains remain non-conflicting
- continuation secured before substantive work

### Metrics
- useful-work coverage
- verification/control overhead
- verification latency
- continuation gap
- duplicate/conflict rate
- recovery-required count

START / END / WORKED / STATUS reporting remains mandatory for Foreman and Worker but is observability, not a KPI target.

### Observation rule
Collect at least three comparable prospective bounded observations per variant on ordinary G2 maintenance/implementation work or synthetic/public-safe fixtures that have independent utility. Do not manufacture no-op commits, redundant Actions, or other activity solely to fill the sample quota. Workload comparability failure makes a pair unusable rather than subjectively normalized.

Historical workflow evidence that predates durable preregistration may be retained as baseline evidence but MUST NOT count toward the prospective sample minimum.

### Promotion rule
Promote bounded-batch verification only if median verification/control overhead improves by at least 15% with no regression in safety invariants, duplicate/conflict rate, recovery-required count, or material verification latency. Promote eager verification if batching violates an invariant or materially increases recovery/latency. Otherwise classify INCONCLUSIVE and retain the current default.

A public-safety audit checkpoint is required at least once per completed variant sample set.
