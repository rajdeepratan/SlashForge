---
title: /forge:setup vs /init
description: Claude Code ships with a built-in /init. The two are complementary, not competitors.
---

Claude Code ships with a built-in `/init` command. `/forge:setup` does not
replace it — they solve different problems.

## Side by side

| | `/init` (built-in) | `/forge:setup` |
| --- | --- | --- |
| **Creates** | `CLAUDE.md` only (or + skills/hooks with `CLAUDE_CODE_NEW_INIT=1`) | Full `.claude/` — rules, skills, agents, commands, hooks, plus `CLAUDE.md` |
| **Approach** | Discovers and suggests — opinion-light | Opinionated — enforces multi-agent layout, 200-line cap, global vs specialist split |
| **Agents** | None | Mandatory `developer`, `code-reviewer`, `git`, plus specialists |
| **Workflow** | None | `/forge:setup`, `/forge:code` (with `-quick` mode), `/forge:investigate` |
| **Monorepo** | Single-repo focused | Root + per-app `CLAUDE.md` |
| **Existing setup** | Suggests `CLAUDE.md` improvements | Full Update flow — reads all of `.claude/` and fills gaps |

## Which to use

**Use `/init`** for a lightweight starter `CLAUDE.md` on a personal project. It
is fast, unopinionated, and built in — nothing to install.

**Use `/forge:setup`** when the repo needs a disciplined `.claude/` layout,
specialist agents, or a defined team workflow. The opinionation is the point:
it produces the same structure every time, which is what makes it reviewable
across a team.

## Using both

They compose. Run `/init` first for a starter `CLAUDE.md`, then `/forge:setup`
in Update mode to enrich it — the Update flow reads what is already there and
fills gaps rather than overwriting.

Files `/forge:setup` did not generate carry no `generated_by` marker, so they
are treated as yours: edited to fill gaps, never overwritten. See
[`/forge:setup`](../../commands/forge-setup/) for how the markers work.
