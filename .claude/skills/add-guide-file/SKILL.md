---
name: add-guide-file
description: Add a new slashforge-* guide template to the kit — use when creating a new workflow/reference guide that agents read, wiring it into the installer, and regenerating the render snapshot
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# Add a guide file

A "guide" is a `templates/slashforge-*.md` reference that is installed next to the
commands and read by agents at runtime (e.g. `slashforge-workflow-verify.md`).
This recipe adds one and wires it so the installer actually ships it.

## Before starting

Read `.claude/rules/templates.md` (authoring rules) and `.claude/rules/cli.md`
(installer conventions).

## Steps

1. **Create the file** at `templates/slashforge-<name>.md`. Start with YAML frontmatter (`name`, `description`) and keep the body **≤ 200 lines**. If it would run longer, split it and link a sibling guide.
2. **Use per-host target blocks** for any host-specific wording — balanced `<!--target:claude-->…<!--/target-->` / `<!--target:agents-->…<!--/target-->`. Valid names: `claude`, `agents`, `cursor`, `codex`, `neutral`.
3. **Register it in the installer.** Add the filename to the `GUIDE_FILES` array in `bin/install.js` (keep it near related guides). An unregistered guide is never installed.
4. **Reference it** from whatever guide or command loads it (e.g. a `workflow.md` "companion files" list). A guide nothing points to is dead weight.
5. **Run the tests** — `npm test`. Frontmatter, line-limit, and target-block checks run here.
6. **Regenerate the Claude render snapshot** (the pinned-render test will otherwise fail, by design):
   ```bash
   node scripts/snapshot-claude-render.js
   git diff test/fixtures/claude-render
   ```
   Review the diff: the new guide should appear, and nothing unrelated should change.
7. **Update `CHANGELOG.md`** under `## [Unreleased]` describing the new guide.

## Verify

- [ ] File is ≤ 200 lines with valid frontmatter
- [ ] Every `<!--target:x-->` has a matching `<!--/target-->`; all target names are valid
- [ ] Filename added to `GUIDE_FILES` in `bin/install.js`
- [ ] At least one existing guide/command references the new file
- [ ] `npm test` passes
- [ ] `test/fixtures/claude-render` regenerated and the diff reviewed
- [ ] `CHANGELOG.md` updated
