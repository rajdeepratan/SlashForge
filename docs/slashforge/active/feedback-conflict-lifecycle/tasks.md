# Post-Merge & Feedback Lifecycle — Tasks

Execute in order. Tasks 1→5 build on each other; the render snapshot (Task 5) is regenerated last,
after all template text is final. Run `npm test` after each task that changes templates or the
installer.

## Task 1: Conflict/upstream-integration ladder guide + installer registration
Files: create `templates/slashforge-workflow-conflicts.md`, modify `bin/install.js` (`GUIDE_FILES`),
modify `test/install.test.js`
Consumes: nothing.
Produces: guide file basename `slashforge-workflow-conflicts.md`, referenced by later tasks. Its
ladder: `git fetch origin`, report `git rev-list --left-right --count <base>...HEAD` ahead/behind,
`git merge origin/<base>`, clean→proceed / conflict→stop with `git diff --name-only --diff-filter=U`.

- [x] Step 1: write the failing test in `test/install.test.js` — assert the guide is registered and renders:
  ```js
  test('the conflicts ladder guide ships and renders within the cap', () => {
    const { GUIDE_FILES } = require('../bin/install.js'); // if not exported, read the array via renderAll keys
    const claude = renderAll('claude');
    const key = Object.keys(claude).find((k) => k.endsWith('slashforge-workflow-conflicts.md'));
    assert.ok(key, 'slashforge-workflow-conflicts.md must render for the claude host');
    assert.ok(claude[key].split('\n').length <= 200, 'conflicts guide over the 200-line cap');
  });
  ```
  (If `renderAll`/helpers differ, mirror the existing `no new rendered guide breaks the 200-line golden rule` test in the same file for the exact helper names.)
- [x] Step 2: run `node --test test/install.test.js` — confirm it FAILS (guide not found / not registered). ✓ failed on the GUIDE_FILES assertion.
- [x] Step 3: create `templates/slashforge-workflow-conflicts.md` with frontmatter and the ladder. (Kept host-neutral — the ladder is raw git commands; Phase 8/10 already own the "invoke the git agent" vs "do it yourself" target split, so no target blocks were needed here.) Content:
  - When to run: at Phase 8 push rejection, at Phase 10 base pull, and before a resume feedback re-entry.
  - Clean-tree precondition; stop if dirty.
  - `git fetch origin`; report ahead/behind with `git rev-list --left-right --count origin/<base>...HEAD`.
  - **Integrate with `git merge origin/<base>`** (not rebase) so a plain `git push` updates the PR; call out explicitly that rebase+force-push is deliberately not used on a pushed branch.
  - Clean merge → commit the merge and continue. Conflict → run `git diff --name-only --diff-filter=U`, **stop**, hand the user the conflicted-file list; never auto-pick a side (`-X ours`/`-X theirs` are banned).
- [x] Step 4: add `'slashforge-workflow-conflicts.md'` to `GUIDE_FILES` in `bin/install.js` (after `slashforge-workflow-resume.md`); no `omit` entry so claude/cursor/codex all get it.
- [x] Step 5: run `node --test test/install.test.js` — new test + all 193 structural tests PASS.
- [ ] Step 6: commit `feat(sdd): add upstream-integration/conflict ladder guide`.

## Task 2: Wire workflow.md Phases 8/9/10 to the new guide (net-neutral)
Files: modify `templates/slashforge-workflow.md`
Consumes: `slashforge-workflow-conflicts.md` (Task 1).
Produces: Phase 8/10 pointers to the conflicts guide; Phase 9 intro naming the resume re-entry.

- [ ] Step 1: companion-files bullet (~L13, the "read at Phase 6/7/8" line): append the conflicts guide to the **same** bullet — e.g. end it with "`slashforge-workflow-conflicts.md` (read at Phase 8 push / Phase 10 pull / feedback re-entry)". No new bullet.
- [ ] Step 2: Phase 8 Push step 1 — in BOTH the `<!--target:claude-->` (L211) and `<!--target:agents-->` (L214) blocks, replace the "rebase on the latest; if conflict is not auto-resolvable, stop and ask" clause with: push; on remote-diverged rejection, follow `slashforge-workflow-conflicts.md`. Keep each to one line.
- [ ] Step 3: Phase 9 intro (L228) — reword the single line to: reached live when a reviewer comments, or re-entered later by `/slashforge-resume`, which fetches the PR's review state (see `slashforge-workflow-resume.md`). Still one line.
- [ ] Step 4: Phase 10 step 5 (L263) — reword "base branch pull conflicts" to say such conflicts follow `slashforge-workflow-conflicts.md`. Still one line.
- [ ] Step 5: run `node scripts/snapshot-claude-render.js` then `wc -l` the rendered `slashforge-workflow.md` under `test/fixtures/claude-render/` — confirm it is ≤ 200 (expect 199). If > 200, trim wording and re-run. (Do not commit the regenerated fixture here — Task 5 owns it; just verify the count, then `git checkout test/fixtures/claude-render` to revert the preview.)
- [ ] Step 6: commit `feat(sdd): point Phase 8/10 at the conflict ladder, note Phase 9 resume re-entry`.

