# RRuleRO Release Guide

This document covers release packaging. Runtime architecture and product acceptance are documented separately.

## Release tiers

- **Source checkout**: development/audit mode.
- **Packed artifact**: supported distribution unit produced by `npm pack`.
- **Tagged release**: immutable Git commit plus packed artifact built by the release workflow.
- **Registry publication**: optional external distribution step. It is intentionally not automatic and requires an explicit operator decision and registry credentials.

## Current candidate

The package metadata is `1.0.0-rc.3`. This candidate adds the one-paste ChatGPT section bootstrap and progressive activation model on top of the clean-install package path.

## Build and verify

Requirements: Node.js 22+.

```bash
npm test
node scripts/public-safety-scan.mjs
npm run release:smoke
npm pack
```

`release:smoke` builds the tarball, installs it into an empty temporary consumer project, verifies the installed package export and npm CLI shim, prints the packaged ChatGPT bootstrap, initializes a Personal directory workspace, and runs the workspace doctor including a stale-version CAS rejection check.

## Install from an artifact

```bash
npm install ./rrulero-1.0.0-rc.3.tgz
npx rrulero version
npx rrulero bootstrap
npx rrulero init --workspace ./rrulero-workspace
npx rrulero doctor --workspace ./rrulero-workspace
```

The directory profile provides durable local state. Unattended continuation additionally requires a verified wake provider supplied by the execution host.

## Tag workflow

`.github/workflows/release-package.yml` runs for pull requests, manual dispatch, and `v*` tags. On a tag it:

1. checks out the exact tag;
2. runs unit tests;
3. runs the public-safety scanner;
4. runs the clean-install release smoke test;
5. packs a tarball;
6. computes SHA-256;
7. uploads the tarball and checksum as a GitHub Actions artifact.

It does **not** publish to npm and does not require repository secrets.

## Upgrade

1. Stop or quiesce the active runtime at a durable checkpoint.
2. Back up the durable workspace/control state.
3. Install the new tarball at an explicit version.
4. Run `rrulero doctor` against the Personal directory workspace when applicable.
5. Run the repository/profile acceptance appropriate to the deployment.
6. Resume execution only after the new runtime is verified.

RRuleRO release tooling does not silently rewrite durable workspace schemas during package installation.

## Rollback

1. Stop at a durable checkpoint.
2. Reinstall the previously verified tarball/version.
3. Restore the pre-upgrade workspace backup only if the newer runtime performed an incompatible state migration.
4. Run doctor/acceptance again.
5. Resume from the last independently verified durable checkpoint.

Keep previous release artifacts and their SHA-256 checksums until the new version has completed real workload validation.

## Final v1.0.0 promotion checklist

- exact candidate head unit PASS;
- exact candidate head public-safety PASS;
- clean packed-artifact install PASS;
- first-run `init` + `doctor` PASS;
- Personal and GitHub product acceptance PASS;
- no unresolved release blocker;
- changelog updated;
- operator chooses the public software license and publication channel as needed;
- final version changed from RC to `1.0.0`;
- immutable `v1.0.0` tag created from the verified commit;
- release workflow artifact checksum recorded.

A public registry publish is a separate explicit action.
