# Foreman Runtime Topology Experiment v1

Status: EXPERIMENTAL / NOT PROMOTED
Branch: `exp/foreman-runtime-topology-v1`
Purpose: optimize long-running LLM project control using observed dogfood data without changing product state.

## Experimental separation

Runtime/liveness invariants are now isolated in `experiments/foreman-runtime-topology-v1/runtime-core.md` and are common to every role/topology variant.

This is deliberate variable control:
- Runtime Core owns duration, pre-arm, terminal gate, idle/recovery accounting, and scheduler semantics.
- Topology owns who selects, delegates, executes, reviews, and checkpoints product work.
- A topology comparison is invalid if a runtime invariant silently changes in the same comparison window.

The premature CONTINUE handoff observed on 2026-09-23 is treated as a runtime-invariant violation, not evidence that the compact topology itself should shorten work. Runtime Core therefore contains a hard terminal gate: CONTINUE below TARGET cannot final/handoff.

## Hypothesis

The full foreman prompt is robust but carries repeated restore/token/control cost. A permanent Foreman/Worker split may also be unnecessary when one execution can safely choose and perform the next useful unit itself.

Test three recoverable variants against the current baseline:

A. FULL_FOREMAN_BASELINE
- Long/self-contained role policy.
- Foreman both selects and performs work.
- Must consume the same Runtime Core for future controlled comparisons.

B. COMPACT_FOREMAN_SINGLE_EXECUTOR
- Immutable role/spec lives in durable repo state.
- Wake prompt contains identity, root pointers, role boundaries, and Runtime Core pointer.
- Same execution restores latest checkpoint, selects next unit, and performs it.
- Restore from a bounded current-state pointer/snapshot first. Audit history is not a mandatory hot-path read.

C. FOREMAN_WORKER_SPLIT_ON_DEMAND
- Foreman selects/validates work; worker executes only when decomposition or parallelism has measurable value.
- Do not create a worker merely because a role exists.
- Worker receives a bounded assignment + acceptance test + durable callback target.
- Foreman and Worker consume the same Runtime Core.

## Selection rule

Do not promote a topology by intuition. Compare observed runs on:
- useful_work_ratio
- restore/control latency
- prompt/control burden
- duplicated investigation
- stale/incorrect continuation
- premature-completion events
- recoverability after truncation/new context
- merge/rework caused by incomplete context
- scheduler mutation reliability
- user intervention
- worker handoff cost vs measurable worker value

Correctness and recoverability dominate small token/time savings.

## Idle/scheduler optimization track

Do not conflate topology optimization with scheduler optimization.
The current START + TARGET + GAP pre-arm remains the baseline fail-safe.
Track whether alternative policies can reduce end-to-next-start idle, especially after genuine truncation, without causing overlap/duplicates/stale work. Promote only with repeated evidence.

## State semantics

Do not force append-only everywhere. Use:
- bounded mutable snapshot/pointer for hot current state;
- append-only event/result history where auditability and causal reconstruction matter;
- ordinary Git-tracked replacement for evolving specs/code;
- explicit supersession links when a prior conclusion is corrected.

## Traceability / rollback

- Detailed topology experiment results live in RRuleRO #73; #72 receives generalized duration/relay observations.
- Each result records variant, source checkpoint, branch/ref, decision, observed failure/success, and supersession relation where applicable.
- Product artifacts remain in product repositories.
- No baseline runtime/topology policy is replaced until repeated dogfood evidence favors a candidate.
- Main remains rollback target; the experiment branch remains evidence.

## Current judgment

Candidate B remains the default for tightly-coupled serial work.
Candidate C remains on-demand for genuinely separable parallel work, independent review, or context isolation.
This is provisional, not a promotion decision.

## Promotion gate

Require multiple comparable real payload wakes. Promote only if a candidate preserves correctness/recovery while materially reducing control overhead or improving useful-work duty cycle. If results are mixed, retain adaptive topology rather than forcing one universal mode.
