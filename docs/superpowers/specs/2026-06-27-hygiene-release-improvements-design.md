# claude-setup-kit — Hygiene & Release Improvements

**Date:** 2026-06-27
**Status:** Approved, pending implementation

## Goal

Close the engineering-hygiene and release-reliability gaps in `claude-setup-kit`
without changing the behaviour of the installed guides or slash commands. Seven
discrete improvements, shipped as one branch / one PR with logically grouped
commits.

## Background

The kit is a dependency-free Node CLI (`bin/install.js`) that installs Claude
Code setup guides + four slash commands into `~/.claude/`. Current gaps:

- `package.json` has `"scripts": {}` — no tests, and the only CI is
  `publish.yml` (runs `npm publish` on GitHub Release, with zero validation
  first).
- The version bump (merge to `main`) and the publish trigger (a manually
  created GitHub Release) are decoupled — easy to bump and forget to release.
- No `.gitignore` (so `.DS_Store` keeps reappearing), no `uninstall` path, no
  way to install commands into a repo for a team, no `CHANGELOG.md`.

## Design decisions (resolved during brainstorming)

1. **Auto-release** → minimal custom GitHub Actions workflow (no `release-please`,
   no conventional-commit enforcement). Matches the kit's lightweight, no-deps
   style.
2. **`--project` mode** → **self-contained**: vendor both the guide files and the
   command files into the repo's `./.claude/`, with `{{INSTALL_PATH}}` rendered
   repo-relative, so a teammate who clones the repo gets working commands with no
   global kit install.

## Architecture change (enables #1, #5, #6)

`bin/install.js` currently runs on import: it creates a `readline` interface at
module top-level and calls `main()`. To make it testable and to add the new
subcommands cleanly:

- Export the pure functions (`parseFrontmatter`, `validateTemplates`, the render
  step) and the new `install` / `uninstall` logic.
- Run the CLI only under `if (require.main === module)`.
- Create the `readline` interface lazily (only when an interactive prompt is
  actually needed), so importing the module for tests has **no side effects**.
- `install()` / `uninstall()` take a **target descriptor** — `{ guidesDir,
  commandsDir, metaFile, installPath }` — instead of hardcoding `~/.claude`.
  Global vs `--project` becomes one resolver that returns the right descriptor.

Global-mode output is byte-for-byte unchanged from today.

## The seven items

### #1 — Test suite + CI

- `test/install.test.js` using built-in `node:test` + `node:assert` (no deps).
  Coverage:
  - `parseFrontmatter`: valid frontmatter; missing opening fence; missing
    closing fence; missing required `name` / `description`.
  - `validateTemplates`: runs against the **real** `templates/` — all guide and
    command templates must pass (catches broken frontmatter before publish).
  - render step: all three tokens (`{{INSTALL_PATH}}`, `{{KIT_VERSION}}`,
    `{{KIT_PACKAGE}}`) substituted; no token left behind.
  - integration: `install()` into a temp dir (global-style and project-style),
    asserting guide files, command files, and `meta.json` land at the right
    paths with the right rendered content.
- `package.json`: `"scripts": { "test": "node --test" }`.
- `.github/workflows/ci.yml`: on `push` + `pull_request`, run `npm test` on a
  Node version matrix (18, 20, 22).

### #2 — Auto-release on version bump

- `.github/workflows/auto-release.yml`: trigger on `push` to `main` with
  `paths: ['package.json']`.
- Steps: read `version` from `package.json`; if tag `v$VERSION` does **not**
  already exist, run `gh release create v$VERSION --generate-notes --title
  v$VERSION`. Creating the release triggers the existing `publish.yml`.
- Idempotent: a push that doesn't change the version, or where the tag already
  exists, is a clean no-op.
- `permissions: contents: write`; uses the default `GITHUB_TOKEN`.

### #3 — npm provenance

- `publish.yml` gains `permissions: { contents: read, id-token: write }`.
- Add a gate step that runs `npm test` before publishing.
- `npm publish --provenance --access public`. `repository.url` is already set in
  `package.json`, so the provenance attestation validates.

### #4 — `.gitignore`

Entries: `node_modules/`, `.DS_Store`, `*.log`, `npm-debug.log*`, `.npm/`,
`coverage/`.

### #5 — `uninstall` subcommand

- `claude-setup-kit uninstall [--project] [--yes]`.
- Removes the guide dir, the four command files, and `meta.json` from the
  matching location — global by default, `./.claude/` under `--project`.
- Confirms first unless `--yes` (or non-TTY / `CLAUDE_SETUP_KIT_YES=1`).
- Prints exactly what was removed; degrades gracefully if nothing is installed.
- Never deletes `~/.claude` itself, the `commands/` dir, or any unrelated file —
  only the kit's own four command files + the kit's guide dir + `meta.json`.

### #6 — `--project` install mode (self-contained)

- `claude-setup-kit --project` writes:
  - guides → `./.claude/setup/claude-setup/`
  - commands → `./.claude/commands/`
  - `meta.json` → alongside the guides
- `{{INSTALL_PATH}}` rendered as the repo-relative path
  `.claude/setup/claude-setup` (resolves from the repo root, which is Claude
  Code's working dir for project commands).
- Result is fully committable. Global mode remains the default, unchanged.
- `status` is `--project`-aware (reports the project install when the flag is
  passed).

### #7 — CHANGELOG + README

- `CHANGELOG.md` in Keep-a-Changelog format. First full entry: `1.4.0` (phased
  setup flow). Brief backfilled entries for recent tags (1.3.0, 1.2.x) from git
  history. An `[Unreleased]` section captures this batch.
- `README.md`: add badges (npm version, license, node engine); document the
  `uninstall` subcommand and `--project` flag in the existing flags/subcommands
  section. Light touch — no structural rewrite.

## Testing strategy

The new test suite is the primary verification. Phase 6 runs `npm test`.

- No lint or build step exists in this repo (plain Node CLI) and none is added —
  out of scope.
- GitHub workflow YAML is validated with `actionlint` if available, otherwise by
  careful review (the workflows only execute on GitHub).

## Out of scope

- `release-please` / conventional-commit enforcement.
- A build/transpile step.
- Any change to the installed guide or command **content** (the kit's product
  behaviour).
- Test coverage thresholds / coverage reporting tooling.

## Delivery

One branch (`feat/hygiene-release-improvements`), one PR, commits grouped by
concern: (a) install.js refactor + tests + CI; (b) release automation +
provenance; (c) uninstall + project mode; (d) docs (.gitignore, CHANGELOG,
README).