## Task 3: Resume feedback re-entry
Files: modify `templates/slashforge-workflow-resume.md`, modify `templates/slashforge/resume.md`
Consumes: `slashforge-workflow-conflicts.md` (Task 1); the reworded Phase 9 (Task 2).
Produces: checkpoint fields `pr_number`/`pr_url`; a documented re-entry path into Phase 9.

- [ ] Step 1: in `slashforge-workflow-resume.md` checkpoint JSON example, add `"pr_number": 128` and `"pr_url": "..."` inside `context_snapshot`; add a bullet to the `context_snapshot` description noting they are written at the end of Phase 8.
- [ ] Step 2: add a `## Feedback re-entry` section: when `current_phase >= 8` and `pr_number` is set, before re-entering, fetch review state with `gh pr view <pr_number> --json reviewDecision,reviews,comments,headRefName,baseRefName`. If `gh` is absent/unauthenticated → stop and tell the user. If `reviewDecision == CHANGES_REQUESTED` or there are unresolved threads → run `slashforge-workflow-conflicts.md` if the base has moved, then re-enter at **Phase 9**. If no changes requested → report that and resume normally (`current_phase + 1`).
- [ ] Step 3: in `slashforge/resume.md` Step 1, add a step: after HEAD verification, if the checkpoint is a `/slashforge-code` run at `current_phase >= 8` with `pr_number`, detect the feedback case and surface it (e.g. "PR #N has requested changes — ingesting feedback per `slashforge-workflow-resume.md`") before re-entering Phase 9.
- [ ] Step 4: run `node --test test/install.test.js` — confirm frontmatter/target-block/line-limit tests still PASS and both files are ≤ 200 rendered.
- [ ] Step 5: commit `feat(sdd): resume re-enters Phase 9 to ingest PR request-changes`.

## Task 4: gh ingestion recipe in the review-feedback skill
Files: modify `templates/slashforge/review-feedback.md`
Consumes: nothing new.
Produces: a self-contained `gh` fetch recipe the Phase 9 loop and resume both rely on.

- [ ] Step 1: add a `## Ingesting from GitHub` section before `## Sorting the feedback`: fetch request-changes reviews with `gh pr view <N> --json reviews,reviewDecision,comments` and inline review comments with `gh api repos/{owner}/{repo}/pulls/<N>/comments`; dedupe against already-resolved threads; then map each item onto the existing Must / Should / Discuss buckets. Keep the skill ≤ 500 lines.
- [ ] Step 2: run `node --test test/install.test.js` — frontmatter/line-limit tests PASS (skill ≤ 500).
- [ ] Step 3: commit `feat(sdd): document gh request-changes ingestion in review-feedback skill`.

## Task 5: Regenerate the pinned render + full suite
Files: regenerate `test/fixtures/claude-render/**`, final run of `test/install.test.js`
Consumes: all template edits (Tasks 1–4).
Produces: a green `npm test`.

- [ ] Step 1: run `node scripts/snapshot-claude-render.js`.
- [ ] Step 2: `git diff test/fixtures/claude-render` — confirm the diff shows ONLY the new
  `slashforge-workflow-conflicts.md`, the resume/resume-command/review-feedback additions, and the
  four net-neutral `slashforge-workflow.md` rewrites. Nothing else.
- [ ] Step 3: `wc -l test/fixtures/claude-render/setup/slashforge/slashforge-workflow.md` — assert ≤ 200.
- [ ] Step 4: run full `npm test` — confirm ALL green (target blocks, frontmatter, line limits, pinned render).
- [ ] Step 5: commit `test(sdd): regenerate pinned Claude render for the feedback/conflict lifecycle`.
