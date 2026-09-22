# G2 Durable State Adapter

## Purpose

G2 needs durable state that a disposable Worker or Foreman can cold-read without hidden conversational context.

The first public adapter targets GitHub-shaped content storage through an injected transport. The transport owns authentication and vendor I/O; the public core owns state semantics.

## Rule classification

### INVARIANT

These protect correctness and may be changed only when an equal-or-stronger mechanism preserves the same outcome:

- compare-and-swap/version precondition for updates, preventing silent lost updates;
- authority generation never moves backward;
- same-generation subject disagreement fails closed;
- terminal authority cannot be silently reopened;
- durable records contain deployment-neutral state only.

### CURRENT_DEFAULT

These are useful mechanisms, not goals:

- one JSON record per logical actor/objective;
- a repository path derived from a public-safe logical identifier;
- GitHub-style content version as the CAS token;
- injected transport with `readText` and `writeText`.

If another store provides better throughput or lower control overhead while preserving the invariants above, it may replace this default.

## Transport contract

The adapter receives:

- `readText({ path }) -> null | { content, version }`
- `writeText({ path, content, expected_version }) -> { version }`

`writeText` must enforce `expected_version` atomically at the backing store. A transport that ignores the precondition does not satisfy the adapter contract.

No credential, repository token, session, callback route, or private deployment identity is embedded in the adapter.

## Durable record

The public record contains:

- logical identity;
- authority generation;
- subject SHA/ref;
- current status;
- optional terminal authority;
- resumable checkpoint payload;
- public-safe durable references.

The record deliberately does not define scheduler syntax or reasoning-runtime identity. Those remain replaceable adapters.

## Objective-first review

The adapter exists to improve cold-resume reliability and coordination correctness. If its control cost becomes a material throughput bottleneck, optimize or replace the storage mechanism rather than weakening the protected correctness outcomes by default.
