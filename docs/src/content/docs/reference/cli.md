---
title: CLI reference
description: The three things the npm package itself does, and where it installs for each host.
---

==The slash commands run inside your coding agent.== The package has a small CLI of
its own for getting them on and off your machine.

| Command | What it does |
| --- | --- |
| `npx slashforge` | Installs guide files, the four commands and the nine discipline skills for Claude Code, Cursor and Codex |
| `npx slashforge status` | Reports what is installed, at which version, without changing anything |
| `npx slashforge uninstall` | Removes the guides and commands it installed |

## Options

| Flag | Effect |
| --- | --- |
| `--project` | Install into the current repo (`./.claude/` and `./.agents/`) instead of your home directory |
| `--dry-run` | Print planned file writes without touching the filesystem |
| `--yes`, `-y` | Non-interactive; auto-confirm the update and uninstall prompts |
| `--help`, `-h` | Full usage |

`--yes` is also enabled by `SLASHFORGE_YES=1`. When stdin is not a TTY the update
prompt confirms itself — ==so CI, devcontainers, and anywhere else the install must
not block on a prompt work without the flag==. Uninstall does not: with no terminal
to ask on, it refuses and exits 1 unless `--yes` or `SLASHFORGE_YES=1` is given.

```bash
SLASHFORGE_YES=1 npx slashforge
```

## Hosts

==One install serves all three hosts.== There is nothing to choose.

| Host | Commands live in | Guides live in | Invoked as |
| --- | --- | --- | --- |
| Claude Code | `~/.claude/commands/` (as `slashforge-*.md`) | `~/.claude/setup/slashforge/` | `/slashforge-code` |
| Cursor | `~/.agents/skills/` | `~/.agents/setup/slashforge/cursor/` | `/slashforge-code` |
| Codex | `~/.agents/skills/` | `~/.agents/setup/slashforge/codex/` | `$slashforge-code` |

