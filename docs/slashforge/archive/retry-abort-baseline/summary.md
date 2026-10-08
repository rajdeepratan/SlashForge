# retry-abort-baseline — Archived

**Shipped:** 2026-10-08 · **PR:** #98 · **Released in:** 5.1.1 (PR #99)

Resolved Finding A from the 5.1.0 code review. The Phase 6 retry loop recorded
`baseline_commit` at the start of Phase 6, so `abort` kept Phase 5's work and
discarded only the retry patches — contradicting both the spec's intent and the
resume checkpoint (which defines `baseline_commit` as the pre-Phase-5 commit).

`baseline_commit` is now recorded once at the start of Phase 5 and used
consistently by the retry loop, the localized-patch diff, and `/slashforge-fix`.
`abort` `git reset --hard`s the whole implementation attempt; the `git stash
create` snapshot for uncommitted work is gone. Doc/prose only.
