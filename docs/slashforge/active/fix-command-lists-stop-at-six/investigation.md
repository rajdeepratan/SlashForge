# Investigation — command lists that still stop at six/four

**Summary:** Confirmed. Four hand-maintained command enumerations were missed when light-gears
added `/slashforge-test` and `/slashforge-refactor`; the issue named three, a fourth (a test comment
+ name) is the same bug.

## Reproduction

- Check out `main` at HEAD `7e0e26a` (v5.2.1), where `COMMAND_FILES` in `bin/install.js:60` holds all
  eight commands (setup, code, investigate, fix, resume, review-pr, test, refactor).
- **Install message:** read `bin/install.js:1199-1205` — the post-install "Done!" block hand-lists
  only seven entries (setup, code, `-quick`, investigate, fix, resume, review-pr). `/slashforge-test`
  and `/slashforge-refactor` are absent. Run a real install (not `--dry-run`, which short-circuits
  before this block) to see it printed.
- **Stale comment:** read `bin/install.js:544-546` — the comment says "The four commands must run
  only when the user types them" above logic that iterates the eight `COMMAND_FILES`.
- **Landing page tiles:** read the `costs` array in `docs/src/pages/index.astro:115-146` — six tiles
  (Repo setup, Full run, With Graphify, Lean mode, Investigating a bug, Reviewing a PR); no tile for
  test or refactor.
- **Also found (not in the issue):** `test/install.test.js:2594-2596` — the comment and the test name
  "the four commands run only when typed on Cursor and Codex" carry the same stale "four" (the test
  body itself iterates all eight correctly).

## Root cause

The command set is enumerated in two kinds of place. **Derived** enumerations — the `status` output
(`bin/install.js:1064`, `COMMAND_FILES.filter(...)`) and `meta.json`'s `commands` — read from
`COMMAND_FILES`, so they updated to eight automatically when light-gears extended that list.
**Hand-maintained** enumerations are string literals duplicating the set with no single source of
truth and no test guarding their count, so each must be edited by hand.

The light-gears sweep commit `0c2b762` ("sweep remaining command enumerations to eight") updated some
hand-maintained copies — the homepage meta `description` (`docs/src/pages/index.astro:152`), the
install "you should see" lists, and the introduction.md cost table — but missed the homepage `costs`
tiles array (a separate enumeration from the meta description just above it and from the introduction
table), the install closing message, the `install.js` "four commands" comment, and the matching test
comment/name. The miss is inherent to sweeping duplicated literals by hand: it is only as complete as
the person's grep.

## Affected scope

- **Versions:** 5.2.1 (present at HEAD `7e0e26a`). The install message and comment have drifted since
  light-gears (PR #101, 5.2.0); the landing-page tiles have shown six since before that.
- **Environments:** cosmetic / documentation only. The install closing message is printed on every
  real Claude install (global and `--project`); the `status` command and the installed command set
  are unaffected and already correct. The landing page affects the public site
  `rajdeepratan.com/slashforge` once rebuilt.
- **Users:** anyone reading the post-install message, the landing page's "What it costs", or the two
  source comments. No functional impact — all eight commands install and run correctly.

## Suggested next step

A small, doc/prose-only fix (no behaviour change):

- `bin/install.js:1199-1205` — add `/slashforge-test` and `/slashforge-refactor` bullets to the
  closing message, matching the one-line descriptions used elsewhere.
- `bin/install.js:544-546` — change "The four commands" to "These commands" (or "The eight commands")
  so it does not need re-editing on the next addition.
- `docs/src/pages/index.astro:115-146` — add tiles for test and refactor (decide whether fix/resume
  also warrant tiles, or keep the array as representative cost tiers rather than one-per-command).
  This touches the docs workspace — rebuild and run the `check-docs-*` scripts.
- `test/install.test.js:2594-2596` — update the stale "four" in the comment and test name (same
  count-agnostic wording).
- **Prevention:** consider a test that asserts the closing message names every `commandName(c)` for
  `c` in `COMMAND_FILES`, so a future addition fails loudly instead of silently drifting.
  Count-agnostic wording ("these commands") removes the other recurring trap.
