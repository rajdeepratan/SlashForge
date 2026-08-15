# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [4.4.2] - 2026-08-14

### Changed
- **`/slashforge:investigate` is a dispatcher plus a workflow file too, matching `/slashforge:code` and `/slashforge:review-pr`.** The command file carried the findings-report spec, the splice command, the open helper and the hand-off wording inline at 143 lines, while `forge-workflow-investigation.md` restated the same three phases in summary — so I3 existed twice, in two levels of detail, and the two could drift. The detail now lives once, in Phase I3 of the workflow file, leaving a 51-line dispatcher.
- **The investigation flow no longer defers back to the command file.** `forge-workflow-investigation.md` pointed at `investigate.md` for the fragment spec, the splice command and the browser-open snippet — a workaround for guides not being rendered, which meant a guide could not name a sibling by absolute path. 4.4.1 fixed that, so the guide names `forge-report-shell.html` and `forge-open.sh` directly.

## [4.4.1] - 2026-08-14

### Changed
- **`/slashforge:review-pr` is a dispatcher plus a workflow file now, the same shape as `/slashforge:code`.** The command file carried all seven steps inline at 301 lines — the largest template in the kit — while `code.md` stayed at 70 by delegating to `forge-workflow.md`. The phase detail moved to `forge-workflow-review-pr.md`, and the steps are named `Phase R1`–`R7` to match the `I1`–`I3` naming the investigation flow already used. Nothing about what the command does or the order it does it in has changed.

### Fixed
- **Guide files are rendered rather than copied.** Guides were installed with `copyFileSync`, so a `{{INSTALL_PATH}}` in one would ship as the literal placeholder and the agent would splice against a path that does not exist. No guide used a placeholder until now, and `forge-workflow-review-pr.md` names `forge-report-shell.html` by absolute path. Rendering is a no-op for every other guide; assets are still installed verbatim, since `forge-open.sh` is executed as-is.

## [4.4.0] - 2026-08-08

### Added
- **`install` and `status` say when the copy you ran is out of date.** The installer reported its own version, so a stale copy looked exactly like a current one — and `npx` prefers an executable already on `PATH`, meaning a single `npm install -g slashforge` makes `npx slashforge` install that old release forever without ever contacting the registry. Both commands now ask npm for the current release when they finish and print the fix if the running copy is behind. 1.5 second timeout, every failure silent, honours the configured registry, skipped under `CI`, and `SLASHFORGE_NO_UPDATE_CHECK=1` turns it off.

## [4.3.1] - 2026-08-02

Documentation only. No change to any command, skill, or installed file.

### Changed
- **The README leads with what it costs.** "Is SlashForge right for you?" now sits before the install instructions rather than leaving the token figures scattered through command bullets, where someone deciding whether to install would not find them. It states plainly that the cost is the point rather than an inefficiency, and says when to skip the tool entirely.
- **The ten phases are a table, with the four gates marked.** The README said "ten phases" and then listed them starting from Plan — Intake was missing and Push & PR was split in two. Each phase now says what actually happens.
- **A Customization section.** Nothing documented where Phase 6's verification commands come from, which is the first thing anyone changes. It covers `CLAUDE.md` commands, path-scoped rules using the real `paths` frontmatter field, and the `generated_by` marker that lets edits survive a re-run.
- Added *"Guardrails, not autocomplete."* under the tagline.

### Fixed
- The README claimed **five** slash commands. There are four — `-quick` is a mode of `/slashforge:code`, not a command of its own.
- The docs site's meta description listed only three commands, omitting `/slashforge:review-pr`.
- Tidied the package description, which had a stray space before its full stop and a missing comma between two commands.


## [4.3.0] - 2026-08-02

**SlashForge no longer references the superpowers plugin at all.** Nothing invokes it, checks for it, or behaves differently when it is present. The three capabilities that were still optional in 4.2.0 now ship as SlashForge skills.

