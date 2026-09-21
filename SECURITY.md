# Security Policy

## Public-repository trust boundary

RRuleRO must remain safe to clone, inspect, fork, and run without access to any private operator credential.

Never commit:

- API tokens, passwords, private keys, cookies, browser profiles, or session/storage state.
- Personal email addresses used for routing or notification.
- Private chat/conversation URLs or identifiers.
- Live callback destinations, actor identifiers, leases, checkpoints, outbox contents, or deployment-only control state.
- Private predecessor issue/comment history, CI logs, artifacts, or incident payloads.

## Workflow policy

Public pull requests are untrusted input. Workflows triggered by pull requests must use least privilege and must not expose secrets or privileged write paths.

Privileged automation, if introduced later, must be isolated from untrusted PR execution and separately reviewed.

## Reporting

Do not open a public issue containing a credential or private operational payload. Revoke exposed credentials first, then use GitHub's private security-reporting mechanism when enabled.
