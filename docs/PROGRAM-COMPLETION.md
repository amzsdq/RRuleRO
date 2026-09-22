# RRuleRO Program Completion Gate

`PROGRAM_COMPLETE` is a product-level claim. Passing a milestone, PR set, module test, or the throughput-first slice is not sufficient.

## Required product paths

All of the following must be present on the same fresh `main` head and backed by executable acceptance evidence.

1. **Runtime core** — durable continuation, cold resume, recovery/liveness, lease/fencing, idempotent effects, delegation, scheduler replacement, completion verification, bounded retry.
2. **Research-informed planning** — adaptive research decision; provider-backed evidence ingestion when justified; evidence-to-goal/plan/work compilation; evidence-driven replan; no unconditional research wait.
3. **Human interface** — plan preview and revision; observed-time turn reports; progress summary; actionable blocker report with resume point.
4. **Profiles** — shared profile contract; GitHub durable profile; a practical Personal durable profile. A connector-neutral callback interface is acceptable only when a host can actually map it to writable, version-aware durable storage. Documentation must not claim a read-only or non-CAS connector is durable.
5. **Operating modes** — FAST, planned long-running, approval-required, recursive development.
6. **Recursive development** — observe -> candidate -> bounded experiment -> fixed evaluation -> adopt/revise/reject/rollback/do-nothing; stable/experimental separation; substantive work wins over unrelated meta-work.
7. **End-to-end acceptance** — fresh goal reaches durable multi-turn work; justified research feeds planning; worker loss resumes; active plan can be revised safely; blocker/resume is actionable; Personal and GitHub paths both complete; independent completion evidence is required.
8. **Distribution** — one documented public entrypoint and a reproducible test command; normal-user Personal wiring limitations are explicit rather than hidden behind placeholder host APIs.

## Final decision procedure

Before claiming `PROGRAM_COMPLETE`:

- resolve all open implementation PRs;
- identify the exact fresh-main SHA;
- require the repository's full unit suite and public-safety workflow to PASS for that exact SHA (or an equivalent independently verified exact-head run when the workflow trigger differs);
- run the multi-profile product acceptance suite against that head;
- audit every requirement above against code + tests, not filenames or documentation alone;
- search for unresolved implementation blockers/TODOs that affect the intended user experience;
- confirm no correctness, security, recoverability, or completion-verification regression;
- record the evidence in program issue #30.

If any required host capability is unavailable to RRuleRO itself, distinguish **runtime implementation complete** from **host integration unavailable**. Do not simulate or fabricate a host connector. A real callback bridge plus conformance contract can make the runtime distributable, but a claim that a specific host is supported requires an actually available writable/version-aware host mapping.
