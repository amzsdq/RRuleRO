# RRuleRO

RRuleRO is a public-first G2 multi-agent orchestration runtime for sustained autonomous work with durable recovery.

G2 is not a mirror of a private predecessor. The predecessor is used only as a reference for proven capabilities, failure modes, and regression scenarios. G2 reimplements those capabilities against a clean public architecture with synthetic tests and deployment-neutral state.

## ChatGPT: one-paste section bootstrap

For a normal ChatGPT conversation, RRuleRO can start without asking for a full workspace up front.

Use the canonical bootstrap payload:

`bootstrap/RRULERO_CHATGPT_BOOTSTRAP.md`

After package installation, print it with:

```bash
npx rrulero bootstrap
```

Paste or provide that payload to a fresh ChatGPT section. This is **section-level runtime initialization**, not operating-system package installation.

The bootstrap uses progressive activation:

```text
FAST_SESSION
    ↓ continuity becomes useful
MINI_STATE
    ↓ durable recovery/project state becomes justified
DURABLE_PROJECT
    ↓ unattended continuation is requested and wake is verified
UNATTENDED
```

- FAST_SESSION starts useful work immediately with no workspace question.
- MINI_STATE uses only `RRuleR_SESSION.json` when a tiny continuity record is useful and a low-cost versioned store is already available.
- DURABLE_PROJECT creates the full workspace only when persistence/recovery is justified.
- UNATTENDED additionally requires a verified wake provider.
- Workspace selection defaults to AUTO. Existing bindings/user preferences win; equivalent choices trigger a single question.

See `docs/CHATGPT-BOOTSTRAP.md` for the product semantics.

## Install and first run

Requirements: Node.js 22+.

### Release artifact

Install an RRuleRO release tarball into a project:

```bash
npm install ./rrulero-1.0.0-rc.3.tgz
npx rrulero version
npx rrulero bootstrap
npx rrulero init --workspace ./rrulero-workspace
npx rrulero doctor --workspace ./rrulero-workspace
```

`init` creates a full Personal directory workspace. Use it when a durable project workspace is already known to be appropriate. `doctor` verifies real read/write and stale-version CAS rejection. The directory profile supplies durable state; unattended continuation additionally requires a verified wake provider supplied by the execution host.

### Build the release artifact from source

```bash
git clone https://github.com/amzsdq/RRuleRO.git
cd RRuleRO
npm run release:check
npm pack
```

For ordinary development/audit work:

```bash
npm test
```

The package entrypoint is:

```js
const rrulero = require('rrulero');
const { product, adapters, runtime, foreman, scheduler } = rrulero;
```

The command-line entrypoint is `rrulero`. Run `rrulero help` for supported first-run commands.

For release creation, artifact verification, upgrades, and rollback, see `docs/RELEASE.md`.

## Personal profile

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

## Release status

The repository is prepared as `1.0.0-rc.3` with progressive ChatGPT bootstrap + clean-install package validation. Registry publication is intentionally not automatic. The package is marked `UNLICENSED` until the repository owner chooses an explicit public software license.

## Security boundary

- No credentials, tokens, cookies, browser/session state, private chat links, personal email routing, live callback destinations, or deployment identities belong in this repository.
- Private predecessor history and live state are not migrated.
- Tests and examples use synthetic identifiers only.
- Public CI is read-only by default.
- Public changes are default-deny and must pass exact-head public-safety and unit gates before merge.
- Release validation requires no secrets and does not publish to external registries.

See:

- `docs/G2-ARCHITECTURE.md`
- `docs/G2-CAPABILITY-CONTRACT.md`
- `docs/G2-PRODUCT-RUNTIME.md`
- `docs/PERSONAL-PROFILE.md`
- `docs/CHATGPT-BOOTSTRAP.md`
- `docs/PROGRAM-COMPLETION.md`
- `docs/RELEASE.md`
- `docs/RELAY-POLICY.md`
- `SECURITY.md`
- `CHANGELOG.md`
