---
title: CLI reference
description: The three things the npm package itself does, outside Claude Code.
---

The slash commands run inside Claude Code. The package has a small CLI of its
own for getting them on and off your machine.

| Command | What it does |
| --- | --- |
| `npx slashforge` | Installs guide files and the three commands into `~/.claude/` |
| `npx slashforge status` | Reports what is installed, at which version, without changing anything |
| `npx slashforge uninstall` | Removes the guides and commands it installed |

## Options

| Flag | Effect |
| --- | --- |
| `--project` | Install into `./.claude/` of the current repo instead of `~/.claude/` |
| `--dry-run` | Print planned file writes without touching the filesystem |
| `--yes`, `-y` | Non-interactive; auto-confirm the update prompt |
| `--help`, `-h` | Full usage |

`--yes` is also enabled by `SLASHFORGE_YES=1`, or automatically when stdin is
not a TTY — so CI, devcontainers, and anywhere else the install must not block
on a prompt work without the flag.

```bash
SLASHFORGE_YES=1 npx slashforge
```

## install

The default command. Installs the guide files and the three commands, then
tells you where each one landed.

```bash
npx slashforge
```

Re-running on a machine that already has it prompts to update to the latest
version. Worth doing when either optional integration changes upstream — if
Graphify changes its install commands, or a workflow phase changes, the guide
files need to catch up.

### Project mode

```bash
npx slashforge --project
```

Vendors the guides and commands into the repo's `./.claude/` with repo-relative
paths. Commit it and your teammates get the commands with no global install.

## status

Reports the installed version, the guide files present, the commands registered,
and whether the optional superpowers plugin was detected. It changes nothing.

```bash
npx slashforge status
```

```
slashforge status
  Package version (current): v4.0.1
  Installed version:         v4.0.1
  Installed at:              2026-08-01T15:37:54.153Z
  Guide files:               16 (~/.claude/setup/slashforge)
    • forge-agents.md
    • forge-claude-md.md
    • forge-commands.md
    ...
  Installed commands:        3
    • /slashforge:code
    • /slashforge:investigate
    • /slashforge:setup
  superpowers plugin:        not installed (optional)
```

On a machine with nothing installed it says so, rather than reporting an empty
install:

```
slashforge: not installed.
Run `npx slashforge` to install v4.0.1.
```

`status` recognises the older v2 and v3 layouts as well as the current one, so
an install upgraded across a rename still reports accurately instead of looking
absent.

## uninstall

```bash
npx slashforge uninstall              # from ~/.claude/
npx slashforge uninstall --project    # from ./.claude/
```

Removes only the files SlashForge installed, and recognises the v2 and v3
layouts alongside the current one — so an upgraded install can be cleaned up
rather than orphaned.

:::note
Without `--project`, uninstall touches nothing but `~/.claude/`. A repo's own
`.claude/` directory — the configuration `/slashforge:setup` generated — is
yours and is never read or removed. `--project` is the one case where it acts on
a repo, and only on the repo you run it in.
:::

If you have added your own commands under `~/.claude/commands/slashforge/`, they
are left alone and the directory is kept.