### Added
- **`slashforge:worktree`** (Phase 4) — creates an isolated second checkout when a dev server must stay up on the current branch, or a refactor is risky enough that abandoning it should be `rm -rf`. Carries the two things people forget: a fresh worktree has no installed dependencies, and the test suite should be run *before* the first edit so a later failure is known to be yours.
- **`slashforge:parallel`** (Phase 5) — dispatches one agent per task with review between each. Deliberately not a port of superpowers' 28 KB version, which is a resumable ledger and workspace framework; SlashForge needs "independent tasks, fresh agent each, check the diff not the summary". Leads with the independence test, because most plans are not parallel and the honest default is sequential.
- **`slashforge:request-review`** (Phase 7) — gets *your own* work reviewed before it ships, with crafted context rather than your session history. Withholding your reasoning is the point: a reviewer given the justification reviews the justification.

  Three review-shaped names now exist and are deliberately distinct: `slashforge:request-review` for your own work, `slashforge:review-feedback` for comments you received, and the `/slashforge:review-pr` command for someone else's PR.

### Removed
- **The preflight.** With every discipline shipped, the Superpowers Check had nothing left to detect, so `forge-preflight.md` is gone and no command declares `preflight:` any more. That is one fewer guide file read on every single run.
- Installer support for clearing dropped guide files (`REMOVED_GUIDE_FILES`). Install overwrites what it ships but never cleared the guides directory, so without this an upgrade would leave `forge-preflight.md` sitting there being read by nothing.


## [4.2.0] - 2026-08-02

**The superpowers plugin is now optional.** SlashForge ships its own discipline skills under the `slashforge:` namespace it already owns — no plugin, no marketplace, no change to `npx slashforge`. Nothing stops, prompts, or warns about degraded mode any more.

### Added

- **`/slashforge:review-pr`** — reviews a pull request against *this* repo's standards (`CLAUDE.md`, `.claude/rules/`, and the conventions in the surrounding code) and posts line-level comments or an approval.

  With no argument it searches `review-requested:@me` — that is what "waiting on me" means on GitHub, whereas `assignee` is a different relationship and usually empty — and widens to assignee only if that comes back empty. `--assigned`, `--mine` and `--all` override the default for teams that route reviews by assignment, for self-review, or for the full picture. Under `--mine`, approve is withdrawn when the list is shown rather than at the gate, since GitHub refuses self-approval and that should not be a surprise after the work is done. A PR number skips discovery entirely.

  Drafts are skipped, one PR is reviewed without a menu, and no PRs means it says so — naming which query was empty so you know which flag to try.

  Before reading the diff it checks CI status, existing review comments so it does not repeat a point already made, and whether the PR is yours — GitHub refuses to let anyone approve their own pull request, so that option is withdrawn when it applies. Past roughly 1,500 changed lines it says a single pass cannot be thorough and states what it covered.

  **Nothing is posted without your explicit yes.** You see the verdict in chat, the full review in your browser, and then the exact text that will appear on GitHub, verbatim. `request-changes` blocks a merge and `comment` does not, so the command never picks between them for you — it recommends and asks. Findings and summary go up as a single review, so the PR gets one notification rather than a stream.

  A line comment can only anchor inside the diff; one outside makes GitHub reject the whole review with a 422. The command moves those findings into the summary body, says which moved, and retries.

  Findings are prose, so they contain quotes, backticks, newlines and backslashes as a matter of course. The documented payload assembly keeps prose in plain-text files and only puts anchors — paths, line numbers, sides — in JSON, letting `JSON.stringify` escape everything by construction. A test runs that assembly script out of the template itself against deliberately hostile text and asserts it round-trips byte for byte.

  The review is saved to `docs/slashforge/reviews/<date>-pr-<N>.html` and stays as a local record whether or not anything is posted.

- **SlashForge ships its own discipline skills** — `slashforge:brainstorm` (Phase 1), `slashforge:plan` (Phase 2), `slashforge:debug` and `slashforge:tdd` (Phase 5), `slashforge:verify` (Phase 6), and `slashforge:review-feedback` (Phase 9). Adapted from superpowers under MIT, © 2025 Jesse Vincent; the notice travels in each skill file, since skills install to `~/.claude/` detached from this repo.

  No plugin and no marketplace were needed: the `slashforge:` namespace comes from the `slashforge/` subdirectory under the commands dir, which SlashForge already owns. `slashforge:brainstorm` drops the visual companion entirely — roughly 62 KB of browser-server machinery the workflow never used.

- Installer support for skills (`SKILL_FILES`) and for a shell helper (`forge-open.sh`). Skills install into the namespace directory and are frontmatter-validated like commands — unlike assets, which have no frontmatter and are only checked for existence. Skills are deliberately kept out of `meta.json`'s `commands` and the `status` output, which continue to report the entry points a user actually types rather than every internal discipline.

