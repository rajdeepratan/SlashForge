---
name: templates
description: Conventions for authoring the slashforge-* guide and command templates in templates/
paths:
  - "templates/**/*.md"
  - "templates/**/*.html"
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# Template authoring

`templates/` is the product. Everything under it is rendered and installed into a
host (`claude`, `cursor`, `codex`, or `skills`) by `bin/install.js`. Authoring
mistakes here ship to every user, so the rules below are enforced by tests.

## Line limits (hard)

- Every guide/command `.md` stays **≤ 200 lines**, except a skill's `SKILL.md`, which may run to **≤ 500 lines**.
- Over the limit → split by meaning into a sibling guide and link it; never truncate.
- This is a project non-negotiable — see `docs/slashforge/constitution.md`.

## Frontmatter

- Every guide template starts with a YAML `---` block carrying at least `name` and `description`. `parseFrontmatter` / `validateTemplates` in `bin/install.js` reject malformed frontmatter at install time.
- When adding a new guide file, register it in the right array in `bin/install.js` (`GUIDE_FILES`, `COMMAND_FILES`, `SKILL_FILES`, or `ASSET_FILES`) — an unregistered template is never installed. See `.claude/skills/add-guide-file/`.

## Per-host target blocks

Host-specific wording is fenced with balanced tokens. Valid target names: `claude`, `agents`, `cursor`, `codex`, `neutral`.

```markdown
<!--target:claude-->
- Phase 7 — `slashforge-request-review`, then the `code-reviewer` agent
<!--/target-->
<!--target:agents-->
- Phase 7 — `slashforge-request-review`, then review the diff yourself
<!--/target-->
```

- Every `<!--target:x-->` **must** have a matching `<!--/target-->`. Unbalanced or unknown-target tokens fail `findTargetBlockErrors` and the test suite (the single most-tested surface in the repo).
- Tokens live on their own line. Do not nest target blocks.
- `claude` installs get the `claude` block; `cursor`/`codex`/`skills` get `agents` plus their own host block; `neutral` is host-neutral skill wording where Cursor and Codex differ.

## Asset files (no frontmatter)

`slashforge-report-shell.html`, `slashforge-open.sh`, `slashforge-splice.js`,
`slashforge-review-payload.js`, `slashforge-audit.js` are copied verbatim — do not
add frontmatter and do not expect rendering. A shipped `.js`/`.sh`/`.html` exists
so a host permission rule can allow it by path.

## After editing any template Claude Code reads

The Claude render is pinned byte-for-byte in `test/fixtures/claude-render`
(`claude-render.test.js`). If your edit changes what a Claude install produces,
regenerate the snapshot and review the diff — see `.claude/skills/add-guide-file/`
and `.claude/rules/testing.md`:

```bash
node scripts/snapshot-claude-render.js
```

Never hand-edit a fixture under `test/fixtures/claude-render` to make the test pass.
