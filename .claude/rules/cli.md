---
name: cli
description: Conventions for the installer CLI in bin/install.js
paths:
  - "bin/**/*.js"
  - "scripts/**/*.js"
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# CLI conventions (`bin/install.js`)

`bin/install.js` is the whole installer — a single CommonJS file, no build step.

## Zero runtime dependencies (hard)

- The installer uses only Node built-ins (`fs`, `path`, `os`, `readline`). **Never add a runtime dependency** and never add a `dependencies` block to the root `package.json`. `files` ships only `bin/` and `templates/`.
- This is a project non-negotiable — see `docs/slashforge/constitution.md`. A test asserts it.

## Node and module style

- Target Node **≥ 24** (`engines` in `package.json`); the CI matrix floor must equal the engines floor.
- CommonJS (`require` / `module.exports`), not ESM. (The docs workspace is ESM — that's separate.)
- Export every function and constant a test needs via `module.exports` at the bottom. Tests import named members from `../bin/install.js`; a function with no export is effectively untested.

## Testability over cleverness

- Keep functions pure and small where possible so they can be unit-tested without a filesystem. Where a filesystem is needed, tests use a temp dir — follow that pattern.
- Install must be **atomic**: a corrupt or missing template aborts before any directory is created (`atomicity.test.js`). Validate first, write second — never leave a half-written install.

## Legacy compatibility

- Old `forge-*` names and the `forge`/`claude-setup` layouts are kept only so `uninstall`/`status`/upgrade can clean up pre-5.0 installs. Don't remove the legacy handling without a deliberate migration; `upgrade.test.js` guards it.

## Scripts

- `scripts/snapshot-claude-render.js` regenerates the pinned Claude fixture. Run it only when a change to what Claude reads is intended, then review the diff. It is not wired to an npm script — run it with `node scripts/snapshot-claude-render.js`.
