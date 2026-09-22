# Changelog

All notable release-level changes are documented here.

## 1.0.0-rc.2 — Progressive ChatGPT bootstrap

### ChatGPT install UX
- One-paste section bootstrap payload included in the release artifact.
- Progressive activation: FAST_SESSION -> MINI_STATE -> DURABLE_PROJECT -> UNATTENDED.
- FAST work no longer pays mandatory workspace setup cost.
- MINI_STATE can keep one tiny continuity document without creating the full project workspace.
- Durable/unattended claims fail closed unless storage/wake capabilities are actually verified.
- Workspace AUTO selection reuses existing bindings/preferences and asks only when viable choices are materially equivalent.
- Promotions preserve current task state instead of restarting work.
- `rrulero bootstrap` prints the canonical payload from the installed package.

### Distribution
- Release smoke verifies the bootstrap file survives `npm pack` and is usable through the installed CLI.
- Package candidate bumped to `1.0.0-rc.2`.

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
