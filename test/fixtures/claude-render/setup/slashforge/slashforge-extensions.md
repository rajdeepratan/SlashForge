---
name: SlashForge — Extension Packs
description: How a team packages reusable guides, host hooks, and config into a local extension pack and installs it with `slashforge --ext <dir>`. Covers the slashforge-ext.json manifest, the generic hook contract, where files land, and how to author a pack (including the observability/OpenTelemetry example).
---

# Extension Packs

An **extension pack** is a local directory a team authors once and installs into any
SlashForge host. It bundles reusable **guides**, **host hooks**, and a **config template**, so a
company can ship its own conventions and tooling — telemetry, a Slack ping, a linter, an audit
log, a custom plugin — without forking the kit.

Packs are **local**: you point the installer at a directory you control (your repo, a shared
folder, a cloned pack). There is no remote catalog and no network fetch.

## Installing a pack

```bash
npx slashforge --ext ./path/to/pack          # one pack
npx slashforge --ext ./pack-a --ext ./pack-b # several
npx slashforge --dry-run --ext ./pack        # preview the writes
```

Each pack is validated (manifest, guide frontmatter, balanced target blocks, the 200-line cap,
and that every hook script and config file exists) **before anything is written** — a malformed
pack aborts the whole install, so you never get a half-installed pack.

Installed packs are recorded in `meta.json`, so `status` reports them and `uninstall` removes
them cleanly. A pack's files live under `…/setup/slashforge/extensions/<id>/`, a subtree the
kit's own upgrade sweep never touches.

## The manifest — `slashforge-ext.json`

JSON (not YAML — the installer stays dependency-free), at the pack root:

```json
{
  "schema": 1,
  "id": "observability",
  "name": "Observability",
  "version": "0.1.0",
  "description": "Emit SlashForge usage telemetry to a webhook, an OTLP collector, or a file.",
  "provides": {
    "guides": ["guides/slashforge-observability.md"],
    "config": "config/observability.config.json",
    "hooks": [
      { "event": "Stop",       "script": "hooks/emit-telemetry.js", "description": "Emit a turn-complete event" },
      { "event": "SessionEnd", "script": "hooks/emit-telemetry.js", "description": "Emit a session-complete event" }
    ]
  }
}
```

| Field | Required | Meaning |
|---|---|---|
| `schema` | yes | Must be `1`. |
| `id` | yes | `^[a-z0-9-]+$`. Names the install folder, so it must be unique. |
| `name`, `version`, `description` | yes | Human-facing metadata. |
| `provides.guides` | one of three | Guide files, rendered like built-in guides. |
| `provides.hooks` | one of three | Host hooks (see below). |
| `provides.config` | one of three | A config-template file, copied verbatim. |

`provides` needs at least one of `guides` / `hooks` / `config`.

## The hook contract (generic)

A hook entry maps a **host lifecycle event** to a **script** in the pack. The installer validates
the shape and copies the script — it never assumes what the script does. Anything a host hook can
do, a pack can ship.

```json
{ "event": "PostToolUse", "script": "hooks/lint.js", "matcher": "Edit|Write", "description": "Lint after an edit" }
```

| Field | Required | Meaning |
|---|---|---|
| `event` | yes | One of the host events below. |
| `script` | yes | Path inside the pack, copied verbatim. |
| `matcher` | no | String passed through to the host (e.g. a tool-name regex). |
| `description` | no | Shown next to the hook in the printed summary. |

**Events:** `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`,
`Stop`, `SubagentStop`, `Notification`, `PreCompact`, `PostCompact`, `PermissionRequest`.

The installer does **not** edit your host hook config. After install it prints each hook as
`<event> → node <script path>` (with its matcher and description) as a readable summary, not
host-config JSON. You add it to your host's hook file yourself in the format `slashforge-hooks.md`
describes for your host, and choose the scope.

Example purposes, all just "a script on an event":

- **Telemetry** — `Stop` / `SessionEnd` → post a usage event (the shipped `observability` pack).
- **Slack ping** — `Stop` → post a message to a webhook.
- **Lint on edit** — `PostToolUse` with `matcher: "Edit|Write"` → run the formatter.
- **Audit log** — `UserPromptSubmit` → append the prompt to a file.

## Pack layout

```
my-pack/
  slashforge-ext.json          # the manifest (required)
  guides/slashforge-*.md       # guides: valid frontmatter, 200 lines or fewer, balanced target blocks
  hooks/*.js                   # hook scripts, copied verbatim
  config/*.json                # a config template, copied verbatim
  README.md                    # how to install and configure (recommended)
```

Guides follow the same rules as built-in guides: a `---` frontmatter block with `name` and
`description`, balanced per-host target blocks (the same `target:` comment markers the built-in
guides use), and 200 lines or fewer. Keep secrets out of a config template — read tokens from
environment variables at runtime instead.

## Authoring a pack

1. Make the directory and write `slashforge-ext.json`.
2. Add a guide under `guides/` (what the pack is for, how to configure it).
3. Add any hook scripts under `hooks/` and declare them in `provides.hooks`. Make hook scripts
   **fail-open** — a hook that errors must not block the agent.
4. Add a `config/` template if the team needs to set values (endpoints, flags). No secrets.
5. Test it: `npx slashforge --dry-run --ext ./my-pack`, then install into a throwaway location.
6. Share the directory (commit it to a repo, drop it in a shared folder). Teammates install with
   `npx slashforge --ext <dir>`.

## The observability example

The kit ships a reference pack at `extensions/observability/`. It emits a usage event on
`SessionEnd` and `Stop` (turn and session counts, durations, which command ran) to one of three
sinks — a **webhook** (default), an **OTLP** collector (`/v1/logs`), or a **local JSONL** file —
selected in its config template. Auth comes from environment variables, never the config file, and
the emitter is fail-open. Install it with `npx slashforge --ext extensions/observability`, or copy
it as the starting point for your own pack.

## Security

Extension packs run code (hook scripts) on your machine with the agent's permissions. **Review a
pack's scripts before installing it**, exactly as you would any third-party code. The installer
copies scripts verbatim and never runs them at install time, but a hook you wire into your host
config runs on every matching event.
