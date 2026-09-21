# RRuleRO

RRuleRO is the public successor runtime for a GitHub-backed multi-agent orchestration system.

This repository starts from a fresh public history. Private operational history, live runtime state, credentials, session material, private routing data, and legacy incident evidence are intentionally excluded.

## Security boundary

- No credentials, tokens, cookies, browser/session state, private chat links, personal email routing, or live callback destinations belong in this repository.
- Live deployment state must not be committed.
- Public CI is read-only by default. Privileged workflows require separate threat-model review.
- Migration from the private predecessor is allowlist-only; bulk mirroring is prohibited.

See `SECURITY.md` and `docs/PUBLIC-MIGRATION-BOUNDARY.md`.
