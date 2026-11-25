---
name: Observability — SlashForge usage telemetry
description: A SlashForge extension pack that emits a usage event when the agent finishes a turn or session, to a webhook, an OTLP collector, or a local JSONL file. Fail-open, zero-dependency, auth from environment variables only.
---

# Observability

This pack emits a small **usage event** each time the agent finishes a turn (`Stop`) or a
session (`SessionEnd`), so a team can see how often SlashForge is used and where: one event per
turn and per session, carrying the event name, the session id, and the working directory. It is
the reference example for SlashForge extension packs — copy it as the starting point for your own.

It ships a single host hook (`hooks/emit-telemetry.js`) and a config template
(`config/observability.config.json`). The installer copies both into
`…/extensions/observability/` and prints a summary of which event runs the script, to add to your
host hook config.

## What it emits

- By default, on **`SessionEnd`** and **`Stop`** only — low volume, high signal.
- **`PostToolUse`** is opt-in (set `emit_tool_use: true`); it is chatty, one event per tool call.
- Each event carries: `service_name`, the event name, a timestamp, and best-effort attributes
  (`session_id`, `cwd`, `tool`). No file contents, prompts, or code are sent.

## Transports (pick one in the config)

| `transport` | Where it sends | Notes |
|---|---|---|
| `webhook` (default) | POST JSON to `endpoint` | Any HTTP sink — Slack, an internal collector. |
| `otlp` | POST an OTLP log record to `endpoint/v1/logs` | Any OpenTelemetry-compatible backend. |
| `jsonl` | Append a line to the file at `endpoint` | No network; for local inspection. |

## Configure

Edit `config/observability.config.json` (or point `$SLASHFORGE_OBS_CONFIG` at your own copy):

```json
{
  "transport": "webhook",
  "endpoint": "https://example.internal/slashforge-usage",
  "service_name": "slashforge",
  "events": ["SessionEnd", "Stop"],
  "emit_tool_use": false
}
```

- `endpoint` — the webhook URL, the OTLP base URL, or (for `jsonl`) a file path. Empty = no-op.
- `events` — which host events to emit on.
- `emit_tool_use` — include `PostToolUse` (only takes effect if `PostToolUse` is also wired).

## Auth (environment variables only — never the config file)

- `SLASHFORGE_TELEMETRY_TOKEN` → sent as `Authorization: Bearer <token>` (webhook and OTLP).
- `OTEL_EXPORTER_OTLP_HEADERS` → extra OTLP headers, comma-separated `key=value` pairs.

Keep tokens out of the committed config; set them in the environment where the agent runs.

## Fail-open

The emitter never blocks the agent. Any failure — missing config, empty endpoint, a network
error, or a timeout (2s) — exits cleanly and emits nothing. A telemetry outage is invisible to
the person using the agent.

## Install and wire it up

```bash
npx slashforge --ext extensions/observability
```

Then add the printed hooks to your host's hook config in the format `slashforge-hooks.md` describes
(the printout is a readable summary, not host-config JSON). Because hooks are enabled per repo,
`/slashforge-setup` can also wire this pack's hooks into a repo for you and record them under
**Automated Behaviors**.

## Scope

This emits usage *events* (as webhook JSON or OTLP logs), not full distributed traces — no agent
host exposes trace-context propagation today. That is the right fit for "see how the team uses
SlashForge."
