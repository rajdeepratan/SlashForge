---
title: What it does to your machine
description: Every file SlashForge writes, every command it runs, and the things it will never do without asking.
---

You are about to let a tool write configuration into your home directory and run
git operations in your repo. That deserves a page, not a footnote.

## What it writes

| Path | When |
| --- | --- |
| `~/.claude/setup/slashforge/` | On install — the guide files that carry the workflow |
| `~/.claude/commands/slashforge/` | On install — the three command files |
| `<repo>/CLAUDE.md` | On `/slashforge:setup`, after you answer its questions |
| `<repo>/.claude/` | On `/slashforge:setup` — rules, skills, agents, commands, hooks |
| `<repo>/.claude/investigations/` | On `/slashforge:investigate` — the findings report |

Nothing is written outside those paths. Every generated file carries a
`generated_by` marker; remove or edit it and that file is treated as yours
permanently. See [`/slashforge:setup`](/slashforge/commands/slashforge-setup/)
for how the markers decide what may be refreshed.

## What it runs

Inside the workflow it runs **your own project commands** — lint, tests, build —
and git operations for the branch and PR phases. It uses the tooling already
configured in your repo. It does not install a test runner, a linter, or a
formatter of its own.

## What it never does

> **It never installs anything, force-pushes, or merges without asking.**

| Never | Detail |
| --- | --- |
| **Auto-install** | [superpowers](/slashforge/guides/superpowers/) and [Graphify](/slashforge/guides/graphify/) are offers. You see the exact shell command before anything runs |
| **Force-push** | Not at any phase |
| **Merge for you** | Phase 8 opens the PR. Merging is yours |
| **Delete a branch silently** | Phase 10 asks before cleanup |
| **Touch code in `investigate`** | No branch, no commits, no edits — the constraint is the feature |
| **Phone home** | No telemetry. Graphify, if you accept it, indexes entirely locally |

## Committing the config

Commit it.

`CLAUDE.md` and `.claude/` are the point — they are what makes the next session,
and everyone else on the team, start informed rather than cold. Generated
configuration that lives only on one machine buys you nothing on the second run.

The one directory worth considering for `.gitignore` is
`.claude/investigations/`, if you would rather keep findings reports local.

:::note
`npx slashforge uninstall` removes only what it put in `~/.claude/`. A repo's own
`.claude/` directory is yours and is never touched. See the
[CLI reference](/slashforge/reference/cli/).
:::

