---
title: Plan mode and /init
description: Claude Code ships both. Here is the line between them and SlashForge — and when you need neither.
---

These are the two things people reach for first, and the two objections worth
answering before anything else. Neither is a competitor exactly. The honest
framing is that SlashForge starts where both of them stop.

## Plan mode

Plan mode is a pause before implementation: it drafts an approach, you approve
it, and the agent then works freely to the end. That first gate is genuinely
valuable — and it is the one gate SlashForge shares.

> **Plan mode gates the plan. SlashForge gates the plan, the branch, the PR, and
> the cleanup.**

The difference is everything after approval.

| | Plan mode | SlashForge |
| --- | --- | --- |
| **Gates** | One, at the plan | Four — plan, branch strategy, PR target, post-merge cleanup |
| **After approval** | Stops enforcing | Verification, code review, and PR phases still run |
| **Verification** | Not required | Phase 6 must pass lint, tests, and build — a failure stops the run before a PR exists |
| **Branch and PR** | Left to the conversation | Each is an explicit decision you answer |
| **Persistence** | Ephemeral — the next session starts cold | `/slashforge:setup` writes `CLAUDE.md` and `.claude/`, so the next session starts informed |
| **Repeatability** | As consistent as that day's prompt | The phases run identically every time, for everyone on the team |

:::note[Not exclusive]
You can use plan mode inside SlashForge. Phase 2 is exactly where it fits — the
ten phases care that a plan was confirmed, not how you drafted it.
:::

## `/init`

Claude Code ships with a built-in `/init`, and it is good at what it does. The
distinction is narrower than "which tool is better":

> **`/init` writes a file. `/slashforge:setup` installs a workflow.**

| | `/init` (built-in) | `/slashforge:setup` |
| --- | --- | --- |
| **Writes `CLAUDE.md`** | Yes | Yes |
| **Asks clarifying questions** | No — discovers and suggests | Yes, in batches, before writing anything |
| **Creates** | `CLAUDE.md` only (or + skills/hooks with `CLAUDE_CODE_NEW_INIT=1`) | Full `.claude/` — rules, skills, agents, commands, hooks, plus `CLAUDE.md` |
| **Approach** | Opinion-light | Opinionated — enforces multi-agent layout, 200-line cap, global vs specialist split |
| **Agents** | None | Mandatory `developer`, `code-reviewer`, `git`, plus specialists |
| **Monorepos** | Single-repo focused | Root plus a `CLAUDE.md` per app |
| **Safe to re-run** | Suggests `CLAUDE.md` improvements | Yes — `generated_by` markers decide what may be overwritten |
| **Installs a workflow** | No | Yes — `/slashforge:code` and its ten phases |

The opinionation is the point. It produces the same structure every time, which
is what makes the output reviewable across a team.

## When you need neither

A small single-purpose repo. A script. A prototype you will delete next month.

If nobody is going to review the output and nothing ships from it, plan mode
alone is the right amount of process — the gates cost more than they save, and
`/init` is fast, unopinionated, and already installed.

:::caution[Honest limit]
SlashForge is deliberately heavy. A full `/slashforge:code` run costs
[100–250k tokens](/slashforge/commands/slashforge-code/) and stops to ask you
four questions. If what you want is an agent that turns a prompt into a patch as
fast as possible, this is the wrong tool and it will annoy you.
:::

## Using both

They compose. Run `/init` first for a starter `CLAUDE.md`, then
`/slashforge:setup` — its Update flow reads what is already there and fills gaps
rather than overwriting.

Files `/slashforge:setup` did not generate carry no `generated_by` marker, so
they are treated as yours: edited to fill gaps, never overwritten. See
[`/slashforge:setup`](/slashforge/commands/slashforge-setup/) for how the markers
work.

