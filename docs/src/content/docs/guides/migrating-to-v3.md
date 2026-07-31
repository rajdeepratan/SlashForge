---
title: Migrating to v3
description: What changed in SlashForge 3.0.0 and how to upgrade.
---

v3.0.0 renames every command. There is no compatibility shim — the old names
stop working.

## Command changes

| v2 | v3 |
| --- | --- |
| `/setup-claude` | `/forge:setup` |
| `/code` | `/forge:code` |
| `/quick` | `/forge:code -quick` |
| `/investigate` | `/forge:investigate` |

### Why

`/setup-claude` was tied to a single vendor, which does not survive the planned
Cursor and Codex support. The `forge/` namespace also stops `/code` colliding
with commands you already have — a real risk when the same commands are
installed across many repos.

### `/quick` is now a mode

`/quick` is no longer a separate command. It is lean **mode** on `/forge:code`:

```
/forge:code -quick
```

The two were never separate workflows. `/quick` always delegated to the same
workflow guides as `/code` and layered overrides on top. They are now one
command and one override guide, which is a more honest description of what was
already true.

Behaviour is unchanged: brainstorming skipped, two-section plan, inline
self-review instead of the agent pass. Every user gate and the Phase 6
lint/test/build verification are preserved.

Lean mode is never inferred. Only an explicit `-quick` selects it — describing
a small task without the flag runs full mode, whose Phase 1 auto-classification
already handles trivial work without the ceremony.

## Also removed

Both were deprecated in v2.0.0 and removed on schedule:

| Removed | Use instead |
| --- | --- |
| `claude-setup-kit` binary alias | `slashforge` |
| `CLAUDE_SETUP_KIT_YES` env var | `SLASHFORGE_YES` |

## File layout changes

| | v2 | v3 |
| --- | --- | --- |
| Guides | `~/.claude/setup/claude-setup/` | `~/.claude/setup/slashforge/` |
| Guide files | `claude-setup-*.md` | `forge-*.md` |
| Commands | `~/.claude/commands/*.md` | `~/.claude/commands/forge/*.md` |

## Upgrading

```bash
npx slashforge
```

This installs the v3 layout. It then **lists any v2 files still on disk** and
leaves them alone — it will not delete files you did not ask it to touch.

Remove them yourself once you have switched, or clear everything and reinstall:

```bash
npx slashforge uninstall   # removes both v2 and v3 layouts
npx slashforge
```

v3's `uninstall` and `status` both recognise the v2 layout, so an upgraded
install can always be cleaned up rather than orphaned.

## Coming from `claude-setup-kit`

If you are still on the original package name, the chain is
`claude-setup-kit` → `slashforge` (v2.0.0, package rename) → v3.0.0 (command
rename). The npm package `claude-setup-kit` is deprecated and points here.

```bash
npm uninstall -g claude-setup-kit
npm install -g slashforge
```
