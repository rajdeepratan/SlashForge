<!-- generated_by: slashforge@5.1.1 generated_at: 2026-10-08T22:04:35.424Z -->

# slashforge

The source repo for **SlashForge** — a zero-dependency Node CLI that installs
spec-driven workflow slash commands (`setup`, `code`, `investigate`, `fix`,
`resume`, `review-pr`, `test`, `refactor`) into Claude Code, Cursor, and Codex. The product is the
`templates/` it ships; `bin/install.js` renders and installs them per host.

## Agent orchestration

| When the user says... | Invoke |
|---|---|
| "investigate", "does this bug exist?", "reproduce this", "root-cause" | `/slashforge-investigate` |
| "build", "add a feature", "change X", "fix Y" | `/slashforge-code` |
| "small change", "tiny fix", "one-liner" | `/slashforge-code -quick` |
| "add test coverage for an existing file", "cover this file", "write tests for X" | `/slashforge-test` |
| "refactor safely", "clean up without changing behaviour", "restructure X" | `/slashforge-refactor` |
| "cut a release", "publish", "bump the version" | `/cut-release` |
| "installer", "templates", "target blocks" (mid-task) | `cli-developer` agent |
| "write tests for the change being built" (mid-task) | `test-writer` agent |
| "docs site", "Astro page" (mid-task) | `docs-developer` agent (see `docs/CLAUDE.md`) |
| "review", "check the code" (mid-task) | `code-reviewer` agent |
| "push", "create a PR", "branch" (mid-task) | `git` agent |
| anything else | `developer` agent |

## Project References

| Type | File |
|---|---|
| Rule | `.claude/rules/git.md` |
| Rule | `.claude/rules/templates.md` |
| Rule | `.claude/rules/cli.md` |
| Rule | `.claude/rules/testing.md` |
| Skill | `.claude/skills/add-guide-file/SKILL.md` |
| Skill | `.claude/skills/add-command/SKILL.md` |
| Command | `.claude/commands/cut-release.md` |
| Agent | `.claude/agents/developer.md` |
| Agent | `.claude/agents/cli-developer.md` |
| Agent | `.claude/agents/test-writer.md` |
| Agent | `.claude/agents/code-reviewer.md` |
| Agent | `.claude/agents/git.md` |
| Spec | `docs/slashforge/constitution.md` |
| Spec | `docs/slashforge/architecture.md` |
| Spec | `docs/slashforge/status.md` |

The `docs/` Astro site is a separate workspace with its own `docs/CLAUDE.md`, rule, and agent.

## Project overview

SlashForge is distributed on npm as `slashforge`. A user runs the installer, which
copies and renders the `templates/` into their agent host's config directory. The
guides (`templates/slashforge-*.md`) are read by agents at runtime; the commands
and discipline skills (`templates/slashforge/*.md`) are the invocable entry points.

## Tech stack

| Concern | Choice |
|---|---|
| Language / runtime | Node.js ≥ 24, CommonJS |
| Runtime dependencies | **None** — Node built-ins only |
| Installer | `bin/install.js` (single file) |
| Product | `templates/` (guides + commands, rendered per host) |
| Tests | `node:test` + `node:assert` (`npm test`) |
| Docs site | Astro 7 in `docs/` (separate ESM workspace) |
| CI / release | GitHub Actions; version bump on `main` → auto-release → npm (OIDC) |

## Commands

```bash
npm test                               # run the full node:test suite
node --test test/install.test.js       # run one test file
node bin/install.js --dry-run          # preview an install without writing
node bin/install.js --help             # CLI usage
node scripts/snapshot-claude-render.js # regenerate the pinned Claude render fixture
```

Docs commands run from `docs/` — see `docs/CLAUDE.md`.

## Project structure

```
bin/install.js            # the installer CLI (renders + installs templates)
templates/
├─ slashforge-*.md        # guide/reference files read by agents at runtime
├─ slashforge/*.md        # commands (setup, code, …) + discipline skills (plan, tdd, …)
├─ agents/                # agent dispatch templates
└─ slashforge-*.{html,sh,js}  # asset files, copied verbatim (no frontmatter)
test/                     # node:test suite + fixtures/ (incl. pinned claude-render)
scripts/snapshot-claude-render.js   # regenerates the pinned fixture
docs/                     # Astro docs site (separate workspace)
docs/slashforge/          # the spec home — constitution, architecture, status, archive
.github/workflows/        # ci.yml, auto-release.yml, publish.yml
.github/scripts/          # check-docs-*.mjs (run against the built docs site)
```

## Architecture overview

- `bin/install.js` resolves a **target** (`claude` / `cursor` / `codex` / `skills`), each with its own render profile — which per-host target blocks to keep and which guides to omit.
- **Target blocks** (`<!--target:x-->…<!--/target-->`) fence host-specific wording inside one template. Balance and valid names are enforced by tests.
- The **Claude render is pinned** byte-for-byte in `test/fixtures/claude-render`. Any change to Claude output must be reflected by regenerating that fixture.
- Installs are **atomic** — validation happens before any directory is written.
- See `docs/slashforge/architecture.md` for the full picture.

## Non-negotiable rules (see `docs/slashforge/constitution.md`)

- **Zero runtime dependencies** — the installer uses only Node built-ins; never add a `dependencies` entry.
- **Line limits** — every guide/command `.md` ≤ 200 lines (≤ 500 for a `SKILL.md`); split, never truncate. See `.claude/rules/templates.md`.
- **`main` is the release trigger** — a `package.json` version bump merged to `main` publishes to npm. `main` must always be green and releasable. See `.claude/rules/git.md`.
- **Pinned Claude render** — regenerate `test/fixtures/claude-render` (never hand-edit) when template output changes. See `.claude/rules/testing.md`.
- **Balanced target blocks** — every `<!--target:x-->` has a matching `<!--/target-->`; only valid target names.
- **No secrets committed** — publish tokens/2FA live outside the repo; publish uses OIDC with no token.
- Branch as `type/short-desc`; confirm the base branch before branching.
