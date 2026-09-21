# G2 Bootstrap Status

Current phase: public-first G2 architecture bootstrap.

## Strategy change

The project no longer treats the private predecessor as a repository to migrate.

The predecessor is now a reference oracle for:
- proven capabilities;
- failure modes;
- regression scenarios;
- recovery semantics;
- performance bottlenecks.

G2 code is authored fresh unless a small existing public-safe module is explicitly retained as a reference seed after review.

## Existing public-safe seed

Before the G2 strategy change, a small dependency-closed set of generic policy modules and synthetic tests was admitted through public-safety gates.

Those files are not automatically normative G2 architecture. G2 may keep, replace, relocate, or retire them based on capability-level review.

## Never imported

- private history, issues/comments, logs, artifacts, or incident payloads;
- live runtime/control state;
- deployment identities;
- session/browser state;
- private routing or callbacks;
- secret-backed production workflows.

## G2 admission rule

New G2 work must be:
1. authored for the public architecture;
2. synthetic in fixtures and examples;
3. deployment-neutral;
4. dependency-boundary reviewed;
5. public-safety clean;
6. tested on the exact proposed head and again after merge.
