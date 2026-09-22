# Post-Migration Operations

This runbook defines the public-safe operating boundary after G2 migration.

## Standalone rule

RRuleRO must build, test, and explain its public core without access to any predecessor repository, predecessor runtime state, private deployment configuration, browser/session state, or operator-specific routing.

The predecessor may remain an external forensic/reference source, but it is not a runtime, build, test, release, or recovery dependency of G2.

## Fresh-operator verification

A fresh operator can verify the public core using only this repository:

1. Read `README.md`, `docs/G2-ARCHITECTURE.md`, `docs/G2-CAPABILITY-CONTRACT.md`, and `docs/G2-SECURITY-BOUNDARY.md`.
2. Run the repository unit test command used by `.github/workflows/unit.yml`.
3. Run the public-safety command used by `.github/workflows/public-safety.yml`.
4. Require both checks to pass on the exact candidate head.
5. After merge, require both checks to pass again on the resulting `main` commit.

A failure of either gate blocks release/acceptance.

## Legacy decommission checklist

Record only generic completion state. Do not copy private configuration, credential names or values, private identifiers, routing destinations, session material, or predecessor incident payloads into this public repository.

- [ ] Legacy write-capable automation is disabled or intentionally retained outside the public G2 trust boundary.
- [ ] Legacy browser/session credentials are revoked or removed when no longer required.
- [ ] Legacy notification credentials and destinations are revoked or removed when no longer required.
- [ ] Legacy runtime state is not required for G2 cold start, tests, release, or recovery.
- [ ] No public G2 workflow consumes predecessor credentials or private deployment state.
- [ ] Any retained predecessor repository is treated as reference/forensic material, not an operational dependency.

Completion evidence for private decommission actions belongs in a private operator record. The public repository should record only a generic PASS/NOT-YET-PASS result.

## Release boundary

The current public release boundary is the tested repository head. Public CI is intentionally limited to public-safe validation. Production/private adapters, if introduced, must remain outside untrusted pull-request execution and must not weaken the public core's ability to build and test without private state.

## Acceptance evidence

For a standalone acceptance claim, record:

- candidate/main commit SHA;
- unit gate result;
- public-safety gate result;
- dependency-boundary audit result;
- generic legacy-decommission status;
- unresolved blocking findings, if any.

Do not record sensitive private values as evidence.
