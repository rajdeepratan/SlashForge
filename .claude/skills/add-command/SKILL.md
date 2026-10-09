---
name: add-command
description: Add a new user-facing slash command or discipline skill to the kit — use when creating a new /slashforge-* entry point or workflow discipline, wiring it into the installer and snapshot
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# Add a command or discipline skill

The kit ships two kinds of invocable template, both living in
`templates/slashforge/<name>.md` and both installed as `slashforge-<name>` on
every host:

- **Commands** (`COMMAND_FILES`) — the entry points a user types: `setup`, `code`, `investigate`, `fix`, `resume`, `review-pr`. These drive `meta.json`'s `commands` list and the `status` output.
- **Discipline skills** (`SKILL_FILES`) — disciplines the workflow invokes on the user's behalf: `brainstorm`, `plan`, `debug`, `tdd`, `verify`, `request-review`, `review-feedback`, `worktree`, `parallel`. Kept out of `COMMAND_FILES` on purpose so `status` reports only what users actually type.

## Before starting

Read `.claude/rules/templates.md` and `.claude/rules/cli.md`. Decide first: is this
a user entry point (command) or an internal discipline (skill)? That decides which
array it goes in.

## Steps

1. **Create** `templates/slashforge/<name>.md` with frontmatter (`name`, `description`) and body **≤ 200 lines** (≤ 500 if authored as a skill). Use target blocks for host-specific wording — a command often needs a `claude` vs `agents` split for how it dispatches reviewers/PRs.
2. **Register it** in `bin/install.js`: add `path.join('slashforge', '<name>.md')` to `COMMAND_FILES` (user command) **or** `SKILL_FILES` (discipline). Do not put it in both.
3. **Wire references** — if it's a command, reference it from `CLAUDE.md`'s orchestration table and any workflow guide that hands off to it. If it's a discipline, make sure the phase that invokes it names it.
4. **Run tests** — `npm test` (`spec-features.test.js` asserts that shipped commands install correctly).
5. **Regenerate the snapshot** and review:
   ```bash
   node scripts/snapshot-claude-render.js
   git diff test/fixtures/claude-render
   ```
6. **Update `CHANGELOG.md`** under `## [Unreleased]`. If it's a new user command, it will also surface in `meta.json`'s `commands` — mention it in the docs site.

## Verify

- [ ] File is within its line limit with valid frontmatter
- [ ] Target blocks balanced; target names valid
- [ ] Added to exactly one of `COMMAND_FILES` / `SKILL_FILES`
- [ ] Referenced from `CLAUDE.md` (commands) or the invoking phase (disciplines)
- [ ] `npm test` passes
- [ ] Snapshot regenerated and diff reviewed
- [ ] `CHANGELOG.md` updated
