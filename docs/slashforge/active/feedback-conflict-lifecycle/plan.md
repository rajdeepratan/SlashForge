# Post-Merge & Feedback Lifecycle — Plan

## Approach
Extend two existing workflow phases with prose that lives in **sibling guides**, because
`templates/slashforge-workflow.md` renders at 199/200 lines for the Claude host and cannot grow.
A new `slashforge-workflow-conflicts.md` holds the fetch → merge → stop-on-conflict ladder;
`slashforge-workflow-resume.md` gains a feedback re-entry section that fetches PR review state via
`gh` and re-enters Phase 9; `slashforge/review-feedback.md` gains the concrete `gh` ingestion
recipe. Edits to `slashforge-workflow.md` are net-neutral pointer rewrites only.

## Tech stack
- Product is `templates/` rendered by `bin/install.js` (Node ≥24, CommonJS, zero deps).
- Tests are `node:test` / `node:assert` (`npm test`).
- Guides are Markdown with YAML frontmatter and balanced `<!--target:x-->…<!--/target-->` blocks.

## Global constraints
- Assisted + gated — preserve every existing human gate; never fully automate (constitution).
- Integrate an advanced base with `git merge origin/<base>`, **not** rebase — plain non-force push.
- Reuse `/slashforge-resume` for async re-entry — no new command, no new `COMMAND_FILES` entry.
- `slashforge-workflow.md` must still render ≤ 200 lines for **every** host (it is at 199 for claude).
- Every guide/command `.md` ≤ 200 rendered lines; a `SKILL.md`/skill file ≤ 500.
- New guide needs valid frontmatter and balanced target blocks; register it in `GUIDE_FILES`.
- The pinned Claude render (`test/fixtures/claude-render`) is **regenerated**, never hand-edited.
- Zero runtime dependencies; no secrets committed.

## Files
- **Create** `templates/slashforge-workflow-conflicts.md` — the upstream-integration / conflict
  ladder guide: `git fetch`, report ahead/behind, `git merge origin/<base>`, clean→proceed,
  conflict→stop with the conflicted-file list. Referenced from Phase 8 push, Phase 10 pull, and the
  resume feedback re-entry. One responsibility: how to integrate a moved base safely.
- **Modify** `bin/install.js` — add `'slashforge-workflow-conflicts.md'` to the `GUIDE_FILES` array
  (installs to claude/cursor/codex; no `omit` entry).
- **Modify** `templates/slashforge-workflow.md` — net-neutral rewrites only:
  - Companion-files bullet (the "read at Phase 6/7/8" line, ~L13): append the conflicts guide to
    that same bullet — no new bullet.
  - Phase 8 Push step 1 (claude L211 + agents L214): replace the inline "rebase… stop and ask"
    sentence with a pointer to `slashforge-workflow-conflicts.md` — one line in, one line out.
  - Phase 9 intro (L228): reword in place so it also names the `/slashforge-resume` re-entry and the
    `gh` fetch (pointer to the resume guide) — same single line, no addition.
  - Phase 10 step 5 (L263): reword "base branch pull conflicts" to route through the conflicts
    guide — same single line.
- **Modify** `templates/slashforge-workflow-resume.md` — add `pr_number`/`pr_url` to the checkpoint
  JSON example and the `context_snapshot` description, and a new `## Feedback re-entry` section:
  when `current_phase >= 8` and `pr_number` is set, fetch review state, run the conflicts ladder if
  the base moved, and re-enter Phase 9 when changes are requested.
- **Modify** `templates/slashforge/resume.md` — one step in Step 1 that detects the feedback case
  and surfaces it to the user before re-entering Phase 9.
- **Modify** `templates/slashforge/review-feedback.md` — add a `## Ingesting from GitHub` section
  with the concrete `gh` recipe (request-changes reviews + inline review comments) mapped to
  Must / Should / Discuss.
- **Modify** `test/install.test.js` — add a focused test (conflicts guide registered + renders for
  claude ≤ 200, and `slashforge-workflow.md` references it).
- **Regenerate** `test/fixtures/claude-render/**` via `node scripts/snapshot-claude-render.js`.

## Risks & edge cases
- **`slashforge-workflow.md` creeping over 200.** All four edits are in-place rewrites; after
  regenerating the fixture, `wc -l` the rendered file and trim wording if it is > 200.
- **`gh` missing / unauthenticated.** The resume feedback path and the recipe must say: stop and
  tell the user to install/authenticate `gh`; never guess the review state.
- **Merge conflict.** Stop with the conflicted-file list; never auto-pick a side, never `-X ours`.
- **Dirty working tree before merging.** The ladder requires a clean tree first (same check Phase 4
  already uses); stop otherwise.
- **No checkpoint (fresh clone).** Out of scope — resume keeps its existing "nothing to resume".
- **Target-block imbalance** in the new guide fails the most-tested surface — keep every
  `<!--target:x-->` matched and un-nested.

## Test strategy
- The existing suite auto-covers the new guide for frontmatter validity, target-block balance, and
  the 200/500 line limits (those tests iterate every template) — so adding the file is itself tested.
- New targeted test in `test/install.test.js`: assert `slashforge-workflow-conflicts.md` is in
  `GUIDE_FILES`, renders for the claude host at ≤ 200 lines, and that the rendered
  `slashforge-workflow.md` contains the string `slashforge-workflow-conflicts.md` (the pointer
  resolves) while still rendering ≤ 200 lines.
- Regenerate the pinned Claude render and review `git diff test/fixtures/claude-render` by eye — it
  must show exactly the new guide plus the four net-neutral workflow rewrites and nothing else.
- Full `npm test` green is the Phase 6 gate.