### Changed

- **Every generated document now lives under `docs/slashforge/` and is HTML.** Investigation reports moved from `investigations/`, and the design spec and implementation plan from `.claude/specs/` and `.claude/plans/` — all now sit in `docs/slashforge/{investigations,specs,plans,reviews}/`. Nothing is moved for you; existing files stay where they are.

  Specs and plans changed from Markdown to HTML, built from the same shell as the reports, so every artefact renders identically and opens in a browser without a code editor. Plan steps use `☐`/`☑` list items rather than `- [ ]`; edit the character in place as steps complete. Deliberately not `<input type="checkbox">` — the shell carries no JavaScript, so that state would not survive a reload.

- **Specs, plans and reviews open in your browser when written**, the way investigation reports already did. All of them call a shipped helper, `forge-open.sh`, rather than each carrying its own copy of the platform detection — the same reasoning as the shared shell, and the same drift it prevents. Still best-effort: silent over SSH and on headless Linux, and it exits 0 in every case so it can never fail the run that produced the document.

- `forge-report-shell.html` is now the **document shell** rather than the report shell. Its `<title>` no longer hardcodes an `Investigation — ` prefix; the caller supplies the whole title, so a design spec is titled as one. A test asserts the shell stays document-agnostic.

- **The preflight no longer gates.** It was a blocking check that stopped every run, explained what you lose without superpowers, and offered to install it. It is now silent capability detection: it records what is available and adjusts which optional phases apply. No prompt, no warning, no "degraded mode" — because with the disciplines shipped, nothing is degraded. `install` no longer mentions the plugin at all; `status` reports it as a line item.

- **Two superpowers skills were deliberately not replaced, and their references removed instead.** `finishing-a-development-branch` presents a merge-or-PR-or-keep menu that contradicts Phase 8's opinionated flow, and `requesting-code-review` is mostly subagent dispatch where Phase 7 already carries a more specific checklist. Porting them would have made the workflow worse, not more independent.

- What superpowers still adds, when installed: `using-git-worktrees` (Phase 4 isolation), `subagent-driven-development` (Phase 5, genuinely parallel units), and `requesting-code-review` (Phase 7 reviewer dispatch). All three optional; all skipped cleanly when absent.

### Fixed

- **`/slashforge:code` no longer creates a `docs/superpowers/` directory in your repo.** superpowers' `brainstorming` and `writing-plans` skills default to writing their spec and plan under `docs/superpowers/` — a path SlashForge does not own and never asked for. SlashForge's own skills now write to `docs/slashforge/specs/` and `docs/slashforge/plans/` instead, and `docs/superpowers/` is gitignored as a backstop for a stale install. Existing directories are left alone.

## [4.1.2] - 2026-08-02

### Fixed
- **The investigation report's title is now HTML-escaped.** The splice step substituted the title marker raw, so a symptom containing `</title>` closed the element early and the remainder leaked into the document as markup — the title truncated at the injection point. Entity-shaped text was also silently decoded: a symptom reading `literal &amp; in symptom` rendered as `literal & in symptom`, and `&#65;` rendered as `A`.

  The title is plain text taken from a user-supplied symptom, so `&`, `<` and `>` are now escaped, `&` first. The body fragment is genuine HTML and is still spliced verbatim — the two markers are deliberately not treated alike, and the shell documents which is which.

  Introduced in v4.1.0 with the report shell. Cosmetic in practice, since it needed an angle-bracket sequence in the symptom to show up.

### Added
- Two tests covering the splice. They extract the command from `investigate.md` and execute it, rather than re-implementing it — a copy could drift from the template and still pass. One asserts the title round-trips through escaping and cannot break out of its element; the other asserts the body fragment is spliced verbatim, including `$&`-style sequences that function-form replacement protects.

## [4.1.1] - 2026-08-02

