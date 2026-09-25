# Legacy: BDO relay control-plane experiment (retired 2026-09-25)

This directory preserves the RRuleRO-side control-plane design that was used to drive the external `amzsdq/BDO` project through a self-renewing ChatGPT automation.

## Status

**LEGACY / RETIRED FOR BDO WORK.**

As of 2026-09-25, the BDO relay is intentionally moving away from the RRuleRO-heavy runtime/control-plane approach. Future BDO development is intended to use the **BDO repository itself as the working source of truth**, with a much simpler goal-driven prompt written like a human project request.

Nothing in this archive should be treated as the active BDO execution policy unless it is deliberately reintroduced later.

This is an additive archive. Existing RRuleRO runtime files, experiment branches, issues, comments, and Git history were not overwritten or deleted.

## Why this archive exists

The RRuleRO-based BDO relay accumulated a large amount of control logic around:

- same-canonical self-renewal;
- OWNER/SHADOW and generation fencing;
- durable START/END markers;
- server-clock duration accounting;
- anti-loop failure fingerprints;
- scheduler readback and stale-DTSTART handling;
- serialized vs overlap handoff experiments;
- hot queues / continuous-work rules;
- GitHub durable runtime state.

Those mechanisms produced useful evidence, but the control prompt became large enough that the LLM spent substantial effort interpreting the runtime protocol instead of simply inspecting the product, deciding what mattered next, and implementing it.

The replacement direction is intentionally simpler:

1. State the BDO product goal and completion conditions in ordinary language.
2. Let the model inspect the BDO repository and devise its own per-turn work plan.
3. Ask for roughly 15 minutes of useful work per invocation, bounded by runtime limits.
4. Keep only a small self-renewal instruction for the same automation.
5. Keep a small mutable handoff section that tells the next invocation where to resume.
6. Use BDO, not RRuleRO, as the working repository for future BDO product work.

## Archive contents

- `prompt-v0.9.1.md` — the final heavy BDO relay prompt immediately before retirement.
- `evolution-notes.md` — retrospective map of the major prompt/runtime pivots that led to v0.9.1.
- `source-manifest.md` — immutable GitHub refs, issue/PR references, branch SHA, file blob SHAs, and identifiers useful for later reconstruction.

## Important historical references

- RRuleRO #72 — `DOGFOOD: external BDO project runtime findings`
- RRuleRO #73 — `EXP: Foreman prompt/topology optimization dogfood`
- RRuleRO draft PR #74 — `exp: dogfood compact foreman and adaptive worker topology`
- Experiment branch — `exp/foreman-runtime-topology-v1`
- BDO relay canonical automation ID — `6ab28a3665cc819182c7f7844069b2d8`

At retirement, the automation was intentionally paused before this archive work began.

## Interpretation rule

This archive records what was tried and what was learned. It is **not** a recommendation to restore the full protocol. If a future investigation needs a mechanism from this era, recover only the smallest primitive required and validate it again against the then-current product/runtime behavior.
