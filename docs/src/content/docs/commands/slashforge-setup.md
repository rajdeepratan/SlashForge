---
title: /slashforge-setup
description: One-time repo setup — generates the entry file plus tailored rules, skills, agents, commands, and hooks, in your agent's own layout.
---

```
/slashforge-setup
```

One-time setup for a repository. Explores the codebase, asks clarifying
questions, then ==generates a configuration tailored to what it found==, in the layout
of the agent you run it in.

Handles both fresh repos and partial setups — ==if a setup already exists, it
fills gaps rather than overwriting==.

:::note
==This command runs on all three hosts== and writes each one's native layout —
`.cursor/rules/*.mdc` and `.cursor/agents/` on Cursor, nested `AGENTS.md` and
`.codex/agents/*.toml` on Codex. It never writes `CLAUDE.md` or `.claude/` in
Cursor or Codex. See
[What setup writes on each host](/slashforge/reference/cli/#what-setup-writes-on-each-host).

On Cursor and Codex it first works out which host it is running in, then reads
that host's own setup guide.
:::

## What it creates

| Output | Purpose | Claude Code | Cursor | Codex |
| --- | --- | --- | --- | --- |
| Entry file | Root instructions — architecture, conventions, intent routing | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| Rules | Conventions the agent must follow | `.claude/rules/` | `.cursor/rules/*.mdc` | nested `AGENTS.md` |
| Skills | Repo-specific procedures | `.claude/skills/` | `.cursor/skills/` | `.agents/skills/` |
| Agents | Specialist agents, plus shared `git` and `code-reviewer` | `.claude/agents/` | `.cursor/agents/` | `.codex/agents/*.toml` |
| Commands | Repo-specific commands | `.claude/commands/` | `.cursor/commands/` | none — a skill instead |
| Hooks | Automated behaviours | `.claude/settings.json` | `.cursor/hooks.json` | `.codex/hooks.json` |

## Safe re-runs

Every generated file carries a `generated_by` marker — YAML frontmatter for
markdown files, an HTML comment for `CLAUDE.md` and `AGENTS.md`, and a pair of
TOML keys for Codex's `.codex/agents/*.toml`. On re-run the marker decides
what happens:

| Marker state | Behaviour |
| --- | --- |
| Present, version current | Safe to refresh |
| Present, version older | Stale — proposes a refresh, asks before overwriting |
| Missing or edited | Treated as yours — gaps filled, never overwritten |

==Remove or edit the marker on any file you want left alone permanently.==

## Monorepos

In a monorepo it creates a root entry file (`CLAUDE.md` or `AGENTS.md`) with
shared rules and global agents, then a separate one per app with app-specific
rules, skills, and specialist agents.

## Graphify

During exploration, `/slashforge-setup` checks language fit for
[Graphify](/slashforge/guides/graphify/). If at least 70% of
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
| Generation | Writing the entry file, rules, skills, agents, commands and hooks. **Output tokens**, a dozen or more files. |

Accepting the [Graphify](#graphify) offer adds roughly **5–15k** for
synthesising `SUMMARY.html`.

A small, conventional repo lands near 50k. A large polyglot one with several
distinct subsystems — more to read, and more rules worth writing — approaches
the top.

## What it does not do

==It does not write application code, create branches, or open PRs. It only
produces configuration.== Use [`/slashforge-code`](/slashforge/commands/slashforge-code/)
for development work.
