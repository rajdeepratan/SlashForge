# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
