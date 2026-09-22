# RRuleRO

RRuleRO is a public-first G2 multi-agent orchestration runtime for sustained autonomous work with durable recovery.

G2 is not a mirror of a private predecessor. The predecessor is used only as a reference for proven capabilities, failure modes, and regression scenarios. G2 reimplements those capabilities against a clean public architecture with synthetic tests and deployment-neutral state.

## Quick start

Requirements: Node.js 22+ and Git.

```bash
git clone https://github.com/amzsdq/RRuleRO.git
cd RRuleRO
npm test
```

The public package entrypoint is `src/g2/index.js` (also declared as `main` in `package.json`):

```js
const rrulero = require('./src/g2');

// Shared runtime surfaces
const { product, adapters, runtime, foreman } = rrulero;
```

For a non-GitHub durable workspace, start with `docs/PERSONAL-PROFILE.md`. The directory backend is directly runnable anywhere the host provides a durable filesystem. Connected-tool hosts can use the version-aware callback bridge only when the host actually exposes writable durable storage with a stable version/CAS token.

**Current host boundary:** this repository does not claim that ChatGPT Library or Google Drive is natively wired by RRuleRO itself. A connector-specific claim requires a real writable/version-aware mapping. If a ChatGPT environment exposes only read-only or non-CAS storage, use the GitHub profile or another writable Personal backend rather than treating that connector as durable control state.

## G2 goals

- sustained Worker useful-time, targeting 50–55 evidenced useful minutes per hour when runnable backlog is sufficient;
- Foreman optimization of aggregate Worker utilization, dispatch, recovery, and verification rather than Foreman busy-time;
- safe parallelism through dependency, conflict-domain, lease, and idempotency analysis;
- replaceable scheduler/adapters;
- cold resume from durable state;
- independently verified completion;
- public/private deployment separation from the start.

## Product profiles

- **GitHub**: advanced/reference profile with repository-backed auditability and orchestration.
- **Personal**: non-GitHub profile over a versioned durable text workspace; see `docs/PERSONAL-PROFILE.md` for the user flow and concrete directory backend.

## Security boundary

- No credentials, tokens, cookies, browser/session state, private chat links, personal email routing, live callback destinations, or deployment identities belong in this repository.
- Private predecessor history and live state are not migrated.
- Tests and examples use synthetic identifiers only.
- Public CI is read-only by default.
- Public changes are default-deny and must pass exact-head public-safety and unit gates before merge.

See:

- `docs/G2-ARCHITECTURE.md`
- `docs/G2-CAPABILITY-CONTRACT.md`
- `docs/G2-PRODUCT-RUNTIME.md`
- `docs/PERSONAL-PROFILE.md`
- `docs/PROGRAM-COMPLETION.md`
- `docs/G2-SECURITY-BOUNDARY.md`
- `SECURITY.md`
