# Markdown Reports — Requirements

## Goal
Make `/slashforge-investigate` and `/slashforge-review-pr` write Markdown reports instead of the
spliced HTML shell, named and located the spec-driven way, and retire the now-unused HTML report
machinery.

## Problem
The project has moved to Markdown spec artifacts (`requirements.md`, `plan.md`, `tasks.md`), but two
flows still emit HTML built from a shared shell:

- `/slashforge-investigate` writes `docs/slashforge/investigations/investigation-<YYYY-MM-DD-HHMM>.html`
  — HTML, and named by timestamp rather than by the issue, so it does not live in the spec home and a
  later `/slashforge-code` / `/slashforge-fix` on the same issue cannot reuse its folder.
- `/slashforge-review-pr` writes `docs/slashforge/reviews/<YYYY-MM-DD>-pr-<N>.html` from the same
  shell.

Both depend on three shipped assets — `slashforge-report-shell.html`, `slashforge-splice.js`,
`slashforge-open.sh` — which exist only to build and open those HTML files. `install.test.js` already
carries a "Markdown writers must NOT reach for the HTML splice" test, so the migration is half-done;
this change finishes it.

## Behaviour
Once this ships:

- **Investigate is spec-driven.** At intake `/slashforge-investigate` derives a kebab **issue slug**
  from the symptom/issue reference and writes its findings report to
  `docs/slashforge/active/<issue-slug>/investigation.md` (Markdown, five sections as today). A later
  `/slashforge-code <issue-slug>` or `/slashforge-fix` reuses that same `active/<issue-slug>/` folder
  rather than starting a new one.
- **Review-pr writes Markdown, named by PR.** `/slashforge-review-pr` writes
  `docs/slashforge/reviews/pr-<N>-<title-slug>.md` (PR number + a kebab slug of the PR title, **no
  date**) as plain Markdown — same spec-driven naming philosophy as investigate, same sections,
  including the conditional `SECURITY FINDINGS` section as a Markdown heading/table.
- **No HTML shell.** Neither flow splices HTML or opens a browser. The report is a Markdown file the
  user reads in their editor; the chat still gets only the one-line conclusion, root cause, path and
  hand-off line.
- **The `/slashforge-code` hand-off follows.** Step 0b of `/slashforge-code` resolves
  `active/<issue-slug>/investigation.md` (and a bare `<issue-slug>`) as the requirements source; the
  `.slashforge/latest_investigation.json` contract's `run_id` becomes the issue slug.
- **Upgrades clean up.** Installing the new version removes the three retired assets from a prior
  install.

## Constraints & out of scope
- **Retire exactly three assets:** `slashforge-report-shell.html`, `slashforge-splice.js`,
  `slashforge-open.sh`. **Keep** `slashforge-review-payload.js` (GitHub review payload) and
  `slashforge-audit.js` (security parser) — they are unrelated to the HTML shell.
- **Issue slug** is kebab-case, collision-handled the same way as a change slug (`-2`, `-3`, … when
  `active/`/`archive/` already holds it); see `slashforge-spec-home.md`.
- Keep every non-negotiable: zero runtime deps, balanced target blocks, line limits (≤200 guide /
  ≤500 skill), pinned Claude render regenerated (never hand-edited), no secrets.
- Retired assets must be added to the installer's stale-cleanup so `uninstall`/upgrade removes them
  (the pattern already used for `OLD_ASSET_FILES`).
- **Out of scope:** changing the five report sections' content; the GitHub comment-posting path of
  review-pr (`review-payload.js`); the investigation *contract* JSON schema beyond its `run_id` stem;
  migrating already-generated `.html` reports on disk.

## Success criteria
- `/slashforge-investigate` guide + command write `active/<issue-slug>/investigation.md` and reference
  neither `slashforge-splice.js` nor `slashforge-open.sh`.
- `/slashforge-review-pr` guide writes `reviews/pr-<N>-<title-slug>.md` (no date) and references neither asset.
- `bin/install.js` no longer ships the three retired assets and removes them on upgrade; a test proves
  a prior install's copies are cleaned up.
- `/slashforge-code` Step 0b resolves `active/<issue-slug>/investigation.md` and a bare slug.
- No template references `slashforge-report-shell.html`, `slashforge-splice.js` or `slashforge-open.sh`.
- `npm test` is green (asset/splice tests updated), the pinned Claude render is regenerated, and the
  docs site builds with all five `check-docs-*` scripts passing.
