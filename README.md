# RRuleRO

RRuleRO is a public-first G2 multi-agent orchestration runtime for sustained autonomous work with durable recovery.

G2 is not a mirror of a private predecessor. The predecessor is used only as a reference for proven capabilities, failure modes, and regression scenarios. G2 reimplements those capabilities against a clean public architecture with synthetic tests and deployment-neutral state.

## G2 goals

- sustained Worker useful-time, targeting 50–55 evidenced useful minutes per hour when runnable backlog is sufficient;
- Foreman optimization of aggregate Worker utilization, dispatch, recovery, and verification rather than Foreman busy-time;
- safe parallelism through dependency, conflict-domain, lease, and idempotency analysis;
- replaceable scheduler/adapters;
- cold resume from durable state;
- independently verified completion;
- public/private deployment separation from the start.

## Security boundary

- No credentials, tokens, cookies, browser/session state, private chat links, personal email routing, live callback destinations, or deployment identities belong in this repository.
- Private predecessor history and live state are not migrated.
- Tests and examples use synthetic identifiers only.
- Public CI is read-only by default.
- Public changes are default-deny and must pass exact-head public-safety and unit gates before merge.

See:

- `docs/G2-ARCHITECTURE.md`
- `docs/G2-CAPABILITY-CONTRACT.md`
- `docs/G2-SECURITY-BOUNDARY.md`
- `SECURITY.md`
