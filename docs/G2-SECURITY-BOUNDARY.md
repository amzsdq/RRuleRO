# G2 Public Security Boundary

G2 is designed to be safe as a public repository from its first commit.

## Default deny

Information is public only when it was intentionally authored for the public core.

Private predecessor material is never bulk-copied and then cleaned.

## Public core may contain

- generic state machines;
- generic policy code;
- schemas;
- synthetic examples;
- synthetic tests;
- public CI;
- deployment-neutral adapters that require no embedded credential or private identifier.

## Public core must not contain

- passwords, tokens, private keys, cookies, or session material;
- browser profiles or storage state;
- personal notification or email routing;
- private conversation URLs or identifiers;
- live callback destinations;
- live actor or scheduler identities;
- deployment-specific canonical identifiers;
- active leases, checkpoints, outboxes, queues, or runtime ledgers;
- private predecessor issues, comments, logs, artifacts, or history;
- secret-consuming production workflow definitions copied from a private deployment.

## Synthetic-only fixtures

Tests and documentation use synthetic actors, targets, issue numbers, job IDs, and timestamps.

Real deployment identifiers are prohibited even when they are not credentials.

## Adapter boundary

Private deployment data enters only at runtime through a deployment-specific adapter or external configuration.

The public core must be usable and testable without that private data.

## Review gate

Every public change must pass:

1. content-level public-safety scanning;
2. unit/regression tests;
3. dependency-boundary review;
4. exact-head CI before merge;
5. post-merge CI on the resulting main commit.

Security findings block merge.
