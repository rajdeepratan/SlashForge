---
title: Plan mode and /init
description: All three agents have a plan mode, and Claude Code and Codex also ship /init. Here is the line between those built-ins and SlashForge — and when you need neither.
---

These are the two things people reach for first, and the two objections worth
answering before anything else. Neither is a competitor exactly. ==The honest
framing is that SlashForge starts where both of them stop.==

## Plan mode

==Every agent SlashForge installs into has a plan mode.== It is a pause before
implementation: it drafts an approach, you approve it, and ==the agent then works
freely to the end.== That first gate is genuinely valuable — and it is the one gate
SlashForge shares. How you enter it differs a little per agent:

:::agent[claude]
In Claude Code, toggle plan mode with **Shift+Tab**.
:::

:::agent[cursor]
In Cursor, toggle plan mode with **Shift+Tab**. See Cursor's
[plan mode docs](https://cursor.com/docs/agent/plan-mode).
:::

:::agent[codex]
Codex added a plan mode in **v0.93.0**. Enter it with `/plan` or **Shift+Tab**. It
is gated behind an experimental feature — set `collaboration_modes = true` under
`[features]` in your `config.toml` if it does not appear.
:::

> **Plan mode gates the plan. SlashForge gates the plan, the branch, the PR, and
> the cleanup.**

==The difference is everything after approval.==

| | Plan mode | SlashForge |
| --- | --- | --- |
| **Gates** | One, at the plan | Four — plan, branch strategy, PR target, post-merge cleanup |
| **After approval** | Stops enforcing | Verification, code review, and PR phases still run |
| **Verification** | Not required | Phase 6 must pass lint, tests, and build — a failure stops the run before a PR exists |
| **Branch and PR** | Left to the conversation | Each is an explicit decision you answer |
| **Persistence** | Ephemeral — the next session starts cold | `/slashforge-setup` writes the entry file and your agent's rules, agents and hooks, so the next session starts informed |
| **Repeatability** | As consistent as that day's prompt | The phases run identically every time, for everyone on the team |

:::note[Not exclusive]
==You can use plan mode inside SlashForge.== Phase 2 is exactly where it fits — the
ten phases care that a plan was confirmed, not how you drafted it.
:::

## `/init`

A built-in `/init` is not universal: it exists on two of the three agents, and where
it does, it writes that agent's entry file.

:::agent[claude,codex]
Your agent ships a built-in `/init`, and it is good at what it does — it writes a
starter entry file (`CLAUDE.md` on Claude Code, `AGENTS.md` on Codex). The distinction
from setup is narrower than "which tool is better":

> **`/init` writes a file. `/slashforge-setup` installs a workflow.**

| | `/init` (built-in) | `/slashforge-setup` |
| --- | --- | --- |
| **Writes the entry file** | Yes | Yes |
| **Asks clarifying questions** | No — discovers and suggests | Yes, in batches, before writing anything |
| **Creates** | The entry file only | The whole layout — rules, skills, agents, commands, hooks, plus the entry file |
| **Approach** | Opinion-light | Opinionated — enforces multi-agent layout, 200-line cap, global vs specialist split |
| **Agents** | None | Mandatory `developer`, `code-reviewer`, `git`, plus specialists |
| **Monorepos** | Single-repo focused | Root plus an entry file per app |
| **Safe to re-run** | Suggests improvements to the entry file | Yes — `generated_by` markers decide what may be overwritten |
| **Installs a workflow** | No | Yes — `/slashforge-code` and its ten phases |

==The opinionation is the point.== It produces the same structure every time, which
is what makes the output reviewable across a team.
:::

:::agent[cursor]
Cursor has **no built-in `/init`**. Its nearest equivalent is
[`/slashforge-setup`](/slashforge/commands/slashforge-setup/), which asks its
questions and then writes `AGENTS.md` plus your `.cursor/` layout — rules, skills,
agents, commands and hooks — rather than an entry file alone.

> **A starter file is a head start. `/slashforge-setup` installs a workflow.**

Where a built-in `/init` on another agent would write just the entry file,
`/slashforge-setup` explores the codebase, asks clarifying questions in batches, and
generates the whole tailored layout — with `generated_by` markers that make a re-run
safe. ==The opinionation is the point:== it produces the same structure every time,
which is what makes the output reviewable across a team.
:::

## When you need neither

A small single-purpose repo. A script. A prototype you will delete next month.

==If nobody is going to review the output and nothing ships from it, plan mode
alone is the right amount of process== — the gates cost more than they save.

:::agent[claude,codex]
And `/init` is fast, unopinionated, and already installed.
:::

:::caution[Honest limit]
SlashForge is deliberately heavy. A full `/slashforge-code` run costs
[100–250k tokens](/slashforge/commands/slashforge-code/) and stops to ask you
four questions. ==If what you want is an agent that turns a prompt into a patch as
fast as possible, this is the wrong tool and it will annoy you.==
:::

## Using both

:::agent[claude,codex]
==They compose.== Run `/init` first for a starter entry file, then
`/slashforge-setup` — ==its Update flow reads what is already there and fills gaps
rather than overwriting==.
:::

:::agent[cursor]
==Start with `/slashforge-setup`.== With no built-in `/init` to seed the entry
file, setup is the first thing to run — ==its Update flow reads what is already
there and fills gaps rather than overwriting==.
:::

Files `/slashforge-setup` did not generate carry no `generated_by` marker, so
they are treated as yours: edited to fill gaps, never overwritten. See
[`/slashforge-setup`](/slashforge/commands/slashforge-setup/) for how the markers
work.
