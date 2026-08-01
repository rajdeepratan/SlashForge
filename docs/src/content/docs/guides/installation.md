---
title: Installation
description: Install SlashForge globally or vendor it into a repo.
---

## Before you start

You need two things:

- **Node.js 18+**
- **Claude Code**

That is all SlashForge itself requires. There are two optional integrations, and
**neither has to be installed first** — this trips people up, so to be explicit:

| | Required? | When you deal with it |
| --- | --- | --- |
| [superpowers](/slashforge/guides/superpowers/) | No, but strongly recommended | The first command you run offers to install it |
| [Graphify](/slashforge/guides/graphify/) | No, fully optional | `/slashforge:setup` offers it mid-run, on supported languages only |

You do not need to prepare anything. Install SlashForge, run a command, and it
will walk you through the rest.

### If you say yes to Graphify

Graphify is a Python CLI, so accepting the offer needs one more thing on your
machine:

- **Python 3.10+**
- **`uv`** — or `pipx`, or plain `pip`. Any of the three works; `uv` is what
  `/slashforge:setup` suggests first.

Nothing else. Graphify's own dependencies — `networkx`, `numpy`, `rapidfuzz`,
and the tree-sitter grammar for each supported language — are resolved by the
installer. There is no requirements file to manage and no virtualenv to create
yourself; `uv tool install` and `pipx install` both put `graphifyy` in its own
isolated environment.

```bash
python3 --version                 # need 3.10 or newer
uv --version                      # or: pipx --version
```

If `uv` is missing, install it with `curl -LsSf https://astral.sh/uv/install.sh | sh`
(macOS/Linux), or use `pipx`/`pip` instead — no reason to add a tool you don't
already want.

One caveat worth knowing up front: `graphify watch .`, the recommended way to
[keep the graph fresh](/slashforge/guides/graphify/), needs the `watch` extra,
which the plain install does not include. If you expect to use it, install with
`uv tool install "graphifyy[watch]"` instead.

Say no to the Graphify offer and none of this applies: SlashForge itself never
touches Python. See [Graphify](/slashforge/guides/graphify/) for what the
integration buys you.

## Quick start

```bash
npx slashforge
```

That installs the guide files and the three commands into `~/.claude/`. Open
Claude Code in any repo and type `/` — you should see `/slashforge:setup`,
`/slashforge:code`, and `/slashforge:investigate`.

## Your first run

Start to finish, for a repo that has never used SlashForge:

**1. Install SlashForge.**

```bash
npx slashforge
```

**2. Install superpowers.** Optional, but do it now — it is one line, and the
workflow leans on it at almost every phase:

```
/plugin install superpowers@claude-plugins-official
```

If you skip it, your first command will stop, explain what you lose, and offer
to install it then. Nothing breaks either way — it just runs in a degraded mode
it will tell you about. See [Superpowers preflight](/slashforge/guides/superpowers/).

**3. Set up the repo.** Open Claude Code in your project and run:

```
/slashforge:setup
```

It explores the codebase, asks you questions in batches, and generates
`CLAUDE.md` plus `.claude/` rules, agents, skills, and hooks. This is also where
Graphify is offered, if your languages are supported — say no and it skips
silently, and you can accept later by re-running.

**4. Do some work.**

```
/slashforge:code
```

It asks what you want to build, then walks the ten phases, stopping at four
points for your approval. For a small change, add `-quick`.

That's the whole loop. `/slashforge:setup` once per repo, `/slashforge:code` per change,
and [`/slashforge:investigate`](/slashforge/commands/slashforge-investigate/) when you need to
understand a bug before touching it.

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
