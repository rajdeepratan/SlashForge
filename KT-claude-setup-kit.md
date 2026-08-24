# KT: claude-setup-kit (SlashForge)

> Knowledge-transfer document. Read existing docs (README, CHANGELOG) for full detail; this is the map, not the manual.

---

## Purpose

`slashforge` (npm) installs workflow slash commands for AI coding agents — currently Claude Code only. It provides four entry-point commands that cover the full lifecycle: repo setup, freeform development (full and lean), read-only investigation, and PR review. Philosophy: guardrails over speed, ceremony is the product.

---

## Stack

| Layer | Detail |
|---|---|
| Runtime | Node.js ≥ 16 (pure JS, zero dependencies) |
| CLI | Single file: `bin/install.js` (~677 lines, CommonJS) |
| Templates | `templates/` — Markdown + HTML + shell (all checked in) |
| Tests | Node built-in test runner (`node --test`, one file: `test/install.test.js`) |
| Docs | Separate Astro workspace (`docs/`) — Node ≥ 22, own `package-lock.json` |
| CI | GitHub Actions: `ci.yml`, `publish.yml`, `auto-release.yml` |
| Publish | npm OIDC trusted publishing (no token) |

---

## Architecture

```
claude-setup-kit/
├── bin/
│   └── install.js          # Entire CLI — all logic here, exports all fns for tests
├── templates/
│   ├── forge-*.md          # 16 guide files (content installed into ~/.claude/setup/slashforge/)
│   ├── forge-report-shell.html  # Self-contained HTML shell for investigation/review reports
│   ├── forge-open.sh       # Shared cross-platform browser-open helper (exits 0 always)
│   └── slashforge/
│       ├── setup.md        # Entry-point command: /slashforge:setup
│       ├── code.md         # Entry-point command: /slashforge:code
│       ├── investigate.md  # Entry-point command: /slashforge:investigate
│       ├── review-pr.md    # Entry-point command: /slashforge:review-pr
│       ├── brainstorm.md   # Skill: slashforge:brainstorm
│       ├── plan.md         # Skill: slashforge:plan
│       ├── debug.md        # Skill: slashforge:debug
│       ├── tdd.md          # Skill: slashforge:tdd
│       ├── verify.md       # Skill: slashforge:verify
│       ├── worktree.md     # Skill: slashforge:worktree
│       ├── parallel.md     # Skill: slashforge:parallel
│       ├── request-review.md   # Skill: slashforge:request-review
│       └── review-feedback.md  # Skill: slashforge:review-feedback
├── test/
│   └── install.test.js     # All tests — unit + CLI integration
├── docs/                   # Astro site (separate workspace, own lockfile)
└── package.json            # name: slashforge, version: 4.4.2
```

### Install targets

| Mode | Guides | Commands/Skills |
|---|---|---|
| Global (default) | `~/.claude/setup/slashforge/` | `~/.claude/commands/slashforge/` |
| Project (`--project`) | `./.claude/setup/slashforge/` | `./.claude/commands/slashforge/` |

The `slashforge/` subdirectory under `commands/` is what produces the `/slashforge:` namespace.

### Key functions in `bin/install.js`

| Function | Role |
|---|---|
| `resolveTarget()` | Returns `{ guidesDir, commandsDir, metaFile, installPath, mode }` for global or project |
| `parseFrontmatter()` | Validates `---` fences + required `name`/`description` fields |
| `validateTemplates()` | Runs parseFrontmatter on every guide/command/skill before any write |
| `assertTemplatesExist()` | Existence-only check for assets (no frontmatter) |
| `renderTemplate()` | Replaces `{{INSTALL_PATH}}`, `{{KIT_VERSION}}`, `{{KIT_PACKAGE}}` |
| `installFiles()` | Validates → writes guides (rendered) + assets (verbatim) + commands/skills (rendered) + `meta.json` + cleans `REMOVED_GUIDE_FILES` |
| `uninstallFiles()` | Removes current + legacy files; prunes empty namespace dir |
| `warnIfOutdated()` | Async npm registry check (1.5s timeout, silent failures, skipped in CI) |
| `isNewerVersion()` | Strict semver `x.y.z` comparison — false on any unparseable input |

### File lists (constants in install.js)

- `GUIDE_FILES` — 16 `forge-*.md` files
- `COMMAND_FILES` — 4 entry-point commands (drives `meta.json` and `status` output)
- `SKILL_FILES` — 9 discipline skills (install to namespace dir but excluded from `meta.json`)
- `ASSET_FILES` — 2 non-markdown files (`forge-report-shell.html`, `forge-open.sh`)
- `REMOVED_GUIDE_FILES` — stale files cleaned on upgrade (currently: `forge-preflight.md`)
- `LEGACY_COMMAND_FILES` — v2/v3 paths cleaned by `uninstall`