==Cursor and Codex share one set of skills==, because both read `.agents/skills/`.
Each still has its own guide folder, because `/slashforge-setup` writes each host's
own layout and those layouts genuinely differ — see
[What setup writes on each host](#what-setup-writes-on-each-host).

The first thing each Cursor or Codex command does is work out which of the two it is
running in and read that host's guides; if it can't tell, it asks you once.

`--target` is gone. Passing it exits with a message saying it is no longer needed.

### Why every name is `slashforge-`

==The same name on every host.== Cursor and Codex name a skill by the folder that
holds its `SKILL.md`, and neither supports a `:` namespace, so the prefix has to live
in the name — otherwise the commands would install as bare `/code` and `/plan` and
collide with everything else in your skills directory. Claude Code installs flat
`slashforge-*.md` files to match. Only Codex differs: it invokes skills with `$`, and
the cross-references in its guides use `$` too.

### What setup writes on each host

==`/slashforge-setup` runs on all three hosts== and scaffolds each one's native
layout. It never writes `CLAUDE.md` or `.claude/` on a vendor target.

| Layer | Claude Code | Cursor | Codex |
| --- | --- | --- | --- |
| Entry file | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| Rules | `.claude/rules/*.md` | `.cursor/rules/*.mdc` | nested `AGENTS.md` |
| Skills | `.claude/skills/` | `.cursor/skills/` | `.agents/skills/` |
| Subagents | `.claude/agents/*.md` | `.cursor/agents/*.md` | `.codex/agents/*.toml` |
| Commands | `.claude/commands/*.md` | `.cursor/commands/*.md` | none — write a skill |
| Hooks | `.claude/settings.json` | `.cursor/hooks.json` | `.codex/hooks.json` |

Three differences are worth knowing before you run it:

- ==Cursor rules must be `.mdc`.== A plain `.md` file in `.cursor/rules/` is
  silently ignored, because the rules system needs frontmatter to know when to
  apply it. Setup writes `.mdc` with `description`, `globs` and `alwaysApply`.
- ==Codex has no rules directory.== Its equivalent is nested `AGENTS.md`: Codex
  loads every one from the repo root down to the file being edited, closest
  first. Setup puts a rule in the directory it governs.
- ==Codex subagents are TOML==, with the prompt in a `developer_instructions`
  string rather than a markdown body.

If setup finds a `CLAUDE.md` in a repo you are setting up for Cursor or Codex, it
asks before touching it — collapse it to a one-line `@AGENTS.md` import, leave it
alone, or mirror the content into both. It never rewrites it silently.

:::note
Codex invokes skills as `$slashforge-setup` rather than `/slashforge-setup`.
Switch the tabs on any command block and the docs show the form your host uses.
:::

### Graphify on each host

If you accept the Graphify offer during setup, it wires itself in per host:

| Target | Command | What it writes |
| --- | --- | --- |
| `claude` | `graphify claude install` | `CLAUDE.md` section + a PreToolUse hook |
| `cursor` | `graphify cursor install` | `.cursor/rules/graphify.mdc` |
| `codex` | `graphify codex install` | `AGENTS.md` section + a PreToolUse hook |

Setup always writes its own files first and runs Graphify's step last, so
Graphify's addition survives and is left alone on future re-runs.

## install

The default command. Installs the guide files, the four commands and the nine skills, then
tells you where each one landed.

```bash
npx slashforge
```

==Re-running on a machine that already has it prompts to update to the latest
version.== Worth doing when either optional integration changes upstream — if
Graphify changes its install commands, or a workflow phase changes, the guide
files need to catch up.

### Project mode

```bash
npx slashforge --project
```

Vendors the guides and commands into the repo's `./.claude/` with repo-relative
paths. ==Commit it and your teammates get the commands with no global install.==

### The update check

`install` and `status` both ask npm for the current release when they finish,
and print one warning if the copy you ran is older:

```
⚠  This is v4.4.3. The current release is v4.5.0.
   `npx slashforge` runs a global install if you have one, and never checks npm:
     npm uninstall -g slashforge     # then re-run npx, or
     npm install -g slashforge@latest
```

==`npx` prefers an executable already on your `PATH`.== If you have ever run
`npm install -g slashforge`, `npx slashforge` runs *that* copy and never
contacts the registry — so it can keep installing an old release while
reporting success, which is exactly what this warning is for.

The check has a 1.5 second timeout and ==every failure is silent==: an offline
install, a private registry that does not answer, or a response in an
unexpected shape all leave the output unchanged. It honours the registry npm is
configured with, is skipped when `CI` is set, and `SLASHFORGE_NO_UPDATE_CHECK=1`
turns it off.

## status

Reports the installed version, the guide files present, the commands registered,
It changes nothing.

```bash
npx slashforge status
```

```

slashforge status
  Package version (current): v4.5.0

  Claude Code (~/.claude)
    Installed version:  v4.5.0
    Guide files:        16 (~/.claude/setup/slashforge)
    Installed commands: 4
      • /slashforge-code
      • /slashforge-investigate
      • /slashforge-review-pr
      • /slashforge-setup

  Cursor + Codex (~/.agents)
    Installed version:  v4.5.0
    Guide files (cursor): 16 (~/.agents/setup/slashforge/cursor)
    Guide files (codex): 16 (~/.agents/setup/slashforge/codex)
    Installed commands: 4
      • /slashforge-code (Cursor), $slashforge-code (Codex)
      • /slashforge-investigate (Cursor), $slashforge-investigate (Codex)
      • /slashforge-review-pr (Cursor), $slashforge-review-pr (Codex)
      • /slashforge-setup (Cursor), $slashforge-setup (Codex)
```

With `--project`, it also warns when SlashForge is installed globally as well. Claude
Code prefers personal commands over project ones, so the global copy is the one that
runs, not the one committed to the repo; Cursor and Codex may list both copies. A
`--project` install prints the same warnings.

On a machine with nothing installed it says so, rather than reporting an empty
install:

```
slashforge: not installed.
Run `npx slashforge` to install v4.5.0.
```

==`status` recognises the older v2 and v3 layouts as well as the current one==, so
an install upgraded across a rename still reports accurately instead of looking
absent.

## uninstall

```bash
npx slashforge uninstall            # from ~/.claude/ and ~/.agents/
npx slashforge uninstall --project  # from ./.claude/ and ./.agents/
npx slashforge uninstall --yes      # in a script, where there is no prompt
```

==Removes only the files SlashForge installed==, and recognises the v2 and v3
layouts alongside the current one — so an upgraded install can be cleaned up
rather than orphaned.

:::note
==Without `--project`, uninstall touches nothing but `~/.claude/` and `~/.agents/`.== A repo's own
`.claude/` directory — the configuration `/slashforge-setup` generated — is
yours and is never read or removed. `--project` is the one case where it acts on
a repo, and only on the repo you run it in.
:::

==Your own commands in `~/.claude/commands/` are left alone==, even ones named like
the kit's: uninstall removes only the `slashforge-*.md` files it installed.

The same care applies to `.agents/skills/`, which you likely share with other
tools: uninstall removes ==only the `slashforge-*` directories it created==, and
removes the `skills/` directory itself only if nothing else is left in it.