### Fixed
- **Malformed HTML closing tags in the `SUMMARY.html` template.** `templates/forge-graph-summary.md` carried 10 occurrences of `</slashforge:code>` where `</code>` belongs. An end tag with no matching open element is discarded by the HTML5 parser, so the `<code>` element never closed and swallowed everything after it — one ran for 67 lines. Anyone who ran `/slashforge:setup` and accepted the Graphify offer got a `graphify-out/SUMMARY.html` with large runs rendered as monospace code. Present in every release from v3.0.0 onward.

  Root cause: the v3.0.0 rename of `/code` to `/forge:code` was applied as a bare string substitution, and `</code>` contains the substring `/code`. Opening tags have no slash and were untouched, which is why only the closing half of each pair broke. v4.0.0 then rewrote them again into `</slashforge:code>`.
- The same corruption in `templates/slashforge/investigate.md` (2 occurrences) was fixed in v4.1.0 as incidental cleanup during the report-shell rewrite, but went unrecorded at the time. Noted here for the record.

### Added
- A regression test asserting that no template contains a namespaced HTML end tag (`</word:word>`). This damage landed twice across two renames without detection, because the existing template test only validated frontmatter. The check is prefix-agnostic, so it does not need updating at the next rename, and uses only Node builtins so it runs under the root CI's install-free `npm test`.

## [4.1.0] - 2026-08-02

### Changed
- **Investigation reports now land in `investigations/` at the repo root**, not `.claude/investigations/`. A dot-directory is hidden in Finder and most file explorers, so the reports were effectively unreachable without a code editor — which defeated the point of writing them as HTML. Existing reports under `.claude/investigations/` are left alone; nothing is moved or deleted.
- **`/slashforge:investigate` opens the finished report in your browser** instead of reprinting it into the chat. Uses `open` / `xdg-open` / `wslview` / `start` per platform, and skips silently over SSH or on a headless Linux box with no `$DISPLAY`. It is best-effort throughout — failing to open a browser never fails the investigation.
- **Chat gets a summary, not the document.** The old instruction allowed reprinting the entire report — including the CSS — into the terminal, where it rendered as a wall of raw HTML. Chat now receives the conclusion, the root cause, the path, and the hand-off line.
- The `/slashforge:investigate` hand-off names the report it just wrote, so the fix command can be pasted as-is rather than retyped from memory:

  ```
  Investigation complete → investigations/investigation-2026-08-02-1432.html
  Want me to fix this? Run /slashforge:code investigation-2026-08-02-1432.html
  ```

### Added
- **`/slashforge:code` accepts a requirements document** as its argument. If the argument resolves to a file it is read as the requirements source and the "what do you want to build?" question is skipped — the document already answered it. A bare filename resolves against `investigations/`; a full path works as given, so any spec or design doc is equally valid. A leading `@` or `#` is stripped, so a pasted mention still works.

  This is what makes an investigation survive into a fresh session: the root cause is carried by the file rather than by your memory of it. Every gate still applies — a report's "suggested next step" is a proposal, and Phase 3 still waits for your approval.
- **`forge-report-shell.html`**, installed alongside the guide files, holds the report's doctype, `<head>`, and entire `<style>` block. Each investigation now writes only its body fragment and splices it into the shell, so the CSS is never regenerated per run. Reports come out visually identical, restyling every future report is one edit to the shell, and roughly 800 tokens of boilerplate leave each run's output.

  Finished reports remain fully self-contained — the CSS is inlined into every file, so they open from disk, offline, with no dependency on the shell still existing.
- Installer support for non-markdown assets (`ASSET_FILES`), copied verbatim and exempt from frontmatter validation. A missing asset still refuses the install rather than producing a half-installed kit.

## [4.0.1] - 2026-08-01

### Added
- `homepage` field pointing at the documentation site. Without it npm falls back to `<repository>#readme`, so the package page linked to the GitHub README rather than the docs.

## [4.0.0] - 2026-08-01

### Changed
- **BREAKING:** the command namespace moved from `/forge:` to `/slashforge:`.

  | v3 | v4 |
  | --- | --- |
  | `/forge:setup` | `/slashforge:setup` |
  | `/forge:code` | `/slashforge:code` |
  | `/forge:code -quick` | `/slashforge:code -quick` |
  | `/forge:investigate` | `/slashforge:investigate` |

  `forge` is a common word and was liable to collide with other tools' commands — the exact problem namespacing was introduced to solve in v3.0.0. `slashforge` matches the package name.
- Command files now install into `~/.claude/commands/slashforge/` instead of `~/.claude/commands/forge/`.