---

## Build / Test / Run Commands

```bash
# Run tests
npm test                          # node --test (no build step needed)

# Run CLI locally
node bin/install.js               # install to ~/.claude (prompts if already installed)
node bin/install.js --project --yes   # non-interactive project install
node bin/install.js --dry-run     # preview writes
node bin/install.js status        # show installed state
node bin/install.js uninstall --yes

# Docs (separate workspace)
cd docs && npm ci && npm run build   # Astro build
# Also: check-docs-links.mjs, check-docs-a11y.mjs, check-docs-facts.mjs (run by CI)
```

**No build step for the CLI** — pure CommonJS, runs directly with Node.

**Non-interactive mode:** `--yes` / `-y` / `SLASHFORGE_YES=1` / non-TTY stdin. All three are equivalent.

---

## CI / Publish Pipeline

### CI (`ci.yml`)
- Triggers: push, PR, `workflow_dispatch`
- Jobs:
  - `test` — matrix [Node 16, 18, 20, 22] runs `npm test`
  - `docs` — Node 22, `npm ci` + `npm run build` in `docs/`, then three custom lint scripts

### Publish flow (automated)
1. Bump `package.json` version → merge PR to `main`
2. `auto-release.yml` fires (on `package.json` changes to main) → creates GitHub release → dispatches `publish.yml`
3. `publish.yml` fires (on release published or manual dispatch) → runs tests → `npm publish --provenance --access public` via OIDC (no secret token)

**OIDC requirement:** npm ≥ 11.5.1 is verified before publish. Node 24 used for publish job.

> See memory `slashforge-npm-publishing.md` for token-scope and 2FA gotchas.

---

## Conventions

- **No external dependencies** — `bin/install.js` uses only Node stdlib
- **Templates validated before any write** — partial installs are refused, not silently tolerated
- **Guide files are rendered, not copied** — `renderTemplate()` runs on every `.md` file; assets are verbatim
- **COMMAND_FILES ≠ SKILL_FILES** — skills install to the same namespace dir but are excluded from `meta.json` to keep `status` output clean
- **Legacy cleanup** — `REMOVED_GUIDE_FILES` and `LEGACY_COMMAND_FILES` ensure upgrades don't leave orphans
- **Tests run the actual template scripts** — the investigate splice script and review-pr payload assembler are extracted from the template and run, not duplicated in the test
- **Skills carry MIT attribution** — each adapted skill file must include the Jesse Vincent attribution (tested)
- **No superpowers dependency** — removed in v4.3.0; a test enforces no `superpowers:*` invocations survive in templates

---

## Current State (v4.4.2, 2026-08-14)

- **Stable.** Four commands, nine discipline skills, fully self-contained.
- **Recent refactors:** v4.4.1 split `review-pr.md` into dispatcher + `forge-workflow-review-pr.md`; v4.4.2 did the same for `investigate.md` + `forge-workflow-investigation.md`. Shape is now consistent: each command file is a short dispatcher, detail lives in the workflow guide.
- **Superpowers:** fully removed in v4.3.0. Test at line 409 of `install.test.js` enforces this.
- **Untracked:** `docs/slashforge/` appears in `git status` — local investigation reports from running the commands in this repo.

---

## Notable TODOs / Risks

| Risk / TODO | Detail |
|---|---|
| **Cursor / Codex targets** | README says "planned" — no implementation exists |
| **Graphify pre-1.0** | Graphify is v0.5.0; install commands may change upstream. Re-run `npx slashforge` to pull updated guide content. |
| **`npx` staleness trap** | `npx` prefers a global install and never checks the registry. `warnIfOutdated()` mitigates but can't fix it for offline users. Documented in README. |
| **Docs lockfile (macOS)** | macOS-generated `docs/package-lock.json` omits Linux optionals; `npm ci` fails on CI. See memory `slashforge-docs-lockfile-trap.md`. Generate lockfile on Linux or use `--ignore-scripts`. |
| **Node 16 matrix** | Kept because `engines` declares `>=16`. Any failure there means the claim is false and `engines` should be raised. |
| **`auto-release.yml` + GITHUB_TOKEN** | A release created by `GITHUB_TOKEN` doesn't trigger other workflows; `publish.yml` is explicitly dispatched to work around this. |
