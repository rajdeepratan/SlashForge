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

- [x] Step 1: added the test — both `investigate.md` and `slashforge-workflow-investigation.md` write `active/<slug>/investigation.md` and reference no `.html`/splice/open. Run → FAILED.
- [x] Step 2: rewrote `investigate.md` deliverable → `active/<issue-slug>/investigation.md`; added I1 slug-derivation (kebab issue name, never a timestamp); dropped shell/splice/open + dot-dir target blocks; JSON contract kept with `run_id` = slug.
- [x] Step 3: rewrote Phase I3 — five Markdown sections written directly with `mkdir -p docs/slashforge/active/<slug>`; removed the body-fragment/shell/splice/open-helper/HTML-fallback subsections; kept step 1b (contract, `run_id` = slug); hand-off now points at `active/<slug>/investigation.md` and `/slashforge-code <issue-slug>`.
- [x] Step 4: `node --test test/install.test.js` → 197 PASS (also removed/trimmed 4 stale HTML-splice/shell/open tests investigate obsoleted); line limits hold.
- [ ] Step 5: commit `feat(sdd): /slashforge-investigate writes active/<slug>/investigation.md`.

## Task 3: Review-pr flow → Markdown report
Files: modify `templates/slashforge-workflow-review-pr.md`, `test/install.test.js`
Produces: review-pr writes `reviews/pr-<N>-<title-slug>.md` (no date).

- [x] Step 1: added the test — review-pr writes `reviews/pr-` `.md`, no `<YYYY-MM-DD>-pr-` form, no splice/open. Run → FAILED.
- [x] Step 2: rewrote Phase R4 — Markdown at `docs/slashforge/reviews/pr-<N>-<title-slug>.md` (PR # + title slug, no date); sections as Markdown; `SECURITY FINDINGS` a conditional `##` + table; removed the splice/open bash block and the "shared document shell" sentence.
- [x] Step 3: `node --test test/install.test.js` → 198 PASS; review-pr guide stays within its `OVERSIZE_GUIDES` allowance (oversize tests green); grep confirms zero splice/open/report-shell/date refs.
- [ ] Step 4: commit `feat(sdd): /slashforge-review-pr writes a Markdown review report`.

## Task 4: /slashforge-code hand-off + fix contract
Files: modify `templates/slashforge/code.md`, `templates/slashforge-workflow-fix.md`, `test/install.test.js`
Produces: Step 0b resolves `active/<slug>/investigation.md` + bare slug.

- [x] Step 1: added the test — `code.md` references `active/` + `investigation.md` and no longer `investigations/investigation-` or a dated filename. Run → FAILED.
- [x] Step 2: rewrote `code.md` Step 0b — item 1 example + item 2 (bare `<issue-slug>` resolving to `active/<slug>/investigation.md`) + the confirmation line.
- [x] Step 3: `slashforge-workflow-fix.md` — contract `run_id` = `<issue-slug>`; Phase-1 slug reuse now says the investigation already created `active/<issue-slug>/` and plan/tasks go into that same folder.
- [x] Step 4: `node --test test/install.test.js` → 199 PASS.
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
