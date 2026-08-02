---
title: Introduction
description: What SlashForge is, what it installs, and who it is for.
---

SlashForge installs workflow slash commands into AI coding agents. The commands
impose a disciplined development process — ten phases from intake to a merged
PR, with four points where the agent stops and waits for you — rather than
letting it freewheel from prompt to patch.

> It is guardrails, not autocomplete.

## What gets installed

Two things land on your machine:

| What | Where |
| --- | --- |
| Guide files | `~/.claude/setup/slashforge/` |
| Commands | `~/.claude/commands/slashforge/` |

The commands are thin. They point at the guide files, which carry the actual
workflow. That separation is why a command can change modes — `-quick` simply
loads one extra guide.

Commands live in a `slashforge/` subdirectory, which is what produces the
`/slashforge:` prefix and keeps them from colliding with commands you already
have.

## The vocabulary

`/slashforge:setup` generates five kinds of file into your repo. They are Claude
Code concepts rather than SlashForge inventions, but you will see the words
constantly, so:

| Term | What it is |
| --- | --- |
| `CLAUDE.md` | The root instruction file the agent reads first — architecture, conventions, and where to route a given kind of request |
| `rules/` | Conventions the agent must follow. Short, imperative, always in context |
| `skills/` | Repo-specific procedures — how to add a migration, how to ship a component |
| `agents/` | Specialist sub-agents invoked for one job, such as code review or git operations |
| `commands/` | Repo-specific slash commands, on top of the three SlashForge installs |
| `hooks/` | Automated behaviours that fire on an event, without being asked |

## The four commands

Each command owns one job, and nothing overlaps.

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
to `docs/slashforge/investigations/`. No branch, no PR, no code changes. It ends by handing the
report path to `/slashforge:code`, so the fix starts with the diagnosis already
loaded instead of you restating the bug.

### `/slashforge:review-pr`

Reviews someone's pull request against *your* repo's standards — `CLAUDE.md`,
`.claude/rules/`, and the conventions in the surrounding code — then posts
line-level comments or an approval. With no argument it lists the PRs waiting on
your review.

It never posts without showing you the exact text first, and never chooses
between `comment` and `request-changes` for you. Blocking someone's merge is your
call.

## Why the workflow matters

The gates are the point. An agent that plans, gets confirmation, then implements
produces reviewable work. An agent that goes straight from prompt to a large
diff produces something you have to audit line by line.

Phase 6 runs lint, tests, and build before anything reaches a PR — so
"it's done" means it was verified, not asserted.

Want to see it rather than read about it?
**[What a run looks like](/slashforge/guides/example-run/)** walks one pass from
prompt to gate, then one PR review from finding the work to posting it.

## What a run costs

Stated up front, because it is the first thing worth knowing before committing
to a workflow this heavy.

| Mode | Per feature |
| --- | --- |
| Full run | 100–250k tokens |
| Full run, with Graphify indexed | ~75–225k tokens |
| `-quick` | ~40–70k tokens |

The range is driven by the size of the feature, not by the tooling — a
single-module change lands near the bottom, a multi-layer feature near the top.
[Graphify](/slashforge/guides/graphify/) shaves roughly 4–10% off; it does not
change the order of magnitude. If you want a materially cheaper run, the lever
is `-quick`.

:::caution[Honest limit]
SlashForge is deliberately heavy. If what you want is a prompt turned into a
patch as fast as possible, this is the wrong tool. See
[Plan mode and /init](/slashforge/guides/plan-mode-and-init/) for where the
lighter option is the right call.
:::

## Superpowers

SlashForge integrates with the [superpowers](https://github.com/obra/superpowers)
plugin when installed, invoking a specific skill per phase — brainstorming for
intake, test-driven-development for implementation, and so on.

SlashForge ships every discipline skill the workflow uses, so no plugin is
required and none is checked for. See [Skills](/slashforge/guides/skills/) for
what runs at each phase.

## Supported tools

Claude Code today. Cursor and Codex are planned — the rename to the vendor-neutral
`/slashforge:` namespace in v3.0.0 was groundwork for exactly that.

