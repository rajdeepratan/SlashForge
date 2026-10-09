---
name: astro-docs
description: Conventions and known traps for the docs/ Astro workspace
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# Docs site (`docs/`) conventions

The docs site is a **separate Astro workspace** with its own `package.json`,
`package-lock.json`, and `node_modules`. It is ESM (`"type": "module"`), unlike
the root CLI (CommonJS). Run docs commands from inside `docs/`.

## Commands (run from `docs/`)

- `npm ci` — install (CI uses this; see the lockfile trap below)
- `npm run dev` — local dev server (runs `sync:changelog` first)
- `npm run build` — production build (runs `sync:changelog`, then pagefind)
- The changelog page `docs/src/content/docs/changelog.md` is **generated** from the repo-root `CHANGELOG.md` at build time — never edit or commit it (it's gitignored).

## Known traps

**Lockfile must be Linux-complete.** A `package-lock.json` regenerated on macOS can
omit Linux-only optional deps, and CI's `npm ci` then fails. If you must refresh
the lockfile, make sure it includes the platform-optional entries CI needs — don't
commit a macOS-only lockfile.

**Astro cache swallows plugin edits.** Changes to the custom plugins in
`docs/src/plugins/` (and other build-time code) can appear to do nothing until the
cache is cleared. Remove `docs/node_modules/.astro` (and `docs/.astro`) and rebuild
when a plugin edit isn't taking effect.

## CI doc-checks (must pass)

CI runs these from `docs/` after a build — keep the site clean against all of them
(scripts live in `.github/scripts/`):

- `check-docs-links.mjs` — internal links resolve (Astro won't fail a dead in-page link on its own)
- `check-docs-targets.mjs` — per-target command markup renders the three spellings
- `check-docs-width.mjs` — no over-wide per-agent tables (the site shows one agent at a time)
- `check-docs-a11y.mjs` — interactive elements have accessible names
- `check-docs-facts.mjs` — documented version/facts match the root `package.json`

The last one matters most on a release: the documented version is derived from
`package.json`, so never hand-write the version into a page.

## Docs-only tests

`test/docs-agent-only.test.js` imports `unist-util-visit`, which only this
workspace installs, so CI runs it from `docs/`, not from the root `npm test`.
