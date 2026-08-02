---
title: Migrating
description: Every upgrade path in one place. Skip this page unless you installed before v4.
---

Newest first. Find the version you are on, apply that section, and stop — each
one is self-contained, and if you are two hops back you can do both at once.

:::note
Your repo's own `.claude/` directory survives every migration on this page.
Only the files under `~/.claude/` are replaced. The configuration
`/slashforge:setup` generated is yours.
:::

## v3 to v4

v4.0.0 changes one thing: the command namespace.

| v3 | v4 |
| --- | --- |
| `/forge:setup` | `/slashforge:setup` |
| `/forge:code` | `/slashforge:code` |
| `/forge:code -quick` | `/slashforge:code -quick` |
| `/forge:investigate` | `/slashforge:investigate` |

Nothing else changed in v4.0.0 — the same three commands, ten phases, gates and
`-quick` mode. (`/slashforge:review-pr` arrived later, in v4.2.0.)

### Why

`forge` is a common word. As a command namespace it was liable to collide with
other tools' commands — the exact problem namespacing was introduced to solve in
v3. `slashforge` matches the package name and is specific enough to stay yours.

Better to absorb the rename now than after it has spread.

### File layout

| | v3 | v4 |
| --- | --- | --- |
| Commands | `~/.claude/commands/forge/` | `~/.claude/commands/slashforge/` |
| Guides | `~/.claude/setup/slashforge/` | unchanged |

Guide filenames are unchanged. Only the command namespace directory moved.

## v2 to v3

v3.0.0 renamed every command. There is no compatibility shim — the old names
stop working.

| v2 | v3 |
| --- | --- |
| `/setup-claude` | `/forge:setup` |
| `/code` | `/forge:code` |
| `/quick` | `/forge:code -quick` |
| `/investigate` | `/forge:investigate` |

`/setup-claude` was tied to a single vendor, which does not survive the planned
Cursor and Codex support. The namespace also stops `/code` colliding with
commands you already have — a real risk when the same commands are installed
across many repos.

### `/quick` became a mode

`/quick` is no longer a separate command. It is lean mode on `/slashforge:code`:

```
/slashforge:code -quick
```

The two were never separate workflows. `/quick` always delegated to the same
workflow guides and layered overrides on top. They are now one command and one
override guide, which is a more honest description of what was already true.

Behaviour is unchanged: brainstorming skipped, two-section plan, inline
self-review instead of the agent pass. Every user gate and the Phase 6
lint/test/build verification are preserved.

Lean mode is never inferred. Only an explicit `-quick` selects it — describing a
small task without the flag runs full mode, whose Phase 1 auto-classification
already handles trivial work without the ceremony.

### Also removed in v3.0.0

Both were deprecated in v2.0.0 and removed on schedule:

| Removed | Use instead |
| --- | --- |
| `claude-setup-kit` binary alias | `slashforge` |
| `CLAUDE_SETUP_KIT_YES` env var | `SLASHFORGE_YES` |

### File layout

| | v2 | v3 |
| --- | --- | --- |
| Guides | `~/.claude/setup/claude-setup/` | `~/.claude/setup/slashforge/` |
| Guide files | `claude-setup-*.md` | `forge-*.md` |
| Commands | `~/.claude/commands/*.md` | `~/.claude/commands/forge/*.md` |

## From claude-setup-kit

If you installed **`claude-setup-kit`**, you are on the original package name.
It is deprecated and no longer updated.

Do not migrate in stages. Go straight to the current release:

```bash
npm uninstall -g claude-setup-kit
npm install -g slashforge
```

Or without a global install:

```bash
npx slashforge
```

The package name is cosmetic. The command names are muscle memory, and they are
what will actually trip you up:

| You are typing | Now type |
| --- | --- |
| `/setup-claude` | `/slashforge:setup` |
| `/code` | `/slashforge:code` |
| `/quick` | `/slashforge:code -quick` |
| `/investigate` | `/slashforge:investigate` |

`claude-setup-kit` tied the project to one vendor. Cursor and Codex support is
planned, and a name built around a single tool does not survive that. The same
reasoning drove `/setup-claude` → `/slashforge:setup` one release later.

## Upgrading, whichever hop you are on

```bash
npx slashforge
```

That installs the current layout and then **lists** any older files still on
disk. It will not delete them — they are files you did not ask it to touch.

Remove them yourself, or clear everything and reinstall:

```bash
npx slashforge uninstall   # recognises the v2, v3 and v4 layouts
npx slashforge
```

`uninstall` and `status` both recognise every earlier layout, so an upgraded
install can always be cleaned up rather than orphaned. See the
[CLI reference](/slashforge/reference/cli/) for exactly what each one touches.

If you have added your own commands under `~/.claude/commands/forge/`,
uninstall leaves them alone and keeps the directory — only the files SlashForge
installed are removed.
