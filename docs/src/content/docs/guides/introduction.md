---
title: Introduction
description: What SlashForge is, what it installs, and who it is for.
---

SlashForge installs workflow slash commands into AI coding agents. The commands
impose a disciplined development process — plan, confirm, branch, implement,
verify, review, PR — rather than letting an agent freewheel from prompt to
patch.

It is guardrails, not autocomplete.

## What gets installed

Two things land on your machine:

| What | Where |
| --- | --- |
| Guide files | `~/.claude/setup/slashforge/` |
| Commands | `~/.claude/commands/forge/` |

The commands are thin. They point at the guide files, which carry the actual
workflow. That separation is why a command can change modes — `-quick` simply
loads one extra guide.

Commands live in a `forge/` subdirectory, which is what produces the `/slashforge:`
prefix and keeps them from colliding with commands you already have.

## The three commands

### `/slashforge:setup`

One-time repo setup. Explores the codebase, asks clarifying questions in
batches, then creates `CLAUDE.md` plus tailored rules, skills, agents,
commands, and hooks in `.claude/`. Handles fresh repos and partial setups.

### `/slashforge:code`

The full ten-phase development workflow, ending in a merged PR. Four points
stop and wait for you: plan confirmation, branch decision, PR target, and
post-merge cleanup.

Pass `-quick` for lean mode on small changes — it skips brainstorming, uses a
two-section plan, and swaps the agent code review for an inline checklist. Every
user gate and the lint/test/build verification stay.

### `/slashforge:investigate`

Read-only research. Reproduces a bug, finds the root cause, and writes a report
to `.claude/investigations/`. No branch, no PR, no code changes.

## Why the workflow matters

The gates are the point. An agent that plans, gets confirmation, then implements
produces reviewable work. An agent that goes straight from prompt to a large
diff produces something you have to audit line by line.

Phase 6 runs lint, tests, and build before anything reaches a PR — so
"it's done" means it was verified, not asserted.

## Superpowers

SlashForge integrates with the [superpowers](https://github.com/obra/superpowers)
plugin when installed, invoking a specific skill per phase — brainstorming for
intake, test-driven-development for implementation, and so on.

If superpowers is not installed, the workflow still runs. The skill steps
degrade to following the written phase instructions.

## Supported tools

Claude Code today. Cursor and Codex are planned — the rename to the vendor-neutral
`/slashforge:` namespace in v3.0.0 was groundwork for exactly that.

## Next

**[Installation](/slashforge/guides/installation/)** — requirements, first run, and the setup
sequence end to end.

Already installed? Go straight to [`/slashforge:setup`](/slashforge/commands/slashforge-setup/).