### Added
- `uninstall` and `status` recognise the v3 `forge/` namespace alongside the v2 layout, so an upgrade can still be cleaned up rather than orphaned.
- Migration guide for v3 → v4 in the docs.

### Unchanged
- The three commands, the ten phases, every user gate, and the `-quick` mode all behave exactly as in v3.0.0. Guide filenames and the guides directory are untouched.

## [3.0.0] - 2026-07-31

### Changed
- **BREAKING:** commands are renamed and namespaced under `/forge:`.

  | v2 | v3 |
  | --- | --- |
  | `/setup-claude` | `/forge:setup` |
  | `/code` | `/forge:code` |
  | `/quick` | `/forge:code -quick` |
  | `/investigate` | `/forge:investigate` |

  `/setup-claude` was tied to a single vendor, which does not survive the planned Cursor and Codex support. The `forge/` namespace also stops `/code` colliding with commands users already have.
- **BREAKING:** `/quick` is no longer a separate command. It is now lean **mode** on `/forge:code`, selected with `-quick`. The two were never separate workflows — `/quick` was always a set of overrides on the same ten phases — so they are now one command and one override guide.
- **BREAKING:** guide files renamed `claude-setup-*.md` → `forge-*.md`, and the install directory moved from `~/.claude/setup/claude-setup/` to `~/.claude/setup/slashforge/`.
- Command files now install into `~/.claude/commands/forge/`, which is what produces the `/forge:` prefix.

### Added
- `forge-workflow-quick.md` — the lean-mode overrides, extracted from the old `quick.md`. Loaded only when `-quick` is passed, so full mode is unaffected by it.
- Install now reports any v2 files left on disk after an upgrade, rather than silently orphaning them. It does not delete them.
- `uninstall` and `status` recognise the v2 layout, so an upgraded install can still be cleaned up.

### Removed
- **BREAKING:** the `claude-setup-kit` binary alias, deprecated in v2.0.0.
- **BREAKING:** the `CLAUDE_SETUP_KIT_YES` env var, deprecated in v2.0.0. Use `SLASHFORGE_YES`.

## [2.0.0] - 2026-07-31

### Changed
- **BREAKING:** the package is now published as `slashforge` (previously `claude-setup-kit`). Install with `npx slashforge`. Renamed ahead of planned Cursor and Codex support, so the name is not tied to a single vendor.
- Repository moved to `github.com/rajdeepratan/SlashForge`; the old URL permanently redirects.
- Non-interactive mode is now enabled by `SLASHFORGE_YES=1`.
- Expanded npm keywords and GitHub topics for discoverability.

### Deprecated
- The `claude-setup-kit` npm package. Use `slashforge` instead.
- The `claude-setup-kit` bin alias and `CLAUDE_SETUP_KIT_YES=1` env var. Both still work so existing scripts and CI do not break, and are scheduled for removal in v3.0.0.

### Fixed
- Auto-release now publishes to npm. A release created by `GITHUB_TOKEN` does not trigger other workflows, so `publish.yml` never fired; `auto-release.yml` now dispatches it explicitly via `workflow_dispatch`.

## [1.5.0] - 2026-07-02

### Added
- Test suite (`node:test`) and a CI workflow running on push/PR across Node 18/20/22.
- Auto-release workflow: a version bump merged to `main` creates the matching tag + GitHub Release, which triggers publishing.
- npm provenance on publish, with a test gate before `npm publish`.
- `uninstall` subcommand to remove the kit's guides and commands.
- `--project` install mode: vendors guides + commands into a repo's `./.claude/` (repo-relative paths) so a cloned repo gets working commands with no global install.
- `.gitignore` and this changelog.

## [1.4.0] - 2026-06-28

### Changed
- `/setup-claude` restructured into five phases so all user decisions are batched up front; only Graphify's `CLAUDE.md` append runs last, preserving the "kit's CLAUDE.md first" ordering.

## [1.3.0] - 2026-05-16

### Added
- Self-contained `SUMMARY.html` synthesis and investigation findings as HTML.

## [1.2.1] - 2026-05-05

### Fixed
- Graphify offer no longer short-circuits when the CLI is already on `PATH`.

## [1.2.0] - 2026-05-01

### Added
- Preflight checks, `/quick` command, Graphify integration, graph-freshness check, and `.claude/` coverage detection.
