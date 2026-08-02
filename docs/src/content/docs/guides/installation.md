---
title: Installation
description: One command to install, then your first run end to end.
---

## Quick start

```bash
npx slashforge
```

That installs the guide files and the four commands into `~/.claude/`. Open
Claude Code in any repo and type `/` — you should see `/slashforge:setup`,
`/slashforge:code`, `/slashforge:investigate`, and `/slashforge:review-pr`.

## Your first run

Start to finish, for a repo that has never used SlashForge.

**1. Install SlashForge.**

```bash
npx slashforge
```

**2. Install superpowers — optional.** SlashForge ships its own discipline
skills, so you can skip this entirely. No command stops to ask, and there is no
degraded mode.

```
/plugin install superpowers@claude-plugins-official
```

Skipping it costs three capabilities and nothing else: worktree isolation in
Phase 4, subagent-driven execution in Phase 5, and reviewer-subagent dispatch in
Phase 7. See [skills and the superpowers
plugin](/slashforge/guides/skills/).

**3. Set up the repo.** Open Claude Code in your project and run:

```
/slashforge:setup
```

It explores the codebase, asks you questions in batches, and generates
`CLAUDE.md` plus `.claude/` rules, agents, skills, and hooks. This is also where
Graphify is offered, if your languages are supported — say no and it skips
silently.

**4. Do some work.**

```
/slashforge:code
```

It asks what you want to build, then walks the ten phases, stopping at four
points for your approval. For a small change, add `-quick`.

**5. Check it landed.**

```bash
npx slashforge status
```

That's the whole loop. `/slashforge:setup` once per repo, `/slashforge:code` per
change, [`/slashforge:review-pr`](/slashforge/commands/slashforge-review-pr/) to review
someone else's, and [`/slashforge:investigate`](/slashforge/commands/slashforge-investigate/)
when you need to understand a bug before touching it.

## Requirements

- **Node.js 18+**
- **Claude Code**

That is all SlashForge itself requires.

## Optional integrations

Two, and **neither has to be installed first**. This trips people up, so to be
explicit:

| | Required? | When you deal with it |
| --- | --- | --- |
| [superpowers](/slashforge/guides/skills/) | No — SlashForge ships its own skills | Never prompted for. Install it only if you want worktree isolation or subagent execution |
| [Graphify](/slashforge/guides/graphify/) | No, fully optional | `/slashforge:setup` offers it mid-run, on supported languages only |

You do not need to prepare anything. Install SlashForge, run a command, and it
will offer what it needs when it needs it.

:::note
Graphify is a Python CLI, so accepting that one needs Python 3.10+ and `uv`
(or `pipx`/`pip`) on your machine. Nothing to do up front — the
[Graphify page](/slashforge/guides/graphify/) covers the prerequisites and the
optional extras when you get there.
:::

## More

The package has a small CLI beyond the install command — `status`, `uninstall`,
project-mode vendoring, and the non-interactive flags for CI. All of it is on the
[CLI reference](/slashforge/reference/cli/).
