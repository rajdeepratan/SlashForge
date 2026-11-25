# Observability (SlashForge extension pack)

Emits a SlashForge usage event when the agent finishes a turn (`Stop`) or a session
(`SessionEnd`), to a webhook, an OpenTelemetry (OTLP) collector, or a local JSONL file. It is the
reference example for SlashForge extension packs.

## Install

```bash
npx slashforge --ext extensions/observability
```

The installer validates the pack, copies it into `…/setup/slashforge/extensions/observability/`,
and prints the host-hook lines to paste into your hook config (`slashforge-hooks.md` has the
per-host format). Hooks are enabled per repo; `/slashforge-setup` can wire them up for you.

## Configure

Edit `config/observability.config.json`:

| Key | Meaning |
|---|---|
| `transport` | `webhook` (default), `otlp`, or `jsonl`. |
| `endpoint` | Webhook URL, OTLP base URL, or (for `jsonl`) a file path. Empty = no-op. |
| `service_name` | Label attached to every event. |
| `events` | Which host events to emit on (`SessionEnd`, `Stop`, optionally `PostToolUse`). |
| `emit_tool_use` | Include `PostToolUse` events (chatty; off by default). |

Auth is read from environment variables only, never the config file:

- `SLASHFORGE_TELEMETRY_TOKEN` → `Authorization: Bearer <token>`
- `OTEL_EXPORTER_OTLP_HEADERS` → extra OTLP headers (`k1=v1,k2=v2`)

## Guarantees

- **Zero dependencies**: Node built-ins only.
- **Fail-open**: any error or timeout emits nothing and never blocks the agent.
- **No sensitive data**: only counts, durations, event names, cwd, and tool name. No prompts,
  file contents, or code.

See `guides/slashforge-observability.md` for the full guide, and `slashforge-extensions.md` for
how to author your own pack.
