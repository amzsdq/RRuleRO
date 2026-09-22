# RRuleRO Personal Profile

The Personal profile is the non-GitHub product path. It uses the same durable continuation semantics as the GitHub reference profile while hiding repository-specific control details from the user.

## User flow

1. Choose durable storage available to the host (for example a connected Drive/Library-style text store, or a durable directory).
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

Two concrete bridges are provided:

- `directoryWorkspace.createDirectoryWorkspace({ root })` for a local or durably mounted directory. It provides versioned CAS writes, atomic replacement, and root-escape protection.
- `toolWorkspace.createToolWorkspace({ read, write })` for a host such as ChatGPT that already has connected durable file/storage tools. The host callbacks perform the actual connector operation and must expose a stable version token. This path does not require RRuleRO to own an API key or fork its runtime semantics.

A host connector that cannot provide version-aware writes must not pretend to satisfy this contract. It needs a serialization/CAS layer before it can be used as durable control state.

## Directory wiring

```js
const { personalWorkspace, directoryWorkspace } = require('../src/g2/adapters');
const product = require('../src/g2/product');

const workspace = directoryWorkspace.createDirectoryWorkspace({ root: '/durable/RRuleR' });
const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
const session = product.profileSession.createProfileSession({ profile, logical_id: 'my-project' });
```

## ChatGPT / connected-tool wiring

The ChatGPT host supplies `read` and `write` callbacks by mapping its connected storage actions to the versioned text contract; RRuleRO remains connector-agnostic:

```js
const { personalWorkspace, toolWorkspace } = require('../src/g2/adapters');

const workspace = toolWorkspace.createToolWorkspace({
  read: ({ path }) => hostStorage.readVersionedText(path),
  write: ({ path, content, expected_version }) =>
    hostStorage.writeVersionedText(path, content, expected_version)
});
const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
```

For a consumer ChatGPT deployment, `hostStorage` is the product/tool integration layer over an available connected durable store; it is not a separately purchased RRuleRO API. If the current host exposes only read-only storage, use the GitHub profile or another writable Personal backend rather than claiming durable continuation.

Research providers implement one method:

```js
search({ query, depth, intent }) -> evidence[]
```

Evidence is normalized before it can enter planning. If research is required and no usable evidence is returned, planning fails closed instead of fabricating support.

## Non-goals

The Personal profile does not create a second scheduler, queue, lease model, recovery model, or completion model. Storage changes; core semantics do not.
