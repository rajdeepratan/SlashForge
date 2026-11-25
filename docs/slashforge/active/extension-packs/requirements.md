# Extension Packs — Requirements

## Goal
Let a team or company package reusable SlashForge content — commands, guides, agents, host
hooks, and config — into a shareable "extension pack" that the installer renders and installs
alongside the built-ins. The hook mechanism is **generic**: a pack can wire any host lifecycle
event to any script for any purpose (telemetry, Slack, a linter, an audit log, a custom plugin),
configured however the team wants. OpenTelemetry/observability ships as the first *example* pack,
not as the only thing the mechanism supports.

## Problem
Today SlashForge installs one fixed set of `templates/`. A team that wants its own command, its
own guide, or team-wide monitoring (e.g. emit a telemetry event when an agent finishes a turn)
has nowhere to put it inside the kit: they must fork the repo or hand-edit installed files, which
an upgrade then overwrites. The kit already *documents* host hooks (`slashforge-hooks.md`) but
offers no way to **package and distribute** a hook (or a command, or a guide) as a named,
installable, trackable unit. GitHub Spec Kit has this (extensions + hooks); SlashForge does not.

## Behaviour
Once this ships:

- A team authors an extension as a directory containing a `slashforge-ext.json` manifest plus
  template files (commands/guides/agents) and optional host-hook assets and a config template.
- The manifest's `hooks` declaration is **generic and open-ended**: each entry names a host
  lifecycle event (`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `SessionEnd`, …), the
  script to run, and an optional matcher — with no assumption about what the script does. A pack's
  config template is arbitrary JSON the team defines for its own script. Teams install the shipped
  example pack, copy it, or author their own from scratch, and configure it however they want.
- They install it with `slashforge --ext <dir>` (repeatable for several packs) for any host
  (`claude` / `cursor` / `codex` / `skills`). The installer **validates** the manifest and every
  templated file with the same frontmatter / target-block / line-limit checks used for built-ins,
  then renders and installs the pack's files next to the built-ins for that host.
- Install stays **atomic**: a malformed pack aborts the whole install before any file is written,
  exactly as a malformed built-in template does today.
- Installed packs are recorded in the host's `meta.json`, so `status` lists them and
  `upgrade` / `uninstall` clean them up without touching the user's own unrelated files.
- A first-party **`observability`** extension ships in the repo as the flagship example: an
  observability guide plus a host hook that emits a usage event each time the agent finishes.
  Teams install it with `slashforge --ext extensions/observability` and point it at their own
  sink, or copy it as a template for their own pack. Specifically:
  - **Default transport = generic webhook** (POST JSON to one configurable URL — zero setup beyond
    the URL). **OTLP/HTTP** (post an OTLP log record to an OpenTelemetry collector) and **local
    JSONL** (append to a file) are documented alternates selected in the same config template.
  - **Events emitted by default = `SessionEnd` + `Stop`** (low-volume, high-signal: session and
    turn counts, durations, which command/agent ran). **`PostToolUse` is opt-in** (chatty) via a
    config flag.
  - The hook is **fail-open**: a telemetry outage never blocks or slows the agent. Auth (tokens,
    OTLP headers) comes from **env vars only**, never committed.
  - Scope: this emits *usage events* as webhook JSON / OTLP **logs**, not full distributed traces
    (no agent host exposes trace-context propagation today).
- An authoring guide (shipped in `templates/`) explains the manifest format, the pack layout, and
  how packs reuse the existing host-hook model in `slashforge-hooks.md`.

## Constraints & out of scope

**Constraints (non-negotiables this must honor):**
- **Zero runtime dependencies.** The manifest is **JSON** (parsed with Node's built-in
  `JSON.parse`), not YAML. No new `dependencies`.
- **Line limits** (≤ 200 / ≤ 500) and **balanced target blocks** apply to an extension's templated
  files exactly as to built-ins, enforced by the same validators.
- **Pinned Claude render** must be regenerated (never hand-edited) if default Claude output changes;
  extension installs are additive and must not alter the built-in render when no `--ext` is passed.
- **`main` auto-publishes** — no version bump on the feature branch; released later via `/cut-release`.
- Extensions reuse **host-native hooks** (Claude/Cursor/Codex), not a new SlashForge event system.
- A pack's hook scripts are the team's own code; the installer copies them verbatim and never
  executes them at install time. The authoring guide carries the "review third-party packs before
  installing" warning.

**Out of scope (explicitly deferred, not this feature):**
- **Extension-provided commands and agents.** v1 packs contribute guides, host hooks, and config.
  Shipping commands pulls in sigil rewriting, flat-command naming, and per-namespace uninstall
  tracking not needed for the monitoring goal; it is a fast follow.
- **Auto-editing host hook config.** The installer prints the ready-to-paste hook snippet and the
  installed script path; it never mutates `settings.json` / `hooks.json` itself.
- Remote catalogs, `ext add --from <url>`, ZIP fetch, a registry, enable/disable/update commands —
  the full Spec Kit catalog system. This is local-directory packs only.
- Sandboxing or permission-gating extension code.
- SlashForge emitting its own telemetry (it is a one-shot installer; telemetry comes from the
  installed host hook, not from `bin/install.js`).
- Publishing extensions to npm or a SlashForge-run marketplace.

## Success criteria
- [ ] `bin/install.js` accepts one or more `--ext <dir>` options and installs each validated pack
      for the selected host.
- [ ] A `slashforge-ext.json` manifest is defined, documented, and validated; a malformed manifest
      or over-limit / unbalanced pack file aborts the install before any write (atomicity test).
- [ ] A pack can contribute at least a guide and a host hook, each landing in the right place for
      `claude`, `cursor`, and `codex`. (Extension-provided commands/agents are a deferred follow-up,
      see out of scope.)
- [ ] Installed packs appear in `meta.json` and in `status`; `uninstall` / `upgrade` remove a pack's
      files and leave the user's unrelated files untouched.
- [ ] A first-party `observability` pack exists in the repo, installs cleanly via `--ext`, and its
      hook emits a usage event on `SessionEnd` + `Stop` by default (webhook transport), with OTLP
      and JSONL transports and a `PostToolUse` opt-in selectable in its config template; the hook is
      fail-open and reads auth from env vars only.
- [ ] An authoring guide ships in `templates/` and is reachable from the docs site + README.
- [ ] `npm test` is green (new tests for manifest parsing, validation, atomicity, and `--ext`
      install/uninstall) and the pinned Claude render is regenerated and reviewed.
- [ ] CHANGELOG `## [Unreleased]`, README, and the docs site are updated for the new capability.
