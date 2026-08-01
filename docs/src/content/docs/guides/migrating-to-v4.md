---
title: Migrating to v4
description: "The command namespace moved from /forge: to /slashforge:"
---

v4.0.0 changes one thing: the command namespace.

## Command changes

| v3 | v4 |
| --- | --- |
| `/forge:setup` | `/slashforge:setup` |
| `/forge:code` | `/slashforge:code` |
| `/forge:code -quick` | `/slashforge:code -quick` |
| `/forge:investigate` | `/slashforge:investigate` |

Nothing else changed. Same three commands, same ten phases, same gates, same
`-quick` mode.

### Why

`forge` is a common word. As a command namespace it was liable to collide with
other tools' commands, which is the exact problem namespacing was introduced to
solve in v3. `slashforge` matches the package name and is specific enough to
stay yours.

Better to absorb the rename now than after it has spread.

## Upgrading

```bash
npx slashforge
```

That installs the new layout and then **lists** any older files still on disk.
It will not delete them — they are files you did not ask it to touch.

Remove them yourself, or clear everything and reinstall:

```bash
npx slashforge uninstall   # recognises the v2, v3 and v4 layouts
npx slashforge
```

## File layout

| | v3 | v4 |
| --- | --- | --- |
| Commands | `~/.claude/commands/forge/` | `~/.claude/commands/slashforge/` |
| Guides | `~/.claude/setup/slashforge/` | unchanged |

Guide filenames are unchanged. Only the command namespace directory moved.

If you have added your own commands under `~/.claude/commands/forge/`, uninstall
leaves them alone and keeps the directory — only the files SlashForge installed
are removed.

## Coming from v2 or earlier

Do both hops at once — there is nothing worth stopping at in between:

- [Migrating from claude-setup-kit](/slashforge/guides/migrating-from-claude-setup-kit/) if you
  are still on the original package name
- [Migrating to v3](/slashforge/guides/migrating-to-v3/) for the `/quick` → `-quick` change and
  the removed v2 aliases

Then apply the table above.
