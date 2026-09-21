# G2 Experiment Registry

Experiments are preregistered before results are observed.

## EXP-WORK-ENVELOPE-001

Status: PRE-REGISTERED

Hypothesis: a 10-minute target work envelope reduces control/continuation overhead relative to an 8-minute envelope without increasing recovery loss or duplicate/conflicting work.

### Variant A
- target work envelope: 8 minutes

### Variant B
- target work envelope: 10 minutes

### Fixed safety invariants
- verified continuation before risky substantive work
- forward-only stale-wake reconciliation
- lease/conflict safety
- idempotent or verified external effects
- synthetic/public-safe workload
- no sleep or padding to meet a duration target

### Primary metrics
- useful minutes/hour
- control minutes/hour
- continuation gap seconds
- scheduler/control mutation count
- useful units completed

### Safety metrics
- duplicate/conflicting work
- recovery-required events
- verification failures
- premature return while safe runnable work remained

### Observation rule
The first real run per variant is feasibility evidence only.

Default promotion requires at least three comparable observations per variant unless an experiment is terminated early for a safety regression.

Unequal workload, queue starvation, or platform interruption makes an observation non-comparable rather than a forced win/loss.

### Promotion rule
Promote only when repeated evidence shows better useful coverage or lower overhead without safety regression.

If the finding concerns generic RRULE relay behavior rather than orchestration-specific behavior, record it as an RRuleR backport candidate.
