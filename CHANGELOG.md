# Changelog

All notable release-level changes are documented here.

## 1.0.0-rc.1 — Release candidate

### Product
- Durable multi-turn G2 runtime with checkpoint/cold-resume, liveness/recovery, leases, idempotent effects, delegation, completion verification, and replaceable scheduling.
- Research-informed planning with evidence ingestion and evidence-driven replanning.
- Human plan/progress/blocker reporting.
- GitHub and Personal profiles with shared core semantics.
- FAST, PLANNED, APPROVAL_REQUIRED, and Recursive Development modes.
- Throughput-first selection and evaluation favoring sustained useful work over avoidable ceremony.

### Distribution
- Public CommonJS package entrypoint.
- `rrulero` CLI with `version`, `init`, and `doctor`.
- Personal directory first-run workspace initialization.
- Version-aware durable workspace doctor with stale-write rejection proof.
- Bounded npm package contents.
- Clean-install packed-artifact smoke test.
- Secret-free release-package workflow for exact-tag artifacts and checksums.
- Upgrade and rollback guidance.

### Publication status
This is a release candidate. External npm publication is intentionally not automatic.
