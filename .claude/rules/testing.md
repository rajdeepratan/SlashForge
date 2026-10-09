---
name: testing
description: How tests are written and what CI gates on for this repo
paths:
  - "test/**/*.js"
  - "bin/**/*.js"
  - "templates/**"
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# Testing

## Framework

- Tests use the built-in **`node:test`** runner and **`node:assert`** — no Jest, Mocha, or other test dependency (zero-dep rule applies to tests too).
- Run the whole suite with `npm test` (which is `node --test`). Run one file with `node --test test/<file>.test.js`.
- Files live in `test/*.test.js`; fixtures in `test/fixtures/`.

## What the suite protects (don't regress these)

- **Target-block integrity** — the largest tested surface. Balanced, known-target tokens in every template.
- **Frontmatter validity** and **line limits** (200 / 500).
- **Atomicity** — a bad template throws before any directory is created.
- **Upgrade/uninstall** — old `forge-*` / `claude-setup` installs are still cleaned up.
- **Pinned Claude render** — `claude-render.test.js` asserts a Claude install is byte-identical to `test/fixtures/claude-render`.

## The render snapshot

When a change alters what a Claude install produces, the pinned-render test will fail. That is expected — regenerate and review:

```bash
node scripts/snapshot-claude-render.js   # rewrites test/fixtures/claude-render
git diff test/fixtures/claude-render     # review every line before committing
```

Never hand-edit a fixture to make a test pass — regenerate it from the templates so the fixture always reflects real installer output.

## Docs tests run in the docs workspace

Some tests (`docs-agent-only.test.js`) import `unist-util-visit`, which only the
docs workspace installs. The root `npm test` skips them; CI runs them from
`docs/` after `npm ci`. See `docs/.claude/rules/astro-docs.md`.

## CI gates

CI (`.github/workflows/ci.yml`) runs two jobs — the root test suite, and a docs job that builds the Astro site and runs the `check-docs-*` scripts. Both must be green. `main` auto-publishes, so never merge red.
