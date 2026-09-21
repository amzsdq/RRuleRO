# Public Migration Boundary

This repository is populated using a positive allowlist from a private predecessor.

## Import policy

Default action: **do not import**.

A file may be imported only after review shows that it is reusable product material and does not contain private deployment state or sensitive references.

## Never import by default

- Git history from the private predecessor.
- Issues, comments, CI logs, artifacts, archived incident evidence, or historical branches.
- Live control-plane activation state, actor registries, leases, checkpoints, queues, outboxes, runtime ledgers, or deployment epochs.
- Secret-backed browser/session transport configuration.
- Personal email routing, private conversation links, callback destinations, or operator-specific identifiers.

## Rewrite before import

Operational runbooks, role documents, examples, workflows, adapters, and deployment documentation must use synthetic identifiers and public-safe defaults.

## Workflow baseline

Public CI begins read-only. Write-capable or secret-consuming workflows are not admitted until separately threat-modeled and tested against fork/PR abuse.

## Provenance

The public repository uses fresh history. The private predecessor remains the forensic and rollback source; it is not published.
