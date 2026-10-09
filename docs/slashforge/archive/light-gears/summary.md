# light-gears — Archived

**Shipped:** 2026-10-09 · **PR:** #101 · **Released in:** 5.2.0 (PR #102)

Added two lightweight, standalone commands to the kit, shipped together, giving
the right-sized gear to two bounded tasks that previously forced the full
ten-phase `/slashforge-code` flow:

- **`/slashforge-test <file|glob>`** — generates spec-based test coverage for
  existing files. Discovers the repo's test framework, naming, and run command
  from `CLAUDE.md`/`AGENTS.md` (falling back to the manifest and existing
  tests), derives intended behaviour from the target's contract, never edits
  production code, and writes a `latest_investigation.json` contract on red so a
  surfaced bug can hand off to `/slashforge-fix`.
- **`/slashforge-refactor`** — zero-functional-change refactoring gated by the
  existing suite passing with identical results before and after.

Wired into `bin/install.js` (`COMMAND_FILES`, `GUIDE_FILES`), the repo
`CLAUDE.md` orchestration table, `architecture.md`, and the `add-command` skill;
the command enumerations across the kit were swept to the resulting set of
eight. The pinned Claude render was regenerated for the two new commands.
