# SlashForge — Architecture

How the kit is built and how its pieces fit. Refreshed from codebase exploration;
update it as the system grows. For the hard constraints see `constitution.md`.

## What SlashForge is

A zero-dependency Node CLI, published on npm as `slashforge`, that installs
spec-driven workflow slash commands into AI coding-agent hosts (Claude Code,
Cursor, Codex). The product is the content under `templates/`; `bin/install.js`
renders and places it per host.

## Tech stack

| Concern | Choice |
|---|---|
| Language / runtime | Node.js ≥ 24, CommonJS |
| Runtime deps | None (Node built-ins only) |
| Tests | `node:test` + `node:assert`, run with `npm test` |
| Docs site | Astro 7, ESM, in `docs/` (separate workspace with its own deps) |
| CI / release | GitHub Actions — `ci.yml`, `auto-release.yml`, `publish.yml` |

## The installer (`bin/install.js`)

A single CommonJS file, no build step. Responsibilities:

- **Target resolution** — resolves one of four targets, each with a render profile:
  - `claude` → `~/.claude`
  - `cursor`, `codex` → their own guide folder under `~/.agents/setup/slashforge`
  - `skills` → the host-neutral skill set under `~/.agents/skills` (read by both Cursor and Codex)
  A profile names which per-host **target blocks** it keeps and which guides it omits (`TARGETS`).
- **Template validation** — `parseFrontmatter` / `validateTemplates` reject malformed frontmatter, bad target blocks, or over-limit files before anything is written.
- **Rendering** — strips the target blocks a host doesn't use, rewrites command references to the host's sigil, and emits per-host frontmatter.
- **Atomic install** — validation happens first; a corrupt or missing template throws before any directory is created (`atomicity.test.js`).
- **Legacy cleanup** — recognises pre-5.0 `forge-*` and `claude-setup` layouts so `upgrade`/`uninstall`/`status` can clear them.
- Exports its functions/constants via `module.exports` so the test suite can unit-test them directly.

## The templates (`templates/`)

| Group | Files | Role |
|---|---|---|
| Guides | `slashforge-*.md` (`GUIDE_FILES`) | Reference docs agents read at runtime |
| Commands | `slashforge/{setup,code,investigate,fix,resume,review-pr}.md` (`COMMAND_FILES`) | User-typed entry points; drive `meta.json` + `status` |
| Disciplines | `slashforge/{brainstorm,plan,debug,tdd,verify,request-review,review-feedback,worktree,parallel}.md` (`SKILL_FILES`) | Workflow disciplines invoked on the user's behalf |
| Agents | `agents/*.md` | Agent dispatch templates |
| Assets | `slashforge-*.{html,sh,js}` (`ASSET_FILES`) | Copied verbatim, no frontmatter |

### Target blocks

Host-specific wording lives inline, fenced by `<!--target:x-->…<!--/target-->`.
Valid names: `claude`, `agents`, `cursor`, `codex`, `neutral`. Every open token has
a matching close; this is the single most-tested surface in the repo.

### The pinned render

`test/fixtures/claude-render` is a byte-for-byte snapshot of a Claude install.
`claude-render.test.js` diffs against it; `scripts/snapshot-claude-render.js`
regenerates it when a change to Claude output is intended.

## Tests (`test/`)

`node:test` files cover frontmatter parsing, target-block integrity, line limits,
atomicity, version comparison, upgrade/uninstall, the pinned render, and the
shipped command set. Docs-only tests (needing `unist-util-visit`) run from the
`docs/` workspace in CI.

## Docs site (`docs/`)

A separate Astro 7 workspace. Build runs `sync:changelog` (generates the changelog
page from the root `CHANGELOG.md`), then `astro build`, then pagefind. CI builds it
and runs the `.github/scripts/check-docs-*.mjs` checks (links, per-target markup,
table width, a11y, and facts-match-`package.json`). See `docs/CLAUDE.md` and
`docs/.claude/rules/astro-docs.md`.

## Release flow

1. Bump `package.json` on a `release/<version>` branch; finalize `CHANGELOG.md`.
2. Merge to `main`.
3. `auto-release.yml` (push to `main` touching `package.json`) creates the GitHub release tag.
4. `publish.yml` (on release published) runs tests and publishes to npm via OIDC trusted publishing — no token.

See `/cut-release` for the guided sequence.
