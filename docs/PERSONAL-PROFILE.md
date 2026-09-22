# RRuleRO Personal Profile

The Personal profile is the non-GitHub product path. It uses the same durable continuation semantics as the GitHub reference profile while hiding repository-specific control details from the user.

## User flow

1. Choose durable storage available to the host (for example a connected Drive/Library-style text store, or a durable directory).
2. Choose a wake provider available to the host for unattended continuation.
3. Describe the goal.
4. RRuleRO classifies FAST / PLANNED / APPROVAL_REQUIRED.
5. When current evidence materially matters, the configured research provider gathers evidence before planning.
6. Ordinary plans are informational and run without an approval wait; genuine high-impact/authority decisions wait for approval.
7. Work compiles to the canonical Foreman work contract.
8. Checkpoints persist under `RRuleR/control-state`; a replacement worker can cold-resume from them.
9. Progress and blockers are rendered through the human interface; user action is requested only when actionable.

## Workspace contract

`personalWorkspace.createPersonalWorkspaceAdapter()` accepts any backend with:

```js
readText({ path }) -> null | { content, version }
writeText({ path, content, expected_version }) -> { version }
```

Two concrete bridges are provided:

- `directoryWorkspace.createDirectoryWorkspace({ root })` for a local or durably mounted directory. It provides versioned CAS writes, atomic replacement, and root-escape protection.
- `toolWorkspace.createToolWorkspace({ read, write })` for a host with connected durable file/storage tools. The host callbacks perform the actual connector operation and must expose a stable version token.

A host connector that cannot provide version-aware writes must not pretend to satisfy this contract. It needs a serialization/CAS layer before it can be used as durable control state.

## Wake contract

Unattended continuation also requires a real wake provider. `scheduler.toolAdapter.createToolSchedulerAdapter()` maps host scheduling actions to the shared scheduler contract:

```js
const { scheduler } = require('../src/g2');

const wake = scheduler.toolAdapter.createToolSchedulerAdapter({
  read: (input) => hostWake.read(input),
  arm: (input) => hostWake.arm(input),
  verify: (input) => hostWake.verify(input),
  disable: (input) => hostWake.disable(input)
});
```

The host mapping must implement real read-back verification. A timer name or locally assumed due time is not sufficient evidence that continuation was armed. Terminal disable remains subject to the runtime's terminal-authority rules.

## Directory wiring

```js
const { personalWorkspace, directoryWorkspace } = require('../src/g2/adapters');
const product = require('../src/g2/product');

const workspace = directoryWorkspace.createDirectoryWorkspace({ root: '/durable/RRuleR' });
const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
const session = product.profileSession.createProfileSession({ profile, logical_id: 'my-project' });
```

A directory solves persistence, not wake by itself. For unattended operation it must be paired with a real scheduler adapter supplied by the execution host.

## ChatGPT / connected-tool wiring

A capable host supplies storage callbacks by mapping connected storage actions to the versioned text contract:

```js
const { personalWorkspace, toolWorkspace } = require('../src/g2/adapters');

const workspace = toolWorkspace.createToolWorkspace({
  read: ({ path }) => hostStorage.readVersionedText(path),
  write: ({ path, content, expected_version }) =>
    hostStorage.writeVersionedText(path, content, expected_version)
});
const profile = personalWorkspace.createPersonalWorkspaceAdapter({ workspace });
```

For a consumer ChatGPT deployment, `hostStorage` and `hostWake` are product/tool integration layers over actually available host actions; they are not separately purchased RRuleRO APIs. RRuleRO does **not** claim native ChatGPT Library, Google Drive, or ChatGPT automation support merely because callback bridges exist. If the current host lacks writable version-aware storage or a verifiable wake action, use another supported backend/provider rather than claiming unattended durable continuation.

Research providers implement one method:

```js
search({ query, depth, intent }) -> evidence[]
```

Evidence is normalized before it can enter planning. If research is required and no usable evidence is returned, planning fails closed instead of fabricating support.

## Non-goals

The Personal profile does not create a second scheduler, queue, lease model, recovery model, or completion model. Storage and wake implementations change; core semantics do not.
