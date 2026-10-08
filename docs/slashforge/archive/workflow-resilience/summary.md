# workflow-resilience — Archived

**Shipped:** 2026-10-08 · **PR:** #96 · **Released in:** 5.1.0 (PR #97)

Turned the rigid 10-phase pipeline into a resilient, stateful, extensible
workflow. Implemented from a five-priority specification; built directly on
`feat/slashforge-spec-updates` rather than through the `active/<change>/`
lifecycle, so this summary is the archive record (there was no `active/` folder
to move).

## What shipped

1. **`/slashforge-fix`** — the investigate → code loop. `/slashforge-investigate`
   writes `.slashforge/latest_investigation.json`; `/slashforge-fix` reads it,
   skips discovery, locks context to the implicated files, enforces a regression
   test before the patch, and hard-fails Phase 6 if the diff added no test.
2. **Phase 6 localized retry loop** — up to three constrained single-shot patches
   before a human-intervention gate (`proceed` / `abort`), instead of replanning.
3. **Dual-track security audit** (Phase 7 + `/slashforge-review-pr`) — Track A
   `npm audit --json` (High/Critical blocks, via the shipped `slashforge-audit.js`,
   fail-closed); Track B a rigid AppSec OWASP pass. Blocking findings halt Phase 7;
   the review renders a red `SECURITY FINDINGS` header.
4. **Automated documentation sweep** (Phase 8) — Keep a Changelog snippet under
   `[Unreleased]`, targeted README updates, committed before the push.
5. **State resumption + runtime** — atomic per-phase checkpoints
   (`.slashforge/run_<id>.ckpt.json`); `/slashforge-resume` verifies the git HEAD
   and re-enters at the next phase. Node runtime raised to `>=24`.

## Review follow-ups (same PR)

Command count corrected to six across the docs; canonical order
`setup → code → investigate → fix → resume → review-pr` applied to the nav,
home grid, README and `COMMAND_FILES`.
