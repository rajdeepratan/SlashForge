---
title: Installation
description: Install SlashForge globally or vendor it into a repo.
---

## Quick start

```bash
npx slashforge
```

That installs the guide files and the three commands into `~/.claude/`. Open
Claude Code in any repo and type `/` — you should see `/forge:setup`,
`/forge:code`, and `/forge:investigate`.

## Global install

```bash
npm install -g slashforge
slashforge
```

Re-running on a machine that already has it prompts to update to the latest
version.

## Project install

```bash
slashforge --project
```

Vendors the guides and commands into the repo's `./.claude/` with repo-relative
paths. Commit it and your teammates get the commands with no global install.

## Flags and subcommands

| Command | What it does |
| --- | --- |
| `slashforge` | Install or update |
| `slashforge --project` | Install into `./.claude/` of the current repo |
| `slashforge --dry-run` | Print planned writes without touching the filesystem |
| `slashforge --yes` | Non-interactive; auto-confirm the update prompt |
| `slashforge status` | Show installed version, guide count, available update |
| `slashforge uninstall` | Remove guides and commands (add `--project`) |
| `slashforge --help` | Full usage |

## Non-interactive use

`--yes` is also enabled by `SLASHFORGE_YES=1`, or automatically when stdin is
not a TTY. Safe for CI, devcontainers, or anywhere the install must not block
on a prompt.

```bash
SLASHFORGE_YES=1 npx slashforge
```

## Requirements

- Node.js 18 or newer
- Claude Code

The [superpowers](https://github.com/obra/superpowers) plugin is optional but
recommended — the workflow invokes its skills per phase when present, and
degrades gracefully when absent.

## Verifying the install

```bash
slashforge status
```

Reports the installed version, the guide files present, the commands
registered, and whether superpowers was detected.

## Updating

Re-run the install command to pull the latest guide files:

```bash
npx slashforge
# → "slashforge is already installed. Update to v3.0.x? (y/n)"
```

Worth doing when either optional integration changes upstream — if superpowers
renames a skill, or Graphify changes its install commands, the guide files need
to catch up.

## Uninstalling

```bash
slashforge uninstall              # global
slashforge uninstall --project    # repo-local
```

Uninstall removes only the files SlashForge installed. If you have added your
own commands under `~/.claude/commands/forge/`, they are left alone and the
directory is kept.
