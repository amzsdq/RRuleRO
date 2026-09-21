# G2 Bootstrap Status

Current phase: public-first G2 architecture and core refactor.

## Strategy

The private predecessor is not being migrated.

It is used only as a reference oracle for:
- proven capabilities;
- failure modes;
- regression scenarios;
- recovery semantics;
- performance bottlenecks.

G2 code is authored against a clean public architecture.

## Refactor status

The earlier root-level G1 seed policy modules have been retired from the G2 branch.

Their useful capabilities were re-expressed as deployment-neutral G2 core modules under:

- `src/g2/core/job-state.js`
- `src/g2/core/lease.js`
- `src/g2/core/outbox.js`
- `src/g2/core/effect-recovery.js`
- `src/g2/core/completion-verification.js`

G2 tests use synthetic actors, targets, identities, and payloads.

Historical transport-specific fields and deployment routing are intentionally not part of the core contract.

## Never imported into G2

- private history, issues/comments, logs, artifacts, or incident payloads;
- live runtime/control state;
- deployment identities;
- session/browser state;
- private routing or callbacks;
- secret-backed production workflows.

## Admission rule

Every G2 change must be:
1. authored for the public architecture;
2. synthetic in fixtures and examples;
3. deployment-neutral at the core layer;
4. dependency-boundary reviewed;
5. public-safety clean;
6. tested on the exact proposed head and again after merge.

The private predecessor remains useful as evidence, not as authority over G2 structure.
