---
title: /slashforge:setup
description: One-time repo setup — generates CLAUDE.md plus tailored rules, skills, agents, commands, and hooks.
---

```
/slashforge:setup
```

One-time setup for a repository. Explores the codebase, asks clarifying
questions, then ==generates a `.claude/` configuration tailored to what it found==.

Handles both fresh repos and partial setups — ==if `.claude/` already exists, it
fills gaps rather than overwriting==.

:::caution
==`/slashforge:setup` is Claude Code only for now== — it provisions `.claude/`
structure that has no equivalent on the other targets, so it is not installed
there. The other three commands are available on every target.
:::

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

==Remove or edit the marker on any file you want left alone permanently.==

## Monorepos

In a monorepo it creates a root `CLAUDE.md` with shared rules and global agents,
then a separate `CLAUDE.md` per app with app-specific rules, skills, and
specialist agents.

## Graphify

During exploration, `/slashforge:setup` checks language fit for
[Graphify](https://github.com/rajdeepratan/graphify). If at least 70% of
non-trivial source files are in a supported language, it offers to install and
index. On YAML, shell, or config-only repos it skips silently.

This is a **setup-time offer, not a per-command check**. ==It always shows you the
exact commands before asking — nothing is installed without your say-so.==

If you accept, it also synthesises `graphify-out/SUMMARY.html`, a
browser-readable interpretation of the machine-formatted graph report.

## What it costs

**~50–120k tokens — once per repo.** ==Unlike the other commands, this is not a
per-run cost.== You pay it when you adopt SlashForge in a codebase and then not
again unless you re-run it.

It carries **the largest fixed instruction load of any command: ~20k tokens**,
before it has read a single line of your code. That is the command plus twelve
guide files, and it is the price of the output being tailored rather than
templated — the guides are what let it write rules that match your conventions
instead of generic ones.

The rest divides in two, and the second half is the expensive direction:

| | |
| --- | --- |
| Exploration | Reading your repo — structure, conventions, existing config. Scales with repo size. |
| Generation | Writing `CLAUDE.md`, rules, skills, agents, commands and hooks. **Output tokens**, a dozen or more files. |

Accepting the [Graphify](#graphify) offer adds roughly **5–15k** for
synthesising `SUMMARY.html`.

A small, conventional repo lands near 50k. A large polyglot one with several
distinct subsystems — more to read, and more rules worth writing — approaches
the top.

## What it does not do

==It does not write application code, create branches, or open PRs. It only
produces configuration.== Use [`/slashforge:code`](/slashforge/commands/slashforge-code/)
for development work.
