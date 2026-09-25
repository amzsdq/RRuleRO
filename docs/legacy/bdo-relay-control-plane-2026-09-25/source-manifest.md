# Source manifest for the retired BDO relay control plane

Recorded 2026-09-25 for later reconstruction.

## Repositories and identifiers

- Runtime/experiment repository: `amzsdq/RRuleRO`
- Product repository used by the experiment: `amzsdq/BDO`
- BDO canonical automation ID: `6ab28a3665cc819182c7f7844069b2d8`
- RRuleRO default branch at archive start: `main`
- RRuleRO main SHA observed at archive start: `c9a56304c5706d1a01b9cdac23e8f35f186d6d61`

## Durable runtime history

### Issue #72
- URL: https://github.com/amzsdq/RRuleRO/issues/72
- Title: `DOGFOOD: external BDO project runtime findings`
- Purpose: BDO-specific scheduler, duration, ownership, failure, and dogfood evidence.
- State at archive time: open.
- The issue had hundreds of append-only comments; do not treat its mutable body alone as the entire historical record.

### Issue #73
- URL: https://github.com/amzsdq/RRuleRO/issues/73
- Title: `EXP: Foreman prompt/topology optimization dogfood`
- Purpose: compare control/topology variants and measure prompt/control overhead vs useful work.
- State at archive time: open.

### Draft PR #74
- URL: https://github.com/amzsdq/RRuleRO/pull/74
- Title: `exp: dogfood compact foreman and adaptive worker topology`
- State at archive time: open draft, unmerged.
- Head branch: `exp/foreman-runtime-topology-v1`
- Head SHA: `99b066fb6c3d9f34c7c4661401dd244c32d6b547`
- Base: `main`

## Experimental branch

Branch: `exp/foreman-runtime-topology-v1`  
Pinned archive reference: `99b066fb6c3d9f34c7c4661401dd244c32d6b547`

Important files at that branch/ref:

- `experiments/foreman-runtime-topology-v1/runtime-core.md`
  - blob: `64c1ddd08efc40c6ac6d3a4ef9beb9d7b6e5e143`
- `experiments/foreman-runtime-topology-v1/continuous-work-engine.md`
  - blob: `4fc0c9a6a0c9f64912d501f9045666173ff2a859`
- `experiments/foreman-runtime-topology-v1/compact-foreman.txt`
  - blob: `ed4ef10f4b6e48b8bd5afa8528b4a769022b92d7`
- `experiments/foreman-runtime-topology-v1/overlap-handoff.md`
  - blob: `bfb95d845790b727437332cb30437bcf97e74e79`
- `experiments/foreman-runtime-topology-v1/server-observed-work-clock.md`
  - blob: `8a5182741b4c10ed3d57dcaaed8f2e3e2c52566d`
- `experiments/foreman-runtime-topology-v1/current-state-schema.json`
  - blob: `0858022efe8c787b17068a2f3d7be309cce50c99`
- `experiments/foreman-runtime-topology-v1/current-state.example.json`
  - blob: `9b96bf6a2138d0f643ca3cb35a3ec5c81eaadbe2`
- `experiments/foreman-runtime-topology-v1/result-schema.md`
  - blob: `a93d0204d205252ba27af4dc80b425881968fb93`
- `experiments/foreman-runtime-topology-v1/work-marker.js`
  - blob: `1c320ad00c45375b291bbc0e9d22d2ce44986b93`
- `experiments/foreman-runtime-topology-v1/worker-envelope.txt`
  - blob: `71f4ef50f2fb1b497b4493c57fd7d6a936dfd669`

## RRuleRO main runtime docs that may be relevant

These pre-existing files were not changed as part of retirement:

- `docs/G2-ARCHITECTURE.md`
- `docs/G2-DURABLE-STATE.md`
- `docs/G2-EXPERIMENTS.md`
- `docs/G2-PRODUCT-RUNTIME.md`
- `docs/G2-SCHEDULER-KERNEL.md`
- `docs/G2-WORKER-RUNTIME.md`
- `docs/RELAY-POLICY.md`
- `docs/CHATGPT-BOOTSTRAP.md`

Use Git history when reconstructing their exact state at a historical point.

## Retirement boundary

The archive does **not** overwrite or delete:

- issue #72 or its comments;
- issue #73;
- draft PR #74;
- the experiment branch;
- any existing runtime docs;
- any existing RRuleRO implementation.

The archive merely adds a stable index and final-prompt snapshot. Future BDO work is intended to proceed in `amzsdq/BDO` without using RRuleRO as its active runtime control plane.
