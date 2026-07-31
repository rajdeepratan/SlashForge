---
title: /forge:setup
description: One-time repo setup — generates CLAUDE.md plus tailored rules, skills, agents, commands, and hooks.
---

```
/forge:setup
```

One-time setup for a repository. Explores the codebase, asks clarifying
questions, then generates a `.claude/` configuration tailored to what it found.

Handles both fresh repos and partial setups — if `.claude/` already exists, it
fills gaps rather than overwriting.

## What it creates

| Output | Purpose |
| --- | --- |
| `CLAUDE.md` | Root instructions — architecture, conventions, intent routing |
| `.claude/rules/` | Conventions the agent must follow |
| `.claude/skills/` | Repo-specific procedures |
| `.claude/agents/` | Specialist agents, plus shared `git` and `code-reviewer` |
| `.claude/commands/` | Repo-specific commands |
| `.claude/hooks/` | Automated behaviours |

In a monorepo it creates shared rules and root `CLAUDE.md`, then app-specific
rules, skills, agents, and per-app `CLAUDE.md` files.

## Safe re-runs

Every generated file carries a `generated_by` marker — YAML frontmatter for
`.claude/` files, an HTML comment for `CLAUDE.md`. On re-run the marker decides
what happens:

| Marker state | Behaviour |
| --- | --- |
| Present, version current | Safe to refresh |
| Present, version older | Stale — proposes a refresh, asks before overwriting |
| Missing or edited | Treated as yours — gaps filled, never overwritten |

Remove or edit the marker on any file you want left alone permanently.

## Monorepos

In a monorepo it creates a root `CLAUDE.md` with shared rules and global agents,
then a separate `CLAUDE.md` per app with app-specific rules, skills, and
specialist agents.

## Graphify

During exploration, `/forge:setup` checks language fit for
[Graphify](https://github.com/rajdeepratan/graphify). If at least 70% of
non-trivial source files are in a supported language, it offers to install and
index. On YAML, shell, or config-only repos it skips silently.

This is a **setup-time offer, not a per-command check**. It always shows you the
exact commands before asking — nothing is installed without your say-so.

If you accept, it also synthesises `graphify-out/SUMMARY.html`, a
browser-readable interpretation of the machine-formatted graph report.

## What it does not do

It does not write application code, create branches, or open PRs. It only
produces configuration. Use [`/forge:code`](../forge-code/)
for development work.
