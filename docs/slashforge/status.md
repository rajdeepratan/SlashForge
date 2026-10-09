# SlashForge — Status

The current state of the spec home. See `slashforge-spec-home.md` for the layout.

## Active

_None._

## Recently archived

- **fix-command-lists-stop-at-six** — fixed the hand-maintained command
  enumerations that still stopped at six/four (install closing message, the
  `install.js` "four commands" comment, the landing-page cost tiles), guarded by
  a regression test. Closes issue #106. Merged 2026-10-09 (PR #111), released in
  5.3.1. See `archive/fix-command-lists-stop-at-six/`.
- **markdown-reports** — `/slashforge-investigate` and `/slashforge-review-pr`
  now write Markdown reports named the spec-driven way
  (`active/<issue-slug>/investigation.md`, `reviews/pr-<N>-<title-slug>.md`); the
  HTML report-shell/splice/open assets are retired. Merged 2026-10-09 (PR #108),
  released in 5.3.0. See `archive/markdown-reports/`.
- **feedback-conflict-lifecycle** — the Phase 8/10 merge-not-rebase conflict
  ladder (`slashforge-workflow-conflicts.md`) and resume-driven ingestion of PR
  request-changes (Phase 9, via `/slashforge-resume` + `gh`). Merged 2026-10-09
  (PR #107), released in 5.3.0. See `archive/feedback-conflict-lifecycle/`.
- **light-gears** — `/slashforge-test` and `/slashforge-refactor`, two
  lightweight standalone commands, bringing the shipped set to eight. Merged
  2026-10-09 (PR #101), released in 5.2.0. See `archive/light-gears/`.
- **retry-abort-baseline** — Phase 6 `abort` now rolls back the whole
  implementation attempt (Finding A). Merged 2026-10-08 (PR #98), released in
  5.1.1. See `archive/retry-abort-baseline/`.
- **workflow-resilience** — `/slashforge-fix`, the Phase 6 retry loop, the
  dual-track security audit, the Phase 8 documentation sweep, and
  `/slashforge-resume`. Merged 2026-10-08 (PR #96), released in 5.1.0.
  See `archive/workflow-resilience/`.
- **sdd-lifecycle** — Spec-Driven Development spec home + propose→apply→archive
  lifecycle folded into `/slashforge-code`. Merged 2026-10-08 (PR #93).
  See `archive/sdd-lifecycle/`.
