---
title: Extension packs
description: Package reusable guides, host hooks, and config into a local extension pack and install it with slashforge --ext. A generic hook mechanism lets a team wire any host event to any script, with an OpenTelemetry example included.
---

An **extension pack** lets a team ship its own guides, host hooks, and config as one shareable
unit. You point the installer at a local directory you control, and it installs the pack
alongside the built-ins. There is no remote catalog and no network fetch: packs are local, so you
decide exactly what gets installed.

The hook mechanism is **generic**. A pack can wire any host lifecycle event to any script, for any
purpose: telemetry, a Slack ping, a linter, an audit log, a custom tool. OpenTelemetry is just the
example pack that ships with SlashForge.

## Installing a pack

```bash
npx slashforge --ext ./path/to/pack          # one pack
npx slashforge --ext ./pack-a --ext ./pack-b # several
npx slashforge --dry-run --ext ./pack        # preview the writes
```

Every pack is validated before anything is written (manifest, guide frontmatter, line limits, and
that each hook script and config file exists), so a malformed pack aborts the whole install rather
than leaving half of it on disk. Installed packs are recorded in `meta.json`, so `status` lists
them and `uninstall` removes them cleanly. A pack's files live in their own
`extensions/<id>/` subtree, which upgrades never touch.

## The manifest

A pack is a directory with a `slashforge-ext.json` manifest. It is JSON, not YAML, because the
installer has no dependencies.

```json
{
  "schema": 1,
  "id": "observability",
  "name": "Observability",
  "version": "0.1.0",
  "description": "Emit SlashForge usage telemetry.",
  "provides": {
    "guides": ["guides/slashforge-observability.md"],
    "config": "config/observability.config.json",
    "hooks": [
      { "event": "Stop", "script": "hooks/emit-telemetry.js", "description": "Emit a turn-complete event" }
    ]
  }
}
```

`provides` needs at least one of `guides`, `hooks`, or `config`. Guides follow the same rules as
built-in guides (valid frontmatter, balanced per-host blocks, 200 lines or fewer). Config and hook
scripts are copied verbatim.

## The hook mechanism

Each hook maps a host lifecycle event to a script in the pack:

```json
{ "event": "PostToolUse", "script": "hooks/lint.js", "matcher": "Edit|Write" }
```

The events are `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
`Stop`, `SubagentStop`, `Notification`, `PreCompact`, `PostCompact`, and `PermissionRequest`. The
installer validates the shape and copies the script: it never assumes what the script does. The
same mechanism covers very different jobs:

- Telemetry: `Stop` or `SessionEnd` posts a usage event.
- Slack ping: `Stop` posts a message to a webhook.
- Lint on edit: `PostToolUse` with a matcher runs the formatter.
- Audit log: `UserPromptSubmit` appends the prompt to a file.

## Global install, per-repo hooks

SlashForge is usually installed once for a person and used across many repos, but **hooks are
enabled per repo**: the host's hook config is where "this repo emits telemetry" belongs, and that
is committed with the repo so the team shares it. So the common pattern is to install a pack once,
then enable its hooks only in the repos that want them.

The installer does not edit your hook config. After a pack installs, it prints the exact
`event -> node <script>` lines to paste in. And because enabling hooks is a per-repo step,
`/slashforge-setup` detects installed packs and offers to wire their hooks into the current repo
for you, recorded under an **Automated Behaviors** section.

The installed `slashforge-hooks.md` guide has the per-host hook-config format and scope choices;
the [CLI reference](/slashforge/reference/cli) documents `--ext`.

## The observability example

SlashForge ships a reference pack that emits a usage event on `SessionEnd` and `Stop` (one event
per session and per turn, carrying the event name, session id, and working directory) to one of
three sinks, selected in its config:

- **webhook** (default): POST JSON to any HTTP endpoint.
- **otlp**: POST an OpenTelemetry log record to a collector.
- **jsonl**: append a line to a local file.

Auth comes from environment variables, never the config file, and the emitter is fail-open: a
telemetry outage emits nothing and never blocks the agent. Install it with:

```bash
npx slashforge --ext extensions/observability
```

Copy that pack as the starting point for your own.

## Security

Extension packs run code on your machine with the agent's permissions, so treat a pack as
third-party code:

- **Review the scripts before installing.** The installer copies hook scripts verbatim and never
  runs them at install time, but a hook you wire into your host config runs on every matching
  event, with the same access you have.
- **The installer stays inside the pack.** A manifest may only reference files inside the pack
  with relative paths; an absolute path or one containing `..` is refused, so a pack cannot write
  outside its own `extensions/<id>/` subtree.
- **Keep secrets in the environment, never in the pack.** Tokens and credentials belong in
  environment variables read at runtime, not in the manifest or a config file (the observability
  pack reads its auth from `SLASHFORGE_TELEMETRY_TOKEN` / `OTEL_EXPORTER_OTLP_HEADERS`). A config
  committed with the repo is visible to everyone who can read it.
- **Project hooks are committed, so review them like any change.** Enabling a pack's hooks writes
  into the repo's committed hook config, which means the team sees them in a pull request. Write
  hooks to be **fail-open** so a crash or outage never blocks the agent.
