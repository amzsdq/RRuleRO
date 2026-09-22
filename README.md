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
const { product, adapters, runtime, foreman, scheduler } = rrulero;
```

For a non-GitHub durable workspace, start with `docs/PERSONAL-PROFILE.md`. The directory backend is directly runnable anywhere the host provides a durable filesystem. Connected-tool hosts can use the version-aware storage callback bridge and the scheduler host-callback bridge only when the host actually exposes the required writable storage and wake actions.

**Verified ChatGPT Personal host mapping:** the current ChatGPT host can satisfy the Personal contract with Google Drive/Docs as version-aware durable storage (`revisionId` + `batchUpdate.writeControl.requiredRevisionId`), ChatGPT Automations as the verified wake provider, and web research tools when research is justified. The repository mapping is exported as `product.chatgptPersonalHost`. Host availability remains capability-gated: deployments that do not expose these tools must use another conforming Personal backend/wake provider or the GitHub profile.

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
- **Personal**: non-GitHub profile over a versioned durable text workspace; see `docs/PERSONAL-PROFILE.md` for the user flow and concrete directory backend. Current ChatGPT hosts with the mapped Drive/Docs + Automations capabilities can satisfy the same profile contract without GitHub.

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
