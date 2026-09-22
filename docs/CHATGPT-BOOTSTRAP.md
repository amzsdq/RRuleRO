# ChatGPT one-paste bootstrap

RRuleRO supports a section-level bootstrap for users who want the RRuleRO operating model inside a ChatGPT conversation without starting from npm or GitHub.

The canonical payload is:

`bootstrap/RRULERO_CHATGPT_BOOTSTRAP.md`

It can be copied into a fresh section or supplied as a small bootstrap file.

## What "install" means here

The bootstrap initializes the **conversation section's operating protocol**. It does not install Node.js code into ChatGPT's host.

Binary/package installation remains a separate path:

`npm install <rrulero tarball>`

This distinction prevents a conversation-only initialization from being misrepresented as host-level software installation.

## Progressive activation

The bootstrap deliberately avoids a mandatory workspace decision.

- FAST_SESSION: no storage ceremony.
- MINI_STATE: one tiny state document only when continuity becomes useful.
- DURABLE_PROJECT: full workspace only when recovery/persistence is justified.
- UNATTENDED: durable workspace plus verified wake.

This keeps the default path optimized for useful work rather than control overhead.

## MINI_STATE

When a version-aware host document is already available, MINI_STATE may persist one document:

`RRuleR_SESSION.json`

The state contains only timing/status/next-action continuity data. It is not a substitute for a full durable project workspace.

If the document is only section-local, it must be marked SECTION_ONLY and must not be described as cold-resumable.

## Workspace choice

For durable work, AUTO prefers:

1. an already-bound verified workspace;
2. an explicit user preference;
3. an unambiguous best verified backend;
4. otherwise one user choice between equivalent candidates.

The prompt must not repeatedly ask for storage after the backend has been bound.
