---
title: Installation
description: One command to install, then your first run end to end.
---

## Quick start

```bash
npx slashforge
```

==That installs the guide files and the four commands for Claude Code, Cursor and
Codex== — into `~/.claude/` and `~/.agents/`. Open Claude Code in any repo and type `/` — you should see `/slashforge-setup`,
`/slashforge-code`, `/slashforge-investigate`, and `/slashforge-review-pr`.

### Using Cursor or Codex

The same `npx slashforge` sets them up too — there is nothing to choose.

It installs to `~/.agents/skills/`, which ==Cursor and Codex both read==. Type `/`
in Cursor and you should see `/slashforge-setup`, `/slashforge-code`,
`/slashforge-investigate` and `/slashforge-review-pr`. In Codex they are invoked with
`$` — `$slashforge-code`.

==Each host still gets its own setup.== Cursor and Codex share the skills, but setup
scaffolds each host's own layout, so their guides live in separate folders:
`~/.agents/setup/slashforge/cursor/` and `…/codex/`. The first thing each command does
is work out which of the two it is running in; if it can't tell, it asks you once.

Two differences worth knowing before you start:

- ==Commands have the same name on every agent.== Only Codex invokes them with `$`
  rather than `/`; pick your agent in the header and the docs show the form it takes.
- ==Setup scaffolds your host's own layout.== On Cursor that is `.cursor/rules/*.mdc`
  and `.cursor/agents/`; on Codex, nested `AGENTS.md` and `.codex/agents/*.toml`. It
  never writes `CLAUDE.md` or `.claude/` in Cursor or Codex. Every step below applies
  to all three hosts.

See [the CLI reference](/slashforge/reference/cli/#hosts) for where each host's files land.

## Your first run

Start to finish, for a repo that has never used SlashForge.

**1. Install SlashForge.**

```bash
npx slashforge
```

**2. Nothing else to install.** ==SlashForge ships every discipline skill the workflow
uses, so there is no plugin step.== See [Skills](/slashforge/guides/skills/) for
what runs at each phase.

**3. Set up the repo.** Open your coding agent in your project and run:

```
/slashforge-setup
```

It explores the codebase, asks you questions in batches, and ==generates
rules, agents, skills, and hooks in your agent's own layout== — `CLAUDE.md` and
`.claude/` on Claude Code, `AGENTS.md` plus `.cursor/` or `.codex/` on the others. This is also where
Graphify is offered, if your languages are supported — say no and it skips
silently.

**4. Do some work.**

```
/slashforge-code
```

It asks what you want to build, then walks the ten phases, ==stopping at four
points for your approval==. For a small change, add `-quick`.

**5. Check it landed.**

```bash
npx slashforge status
```

==That's the whole loop. `/slashforge-setup` once per repo, `/slashforge-code` per
change==, [`/slashforge-review-pr`](/slashforge/commands/slashforge-review-pr/) to review
someone else's, and [`/slashforge-investigate`](/slashforge/commands/slashforge-investigate/)
when you need to understand a bug before touching it.

## Requirements

- **Node.js 16+**
- **Claude Code, Cursor or Codex** — any one of them, or all three

==That is all SlashForge itself requires.==

## Optional integration

One, [Graphify](/slashforge/guides/graphify/), and **it does not have to be
installed first**. `/slashforge-setup` offers it mid-run, on supported languages
only. Every discipline skill the workflow uses [ships with SlashForge](/slashforge/guides/skills/),
so there is no plugin to add.

==You do not need to prepare anything.== Install SlashForge, run a command, and it
will offer what it needs when it needs it.

:::note
Graphify is a Python CLI, so accepting it needs Python 3.10+ and `uv`
(or `pipx`/`pip`) on your machine. ==Nothing to do up front== — the
[Graphify page](/slashforge/guides/graphify/) covers the prerequisites and the
optional extras when you get there.
:::

## More

The package has a small CLI beyond the install command — `status`, `uninstall`,
project-mode vendoring, and the non-interactive flags for CI. All of it is on the
[CLI reference](/slashforge/reference/cli/).
