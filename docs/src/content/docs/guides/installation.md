---
title: Installation
description: One command to install, then your first run end to end.
---

## Quick start

```bash
npx slashforge
```

==That installs the guide files and the four commands into `~/.claude/`.== Open
Claude Code in any repo and type `/` — you should see `/slashforge:setup`,
`/slashforge:code`, `/slashforge:investigate`, and `/slashforge:review-pr`.

### Using Cursor or Codex

```bash
npx slashforge --target cursor
```

That installs to `~/.agents/skills/`, which ==Cursor and Codex both read==. Type `/`
in Cursor and you should see `/slashforge-setup`, `/slashforge-code`,
`/slashforge-investigate` and `/slashforge-review-pr`. In Codex they are invoked with
`$` — `$slashforge-code`.

==Install for the agent you actually use.== `--target cursor` and `--target codex`
write to the same directory but render different content, because setup scaffolds each
host's own layout. Installing one after the other replaces the first.

Two differences worth knowing before you start:

- ==Commands are spelled differently per agent.== Use the switcher in the header, or the
  tabs on any command block, and the docs show the form your agent takes. In Codex they are
  invoked with `$` rather than `/`.
- ==Setup scaffolds your host's own layout.== On Cursor that is `.cursor/rules/*.mdc`
  and `.cursor/agents/`; on Codex, nested `AGENTS.md` and `.codex/agents/*.toml`. It
  never writes `CLAUDE.md` or `.claude/` on a vendor target. Every step below applies
  to all three hosts.

See [the CLI reference](/slashforge/reference/cli/) for the full target list.

## Your first run

Start to finish, for a repo that has never used SlashForge.

**1. Install SlashForge.**

```bash
npx slashforge
```

**2. Set up the repo.** ==SlashForge ships every discipline skill the workflow
uses, so there is no plugin step.== See [Skills](/slashforge/guides/skills/) for
what runs at each phase.

**3. Set up the repo.** Open Claude Code in your project and run:

```
/slashforge:setup
```

It explores the codebase, asks you questions in batches, and ==generates
`CLAUDE.md` plus `.claude/` rules, agents, skills, and hooks==. This is also where
Graphify is offered, if your languages are supported — say no and it skips
silently.

**4. Do some work.**

```
/slashforge:code
```

It asks what you want to build, then walks the ten phases, ==stopping at four
points for your approval==. For a small change, add `-quick`.

**5. Check it landed.**

```bash
npx slashforge status
```

==That's the whole loop. `/slashforge:setup` once per repo, `/slashforge:code` per
change==, [`/slashforge:review-pr`](/slashforge/commands/slashforge-review-pr/) to review
someone else's, and [`/slashforge:investigate`](/slashforge/commands/slashforge-investigate/)
when you need to understand a bug before touching it.

## Requirements

- **Node.js 18+**
- **Claude Code**

==That is all SlashForge itself requires.==

## Optional integrations

Two, and **neither has to be installed first**. This trips people up, so to be
explicit:

| | Required? | When you deal with it |
| --- | --- | --- |
| [superpowers](/slashforge/guides/skills/) | No — nothing invokes or checks for it | Never prompted for. Install it only if you want its own library |
| [Graphify](/slashforge/guides/graphify/) | No, fully optional | `/slashforge:setup` offers it mid-run, on supported languages only |

==You do not need to prepare anything.== Install SlashForge, run a command, and it
will offer what it needs when it needs it.

:::note
Graphify is a Python CLI, so accepting that one needs Python 3.10+ and `uv`
(or `pipx`/`pip`) on your machine. ==Nothing to do up front== — the
[Graphify page](/slashforge/guides/graphify/) covers the prerequisites and the
optional extras when you get there.
:::

## More

The package has a small CLI beyond the install command — `status`, `uninstall`,
project-mode vendoring, and the non-interactive flags for CI. All of it is on the
[CLI reference](/slashforge/reference/cli/).
