# RRuleRO Personal Profile

The Personal profile is the non-GitHub product path. It uses the same durable continuation semantics as the GitHub reference profile while hiding repository-specific control details from the user.

## User flow

1. Choose a durable workspace directory.
2. Describe the goal.
3. RRuleRO classifies FAST / PLANNED / APPROVAL_REQUIRED.
4. When current evidence materially matters, the configured research provider gathers evidence before planning.
5. Ordinary plans are informational and run without an approval wait; genuine high-impact/authority decisions wait for approval.
6. Work compiles to the canonical Foreman work contract.
7. Checkpoints persist under `RRuleR/control-state`; a replacement worker can cold-resume from them.
8. Progress and blockers are rendered through the human interface; user action is requested only when actionable.

## Workspace contract

`personalWorkspace.createPersonalWorkspaceAdapter()` accepts any backend with:

```js
readText({ path }) -> null | { content, version }
writeText({ path, content, expected_version }) -> { version }
```

`directoryWorkspace.createDirectoryWorkspace({ root })` is the concrete local/mounted-directory backend. It provides versioned CAS writes, atomic replacement, and root-escape protection. A Drive-synced or otherwise durably mounted directory can therefore back the Personal profile without changing runtime semantics.

## Minimal wiring

```js
const { personalWorkspace, directoryWorkspace } = require('../src/g2/adapters');
const product = require('../src/g2/product');

const workspace = directoryWorkspace.createDirectoryWorkspace({ root: '/durable/RRuleR' });
const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
const session = product.profileSession.createProfileSession({ profile, logical_id: 'my-project' });
```

Research providers implement one method:

```js
search({ query, depth, intent }) -> evidence[]
```

Evidence is normalized before it can enter planning. If research is required and no usable evidence is returned, planning fails closed instead of fabricating support.

## Non-goals

The Personal profile does not create a second scheduler, queue, lease model, recovery model, or completion model. Storage changes; core semantics do not.
