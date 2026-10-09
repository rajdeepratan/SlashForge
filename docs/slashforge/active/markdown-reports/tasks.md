# Markdown Reports — Tasks

Execute in order. Run `node --test test/install.test.js` after each template/installer task; the
pinned render (Task 7) is regenerated last. Each task ends green and is committed.

## Task 1: Retire the three HTML-shell assets from the installer
Files: modify `bin/install.js`, `test/install.test.js`, `test/upgrade.test.js`
Produces: `ASSET_FILES` = `['slashforge-review-payload.js','slashforge-audit.js']`;
`REMOVED_ASSET_FILES` honoured by `isStaleKitFile`.

- [x] Step 1: added the retirement test — `ASSET_FILES` excludes the three + `isStaleKitFile` true for each + `ASSET_FILES` deepEquals the two kept. Run → FAILED.
- [x] Step 2: flipped the `upgrade.test.js` sweep test — simulate a prior install carrying the three, re-install, assert they are removed while meta.json + the two kept assets survive. Run → FAILED.
- [x] Step 3: `bin/install.js` — dropped the three from `ASSET_FILES`; added `REMOVED_ASSET_FILES`; OR'd it into `isStaleKitFile`; exported `REMOVED_ASSET_FILES` + `isStaleKitFile`.
- [x] Step 4: `node --test test/install.test.js test/upgrade.test.js` → 205 PASS (also fixed two install tests that hardcoded `slashforge-splice.js` as a shipped asset → `slashforge-audit.js`). Pinned render deferred to Task 7.
- [ ] Step 5: commit `feat(sdd): retire HTML report-shell/splice/open assets from the installer`.

## Task 2: Investigate flow → Markdown spec report
Files: modify `templates/slashforge/investigate.md`, `templates/slashforge-workflow-investigation.md`, `test/install.test.js`
Consumes: nothing. Produces: investigate writes `active/<issue-slug>/investigation.md`.

- [ ] Step 1: add a test — rendered `investigate.md` + `slashforge-workflow-investigation.md` include `active/` and `investigation.md`, and include neither `slashforge-splice.js` nor `slashforge-open.sh`. Run → FAILS.
- [ ] Step 2: rewrite `investigate.md` deliverable section → `docs/slashforge/active/<issue-slug>/investigation.md`; add an I1 note to derive a kebab issue slug (fall back to a short symptom slug, never a timestamp); drop shell/splice/open + dot-dir wording; keep the JSON-contract paragraph (`run_id` = slug).
- [ ] Step 3: rewrite Phase I3 in `slashforge-workflow-investigation.md` — write the five Markdown sections directly to the report path with `mkdir -p docs/slashforge/active/<slug>`; delete the shell/splice/open/HTML-fallback subsections and step 2 (open-in-browser); keep step 1b (contract) with `run_id` = slug; update the hand-off wording to `active/<slug>/investigation.md` and `/slashforge-code <slug>`.
- [ ] Step 4: `node --test test/install.test.js` → new test PASS; line limits still hold.
- [ ] Step 5: commit `feat(sdd): /slashforge-investigate writes active/<slug>/investigation.md`.

## Task 3: Review-pr flow → Markdown report
Files: modify `templates/slashforge-workflow-review-pr.md`, `test/install.test.js`
Produces: review-pr writes `reviews/pr-<N>-<title-slug>.md` (no date).

- [ ] Step 1: add a test — rendered `slashforge-workflow-review-pr.md` writes a `reviews/pr-` `.md` path (no `<YYYY-MM-DD>` date form) and references neither `slashforge-splice.js` nor `slashforge-open.sh`. Run → FAILS.
- [ ] Step 2: rewrite Phase R4 — Markdown report at `docs/slashforge/reviews/pr-<N>-<title-slug>.md` (PR number + kebab title slug, no date); derive the title slug from the PR title; sections as Markdown; `SECURITY FINDINGS` a conditional `##` + table; remove the splice/open bash block and the "shared document shell" sentence.
- [ ] Step 3: `node --test test/install.test.js` → PASS; confirm the review-pr guide's worst-host render did not grow past its current oversize allowance (it is on `OVERSIZE_GUIDES`); shrink if needed.
- [ ] Step 4: commit `feat(sdd): /slashforge-review-pr writes a Markdown review report`.

## Task 4: /slashforge-code hand-off + fix contract
Files: modify `templates/slashforge/code.md`, `templates/slashforge-workflow-fix.md`, `test/install.test.js`
Produces: Step 0b resolves `active/<slug>/investigation.md` + bare slug.

- [ ] Step 1: add a test — rendered `code.md` references `active/` + `investigation.md` and no longer references `investigations/investigation-` or `.html`. Run → FAILS.
- [ ] Step 2: rewrite `code.md` Step 0b resolution list + confirmation line for `active/<slug>/investigation.md` and a bare `<issue-slug>` (an `active/<slug>/` holding `investigation.md`).
- [ ] Step 3: update `slashforge-workflow-fix.md` — contract `run_id` example = issue slug; Phase-1 slug reuse points at `active/<slug>/`.
- [ ] Step 4: `node --test test/install.test.js` → PASS.
- [ ] Step 5: commit `feat(sdd): code/fix hand-off resolves active/<slug>/investigation.md`.

## Task 5: Delete the asset files + the "no references" guard
Files: remove the three template assets; modify `test/install.test.js`, `test/spec-features.test.js`
Consumes: Tasks 2-4 (no guide references the assets any more).

- [ ] Step 1: add a guard test — for every host, no rendered template contains `slashforge-splice.js`, `slashforge-report-shell.html`, or `slashforge-open.sh`. Run → FAILS (files still present + maybe stray refs).
- [ ] Step 2: remove the stale HTML-splice tests (splice path resolution, "investigate.md must splice", open.sh calls, `spliceScript()` + its two tests, "every document writer calls the shipped splice script"); drop the `report-shell.html` read in `spec-features.test.js`.
- [ ] Step 3: `git rm templates/slashforge-report-shell.html templates/slashforge-splice.js templates/slashforge-open.sh`.
- [ ] Step 4: `node --test test/install.test.js test/spec-features.test.js` → PASS (guard green; `assertTemplatesExist` no longer lists the assets).
- [ ] Step 5: commit `feat(sdd): delete the retired HTML report assets and their tests`.

## Task 6: Docs site
Files: modify `docs/src/content/docs/commands/slashforge-investigate.md`, `slashforge-review-pr.md`
- [ ] Step 1: update both pages — Markdown reports at `active/<slug>/investigation.md` and `reviews/<date>-pr-<N>.md`; remove HTML/shell/browser mentions.
- [ ] Step 2: from `docs/`: `npm run build` + the five `check-docs-*` scripts → all PASS.
- [ ] Step 3: commit `docs(site): describe the Markdown investigation and review reports`.

## Task 7: Regenerate render + full suite
- [ ] Step 1: `node scripts/snapshot-claude-render.js`.
- [ ] Step 2: `git diff test/fixtures/claude-render` shows the reworked investigate/review-pr/code/fix guides and the three deleted asset fixtures — nothing unexpected.
- [ ] Step 3: full `npm test` → ALL green.
- [ ] Step 4: commit `test(sdd): regenerate pinned Claude render for Markdown reports`.
