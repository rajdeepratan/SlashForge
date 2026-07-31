# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.0] - 2026-07-31

### Changed
- **BREAKING:** the package is now published as `slashforge` (previously `claude-setup-kit`). Install with `npx slashforge`. Renamed ahead of planned Cursor and Codex support, so the name is not tied to a single vendor.
- Repository moved to `github.com/rajdeepratan/slashforge`; the old URL permanently redirects.
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
