# Command lists that still stop at six/four — Plan

## Approach
Four hand-maintained command enumerations drifted when light-gears added
`/slashforge-test` and `/slashforge-refactor`. Add a drift-proof regression test
that asserts the install closing message lists **every** `COMMAND_FILES` entry
(reproducing the bug and guarding against the next addition), then patch the
closing message, the two stale `install.js`/test comments, and the homepage cost
tiles. Doc/prose-only — no behaviour change.

## Global constraints
- Zero runtime dependencies — Node built-ins only (`.claude/rules/cli.md`).
- `node:test` + `node:assert`; run with `npm test` (`.claude/rules/testing.md`).
- The Claude render is pinned — but these edits touch `console.log` strings,
  comments, a test, and the docs site, **not** template output, so the fixture
  should not change. Confirm by running the render test; do **not** hand-edit it.
- Docs site is a separate Astro workspace — build and run `check-docs-*` from
  `docs/` (`docs/.claude/rules/astro-docs.md`).

## Files
- **Modify** `test/install.test.js` — add Task 1's regression test asserting the
  closing message names every `commandName(c)` for `c` in `COMMAND_FILES`; fix
  the stale "four commands" comment (L2594) and rename the test at L2596.
- **Modify** `bin/install.js` — add `/slashforge-test` and `/slashforge-refactor`
  bullets to the closing message (L1199-1205); change the "The four commands"
  comment (L545) to count-agnostic wording.
- **Modify** `docs/src/pages/index.astro` — add cost tiles for `/slashforge-test`
  and `/slashforge-refactor` to the `costs` array (L115-146).

## Risks & edge cases
- The regression test runs the real installer via `execFileSync` into a temp
  `HOME` (mirrors the existing test at L2720) — no network, update check disabled.
- Presence-only assertions: `/slashforge-code` legitimately appears twice (plain
  and `-quick`); the test only checks each command name is present, so that is fine.
- Homepage tiles are curated cost tiers, not one-per-command (there is no fix or
  resume tile today, and `-quick`/Graphify tiles are not commands). See the two
  open decisions below — resolve them at the Phase 3 gate before editing the tiles.

## Open decisions for the gate
1. **fix/resume tiles:** the issue is about test/refactor missing. Add only those
   two (recommended — keeps the tiles as cost tiers), or also add fix and resume?
2. **Tile token values:** the comprehensive table in `introduction.md` deliberately
   uses *qualitative* wording for these commands ("light", "tracks the base
   workflow") rather than numbers. Proposed tile values below are estimates in that
   spirit — confirm or adjust the exact figures.

## Test strategy
One regression test (Task 1), added before any fix, that reproduces the bug: it
installs and asserts the closing message contains every shipped command — fails
today (test + refactor absent), passes after the patch. It generalises over
`COMMAND_FILES`, so a future command that is not added to the message fails loudly.
The comment/tile edits are prose/content and are covered by the full suite staying
green, the pinned-render test being unchanged, and the docs `check-docs-*` scripts.
