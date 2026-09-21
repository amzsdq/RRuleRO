# Migration Status

Current phase: staged public-safe bootstrap.

Imported so far:
- Public security and contribution boundary.
- Defensive public-safety scanner and read-only CI.
- Reviewed durable job-state and lease-policy modules with matching tests.
- Reviewed minimal shared result-policy dependency required by those tests.

Not imported:
- Private history, issues/comments, CI logs/artifacts, runtime ledgers, live control state, deployment identities, secret-backed workflows, private routing data, or operational transcripts.
- Broader orchestration/control-message/work-spec clusters whose dependency and public-threat boundaries are not yet closed.

Import remains default-deny. Additional code is admitted only after content review, dependency-closure review, public-safety checks, and passing no-secret CI.
