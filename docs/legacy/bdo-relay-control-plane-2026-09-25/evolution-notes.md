# BDO relay protocol evolution notes

This is a retrospective index, not a verbatim archive of every intermediate prompt. The exact final prompt is preserved separately in `prompt-v0.9.1.md`.

## Sequence

### v0.7.3 — REPAIR-FIRST LIVE-READY BATON
Introduced repair-first behavior, durable START markers, scheduler prearm/readback, generation ownership, and explicit handoff semantics. This still assumed an overlap-style successor model.

### v0.8.0 — CONTINUOUS-WORK HOT-QUEUE BATON
Added NOW/NEXT/FALLBACK and the principle that package completion is not turn completion. CI/remote waits were meant to be absorbed by independent work.

### v0.8.2 — OVERLAP-HANDOFF CONTINUOUS RELAY
Made the intended timing explicit: roughly 14 minutes of useful OWNER work, successor prearm around +12 minutes, and about two minutes of overlap. +3m was reserved for abnormal recovery.

### v0.8.4 — OVERLAP-HANDOFF REPAIR-FIRST
Promoted premature finalization itself to a runtime failure. Added same-turn runtime repair expectations instead of “few minutes -> final -> +3m -> repeat”.

### v0.8.6 — SERIALIZED SAME-CANONICAL REPAIR-FIRST
A dogfood run showed that the same canonical automation did not start a concurrent successor while the current invocation remained active. The normal model was changed from overlap to serialized same-canonical continuation. The close path became approximately “long useful invocation -> close -> same canonical shortly afterward”.

### v0.8.7 — GitHub write recovery
Separated GitHub mutation rejection from repository outage. Minimal neutral writes and exact readback were introduced as a recovery technique, and the canonical was no longer to be disabled for recoverable write failures.

### v0.8.8 — external clock failover
Added two duration-clock paths: GitHub server markers, or automation server metadata when GitHub markers were unavailable. This substantially increased prompt/control complexity.

### v0.9.0 — anti-loop protocol
Formalized failure fingerprints, hypothesis states, forbidden actions, attempt ledgers, escalation levels, and “same failure + same mechanism = forbidden repeat”.

### v0.9.1 — fresh-due guard
Added a specific repair for stale close-time DTSTART values that could miss the intended occurrence and fall through to the next hourly RRULE occurrence. The scheduler base was moved to a fresh close-time observation immediately before the final mutation.

## What the dogfood taught us

Useful findings from the experiment include:

- A same-canonical automation should not be assumed to overlap itself.
- Scheduler write acknowledgement and actual stored state are different concepts.
- A stale DTSTART combined with an hourly recurrence can create unexpectedly large idle gaps.
- GitHub connector write capability can be operation-specific rather than globally available/unavailable.
- Explicit evidence and readback can prevent false completion claims.
- Long-work prompts can produce long productive turns, but increasingly detailed control rules can themselves consume substantial model attention.
- The growing runtime protocol became a competing task: the model often had to optimize protocol compliance instead of directly optimizing BDO product completion.

## Retirement decision

On 2026-09-25 the BDO workflow direction changed deliberately:

- stop treating the BDO relay prompt like a programmable runtime/state machine;
- stop using RRuleRO as the active BDO control-plane/state repository;
- retain RRuleRO history only for future diagnosis and design reference;
- use `amzsdq/BDO` as the working repository;
- express the product goal, completion conditions, approximate turn duration, self-renewal instruction, and a small mutable handoff in ordinary human project language;
- let the LLM inspect the BDO repository and devise the per-turn work plan itself.

The intent is not that every RRuleRO mechanism was wrong. The intent is that the aggregate control burden became counterproductive for this specific BDO workflow.
