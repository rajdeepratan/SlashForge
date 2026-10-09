# Markdown Reports — Plan

## Approach
Finish the HTML→Markdown migration for the two report-writing flows. Retire the three HTML-shell
assets from the installer (and clean them up on upgrade), rewrite the investigate and review-pr
report steps to write plain Markdown into the spec home, update the `/slashforge-code` hand-off and
the fix contract to the issue-slug form, then rework the test suite that currently pins the HTML
splice behaviour and regenerate the Claude render.

## Tech stack
- `templates/` rendered by `bin/install.js` (Node ≥24, CommonJS, zero deps); `node:test`.
- Markdown guides with frontmatter + balanced `<!--target:x-->` blocks.

## Global constraints
- Retire exactly `slashforge-report-shell.html`, `slashforge-splice.js`, `slashforge-open.sh`.
  Keep `slashforge-review-payload.js` and `slashforge-audit.js`.
- Issue slug: kebab-case, collision-handled (`-2`, `-3`, …) per `slashforge-spec-home.md`.
- Line limits (≤200 guide / ≤500 skill); balanced target blocks; zero deps.
- Pinned Claude render regenerated via `node scripts/snapshot-claude-render.js`, never hand-edited.
- Retired assets removed on upgrade via the installer's stale-file sweep.

## Files
- **Modify** `bin/install.js` — remove the three assets from `ASSET_FILES`; add them to a removal
  list the stale sweep honours. `isStaleKitFile` currently matches only `forge-*`/`.md`; add
  `REMOVED_ASSET_FILES = ['slashforge-report-shell.html','slashforge-splice.js','slashforge-open.sh']`
  and OR it into `isStaleKitFile` so an upgrade deletes a prior install's copies. Export it for tests.
- **Remove** `templates/slashforge-report-shell.html`, `templates/slashforge-splice.js`,
  `templates/slashforge-open.sh` (deleted from the repo).
- **Modify** `templates/slashforge/investigate.md` — deliverable is
  `docs/slashforge/active/<issue-slug>/investigation.md`; derive the slug at intake; drop the shell/
  splice/open wording and the dot-dir warning; keep the `.slashforge/latest_investigation.json`
  contract (its `run_id` is the slug).
- **Modify** `templates/slashforge-workflow-investigation.md` — rewrite Phase I3: write a Markdown
  report file directly (five sections as Markdown), `mkdir -p docs/slashforge/active/<slug>`, no
  splice, no open-helper, no HTML-fallback block. Keep step 1b (the JSON contract) with `run_id` =
  slug. Update the hand-off wording to `active/<slug>/investigation.md` and `/slashforge-code <slug>`.
- **Modify** `templates/slashforge-workflow-review-pr.md` — rewrite Phase R4: write
  `docs/slashforge/reviews/pr-<N>-<title-slug>.md` (PR number + kebab title slug, **no date**) as
  Markdown (same sections; `SECURITY FINDINGS` becomes a conditional `##` heading + Markdown table);
  remove the splice/open bash block. Drop the "shared document shell" sentence.
- **Modify** `templates/slashforge/code.md` — Step 0b resolves `active/<slug>/investigation.md` and a
  bare `<issue-slug>` (an existing `active/<slug>/` with an `investigation.md`); replace the
  `investigations/investigation-*.html` examples. Update the confirmation line.
- **Modify** `templates/slashforge-workflow-fix.md` — the contract `run_id` example becomes the issue
  slug; Phase-1 slug reuse points at `active/<slug>/`.
- **Modify** `test/install.test.js` — remove/replace the HTML-splice tests (splice path resolution,
  "investigate.md must splice", open.sh calls, `spliceScript()` helper + its two tests, "every
  document writer calls the shipped splice script"). Add: neither investigate nor review-pr references
  `slashforge-splice.js`/`slashforge-open.sh`; investigate writes `active/<...>/investigation.md`;
  review-pr writes `reviews/<...>.md`; the three assets are not in `ASSET_FILES`; `assertTemplatesExist`
  no longer lists them.
- **Modify** `test/upgrade.test.js` — flip the asset-present check (L173) to assert the three retired
  assets are **removed** from a prior install after upgrade.
- **Modify** `test/spec-features.test.js` — drop/replace the `report-shell.html` read (L151).
- **Modify** docs: `docs/src/content/docs/commands/slashforge-investigate.md` and
  `slashforge-review-pr.md` — describe the Markdown reports; drop HTML/shell mentions.
- **Regenerate** `test/fixtures/claude-render/**`.

## Risks & edge cases
- **Deleting shipped assets** — `assertTemplatesExist(ASSET_FILES)` and `validateTemplates` must no
  longer list them, or install aborts. Grep every `ASSET_FILES`/basename reference before deleting.
- **Upgrade cleanup** — if the removal list is wrong, old installs keep dead assets. `upgrade.test.js`
  must prove removal.
- **Dangling references** — a leftover `slashforge-splice.js`/`report-shell`/`open.sh` mention in any
  template fails the new "no references" test. Grep templates after editing.
- **Issue slug when none is obvious** — if intake has no clear issue name, fall back to a short
  kebab summary of the symptom (document this in I1), never a timestamp.
- **Line limits** — review-pr guide is already oversize (303 rendered, on the allowlist); the R4
  rewrite must not grow the worst host further. Verify after rendering.

## Test strategy
- Red-first per task: add the new assertion (asset removed / no splice reference / `.md` path), watch
  it fail, then make the template/installer change.
- `assertTemplatesExist` and `validateTemplates` pass with the three assets gone; `ASSET_FILES` has
  exactly the two kept assets.
- `upgrade.test.js` proves a prior install's three assets are deleted on upgrade.
- A guard test greps all rendered templates for `slashforge-splice.js`, `slashforge-report-shell.html`,
  `slashforge-open.sh` and asserts zero matches.
- Regenerate the pinned render; `git diff test/fixtures/claude-render` shows the two reworked guides,
  the investigate/code/fix edits, and the three deleted asset fixtures — nothing else.
- Full `npm test` green; docs `npm run build` + five `check-docs-*` scripts green.
