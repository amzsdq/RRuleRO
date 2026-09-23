# Foreman Runtime Topology Experiment v1

Status: EXPERIMENTAL / NOT PROMOTED
Branch: `exp/foreman-runtime-topology-v1`
Purpose: optimize long-running LLM project control using observed dogfood data without changing BDO product state.

## Hypothesis

The current full foreman prompt is robust but carries repeated restore/token/control cost. A permanent Foreman/Worker split may also be unnecessary when one execution can safely choose and perform the next useful unit itself.

Test three recoverable variants against the current baseline:

A. FULL_FOREMAN_BASELINE
- Current long prompt and single execution.
- Foreman both selects and performs work.

B. COMPACT_FOREMAN_SINGLE_EXECUTOR
- Immutable rules/spec live in durable repo state.
- Wake prompt contains only identity, root goal, durable-state pointers, hard boundaries, scheduler invariant, and reporting contract.
- Same execution restores latest checkpoint, selects next unit, and performs it.
- Restore from a bounded current-state pointer/snapshot first. Append-only history remains audit evidence, not the mandatory hot-path read.
- Escalate to broader history only when the current-state snapshot is ambiguous or an invariant must be reconstructed.

C. FOREMAN_WORKER_SPLIT_ON_DEMAND
- Foreman selects/validates work; worker executes only when decomposition or parallelism has measurable value.
- Do not create a worker merely because a role exists.
- Worker must receive a bounded assignment + acceptance test + durable callback target.

## Selection rule

Do not promote a topology by intuition. Compare observed runs on:
- useful_work_ratio = useful payload time / wake wall time
- restore/control latency
- prompt/control token burden (relative when exact tokens unavailable)
- duplicated investigation count
- stale/incorrect continuation count
- premature-completion count
- recoverability after truncation/new context
- merge/rework rate caused by incomplete context
- scheduler mutation reliability
- user intervention required

Correctness and recoverability dominate small token/time savings.

## State semantics

Do not force append-only everywhere. Use:
- bounded mutable snapshot/pointer for current hot-path state;
- append-only event/result history where auditability and causal reconstruction matter;
- ordinary Git-tracked replacement for evolving specs/code;
- explicit supersession links when a prior conclusion is corrected.

This keeps current restore bounded while retaining full forensic history.

## Traceability / rollback

- Detailed topology experiment results live in RRuleRO #73; #72 receives only generalized duration/relay observations when relevant.
- Each result records variant, source checkpoint, branch/ref, decision, observed failure/success, and supersession relation where applicable.
- Product artifacts remain in product repositories; this branch contains runtime methodology only.
- No baseline runtime policy is replaced until repeated dogfood evidence favors a variant.
- Rollback is simply returning to the last promoted runtime spec/main; experiment branch remains as evidence.

## Initial judgment

Expected default candidate: B.
Reason: most current BDO wakes require one executor with durable state, while permanent role splitting adds coordination cost. C is expected to win only for genuinely separable parallel work, independent review, or context-size isolation. A remains the control.

## Promotion gate

Require multiple comparable real payload wakes. Promote only if a candidate preserves correctness/recovery while materially reducing control overhead or improving useful-work duty cycle. If results are mixed, retain adaptive topology rather than forcing one universal mode.
