# Continuous Work Engine v1 — Reproducible Long-Turn Pattern

Status: EXPERIMENTAL normative companion for the BDO relay / foreman-runtime topology branch.

## Purpose

Reproduce the successful long-turn behavior where one invocation keeps converting newly discovered work into the next useful unit instead of ending after one package, one failure, one PR, or one CI result.

The engine does not impose artificial elapsed time. It keeps a live supply of useful work and uses normal stop gates only.

## 1. Core loop

```text
OBSERVE
→ SELECT HIGHEST-VALUE RUNNABLE UNIT
→ EXECUTE
→ VERIFY
→ PERSIST MINIMUM RECOVERY EVIDENCE
→ CHECK LIVE SUCCESSOR
→ REFILL
→ repeat
```

`PACKAGE_COMPLETE != TURN_COMPLETE`.

Before any voluntary nonterminal close, REFILL must return no runnable safe work AND a legal runtime close gate must independently exist. For an OWNER, normal close remains PROGRAM_COMPLETE or SUCCESSOR_HANDOFF_COMPLETE only.

## 2. Hot queue — keep future work ready

An OWNER SHOULD maintain a small mental/durable HOT_QUEUE of up to three immediately useful candidate units:

1. `NOW` — current atomic unit.
2. `NEXT` — best independent unit to start immediately after NOW.
3. `FALLBACK` — useful unit that does not depend on NOW/CI/external evidence.

Do not turn HOT_QUEUE into bureaucracy. It may be reconstructed from fresh repo state rather than persisted if persistence adds no recovery value.

When NOW finishes, promote NEXT immediately and refill the queue before considering a final response.

## 3. Refill priority ladder

Select the highest-value safe runnable candidate from this order, skipping items that are already satisfied or genuinely unavailable:

1. **Repair active failure** — diagnose concrete cause, change mechanism/input/path, verify materially different result.
2. **Finish current acceptance gap** — next unsatisfied part of the active milestone/root acceptance.
3. **PR/CI convergence** — fix exact-head failures, review, merge after required checks.
4. **Independent acceptance coverage** — tests/E2E/UX/data correctness/docs required by root acceptance.
5. **Acquisition/evidence engineering** — automate missing data/evidence collection, provenance, import, reconciliation.
6. **Artifact production** — images, screenshots, fixtures, exports, run docs, comparison evidence.
7. **Runtime repair** — only when measured relay mechanics materially reduce useful work or continuity.

Never choose a lower rung merely because it is easier if a higher-value runnable unit exists.

## 4. Wait absorption

A wait is not a work unit.

When CI, remote evidence, a build, or another external operation is pending:

- do not poll repeatedly without new expected information;
- immediately execute FALLBACK or another independent candidate;
- return to the pending path when evidence is likely available;
- if the external state is unchanged and already durably classified, do not consume another turn rediscovering it.

## 5. Failure conversion

Every recoverable failure creates work:

```text
FAILURE
→ concrete cause
→ repair hypothesis
→ smallest safe repair
→ verification
→ continue
```

A repeated materially identical failure without a new repair/evidence path is invalid progress.

If the apparent blocker is missing external input, first ask: can acquisition, conversion, extraction, transport, validation, provenance, or storage be automated? Only the irreducible remainder is external.

## 6. Storage / artifact plane selection

Do not force every artifact into GitHub.

### GitHub — control/source plane
Use for:
- code, tests, schemas, small machine-readable fixtures;
- issues/PRs/checkpoints;
- ownership/generation/runtime evidence;
- small auditable JSON/text evidence;
- pointers/manifests to external artifacts.

### Google Drive — artifact plane
Preferred logical workspace for BDO relay non-code artifacts:
- `ChatGPT/BDO Relay/Images`
- `ChatGPT/BDO Relay/Artifacts`

Use Drive for:
- screenshots and rendered UI images;
- large non-code evidence bundles/logs;
- exported reports or binary assets;
- temporary/reference artifacts that would bloat source control.

When a Drive artifact matters to acceptance or handoff:
1. upload/save it;
2. verify it exists;
3. persist a concise GitHub pointer/manifest entry with purpose, filename, and relevant hash/metadata when feasible.

Do not move canonical code/runtime state to Drive. Do not place credentials, session state, private auth material, or secrets in either public GitHub or Drive artifacts.

If Drive is unavailable, use another safe available artifact store or keep the task runnable via GitHub/container output; storage-provider unavailability alone is not a reason to stop unrelated work.

## 7. Turn-length behavior

No minimum elapsed-time padding.

A long useful turn emerges by chaining real work. If a unit finishes in 30 seconds, immediately refill. If ten useful units can safely fit, do ten.

A short turn with runnable work remaining is a utilization defect and should trigger diagnosis of:
- premature finalization;
- empty/too-narrow candidate queue;
- over-broad ownership restriction;
- repeated blocker polling;
- CI wait idling;
- excessive control-plane ceremony.

## 8. Handoff interaction

After each bounded unit:
1. verify current OWNER/generation before any next OWNER-only side effect;
2. check for a live READY successor;
3. if live READY exists, hand off before starting a new long/risky unit;
4. otherwise refill immediately.

Do not preempt an atomic correctness-critical unit mid-write solely to hand off.

## 9. Reproduction checklist

A successful reproduction should show:
- multiple useful units completed in one invocation when work existed;
- at least one failure converted into a repair rather than a report-only stop, when a failure occurred;
- CI/external waiting absorbed by independent work when available;
- no repeated unchanged blocker report;
- artifacts routed to an appropriate storage plane;
- exact START/END/WORKED close evidence;
- no voluntary OWNER close except PROGRAM_COMPLETE or SUCCESSOR_HANDOFF_COMPLETE.

## 10. Anti-patterns

Forbidden as normal behavior:
- one task completed → final response;
- CI started → wait/poll → final response;
- failure observed → describe failure → final response;
- same blocker checked on every wake;
- forcing screenshots/binaries into GitHub when a connected artifact store is better;
- padding time with sleep/repeated analysis;
- creating busywork solely to make WORKED longer.
