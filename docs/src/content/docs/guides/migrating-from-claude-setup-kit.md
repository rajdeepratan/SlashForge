---
title: Migrating from claude-setup-kit
description: You are on the old package name. Here is how to get current in one step.
---

If you installed **`claude-setup-kit`**, you are on the original package name. It
is deprecated and no longer updated.

Do not migrate in stages. Go straight to the current release — there is nothing
worth stopping for in between.

## One step

```bash
npm uninstall -g claude-setup-kit
npm install -g slashforge
```

Or without a global install:

```bash
npx slashforge
```

## What changed, and when

| Release | Change |
| --- | --- |
| **v2.0.0** | Package renamed `claude-setup-kit` → `slashforge` |
| **v3.0.0** | Commands renamed and namespaced under `/slashforge:` |

Skipping straight to v3 means both land at once.

## Your commands have changed

This is the part that will actually trip you up — the package name is
cosmetic, the command names are muscle memory:

| You are typing | Now type |
| --- | --- |
| `/setup-claude` | `/slashforge:setup` |
| `/code` | `/slashforge:code` |
| `/quick` | `/slashforge:code -quick` |
| `/investigate` | `/slashforge:investigate` |

`/quick` is no longer a command — it is a mode of `/slashforge:code`. Full detail in
[Migrating to v3](../migrating-to-v3/).

## Why the rename happened

`claude-setup-kit` tied the project to one vendor. Cursor and Codex support is
planned, and a name built around a single tool does not survive that. The same
reasoning drove `/setup-claude` → `/slashforge:setup` one release later.

## Cleaning up old files

v2 and v3 use different paths, so an upgrade leaves the old files behind:

| | Old | Current |
| --- | --- | --- |
| Guides | `~/.claude/setup/claude-setup/` | `~/.claude/setup/slashforge/` |
| Guide files | `claude-setup-*.md` | `forge-*.md` |
| Commands | `~/.claude/commands/*.md` | `~/.claude/commands/forge/*.md` |

Running `npx slashforge` installs the current layout and then **lists** any old
files still present. It does not delete them — they are files you did not ask it
to touch.

Remove them yourself, or clear everything and reinstall:

```bash
npx slashforge uninstall   # recognises both old and current layouts
npx slashforge
```

## Removed along the way

| Removed in v3.0.0 | Use instead |
| --- | --- |
| `claude-setup-kit` binary alias | `slashforge` |
| `CLAUDE_SETUP_KIT_YES` env var | `SLASHFORGE_YES` |

Both were kept working through v2 as deprecations, then removed on schedule.

## Next

- [Installation](../installation/) — flags, project mode, CI usage
- [Migrating to v3](../migrating-to-v3/) — the full command reference
