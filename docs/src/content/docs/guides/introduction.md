---
title: Introduction
description: What SlashForge is, what it installs, and who it is for.
---

SlashForge installs workflow slash commands into AI coding agents. The commands
impose a disciplined development process — ==ten phases from intake to a merged
PR, with four points where the agent stops and waits for you== — rather than
letting it freewheel from prompt to patch.

> It is guardrails, not autocomplete.

## What gets installed

Two things land on your machine, for each agent:

| What | Claude Code | Cursor | Codex |
| --- | --- | --- | --- |
| Guide files | `~/.claude/setup/slashforge/` | `~/.agents/setup/slashforge/cursor/` | `~/.agents/setup/slashforge/codex/` |
| Commands | `~/.claude/commands/slashforge-<name>.md` | `~/.agents/skills/slashforge-<name>/` | `~/.agents/skills/slashforge-<name>/` |

Cursor and Codex share the same `~/.agents/skills/` folders; only their guides are separate.

The commands are thin. ==They point at the guide files, which carry the actual
workflow.== That separation is why a command can change modes — `-quick` simply
loads one extra guide.

Every command carries the `slashforge-` prefix, which keeps it from colliding
with commands you already have — and it is the same name on every host.

## The vocabulary

`/slashforge-setup` generates six kinds of file into your repo. They are concepts
all three agents share rather than SlashForge inventions, though each keeps them
in its own place:

| Term | What it is | Claude Code | Cursor | Codex |
| --- | --- | --- | --- | --- |
| Entry file | The root instruction file the agent reads first — architecture, conventions, and where to route a given kind of request | `CLAUDE.md` | `AGENTS.md` | `AGENTS.md` |
| Rules | Conventions the agent must follow. Short, imperative, scoped to the files they govern | `.claude/rules/` | `.cursor/rules/*.mdc` | nested `AGENTS.md` |
| Skills | Repo-specific procedures — how to add a migration, how to ship a component | `.claude/skills/` | `.cursor/skills/` | `.agents/skills/` |
| Agents | Specialist sub-agents invoked for one job, such as code review or git operations | `.claude/agents/` | `.cursor/agents/` | `.codex/agents/*.toml` |
| Commands | Repo-specific commands, on top of the four SlashForge installs | `.claude/commands/` | `.cursor/commands/` | none — a skill instead |
| Hooks | Automated behaviours that fire on an event, without being asked | `.claude/settings.json` | `.cursor/hooks.json` | `.codex/hooks.json` |

## The four commands

==Each command triggers one distinct workflow.==

### `/slashforge-setup`

One-time repo setup. Explores the codebase, asks clarifying questions in
batches, then ==creates the entry file plus tailored rules, skills, agents,
commands, and hooks in your agent's own layout==. Handles fresh repos and partial setups.

### `/slashforge-code`

The full ten-phase development workflow, ending in a merged PR. Four points
stop and wait for you: plan confirmation, branch decision, PR target, and
post-merge cleanup.

Pass `-quick` for lean mode on small changes — it skips brainstorming, uses a
two-section plan, and swaps the agent code review for an inline checklist.
==Every user gate and the lint/test/build verification stay.==

### `/slashforge-investigate`

Read-only research. Reproduces a bug, finds the root cause, and writes a report
to `docs/slashforge/investigations/`. ==No branch, no PR, no code changes.== It ends by handing the
report path to `/slashforge-code`, so the fix starts with the diagnosis already
loaded instead of you restating the bug.

### `/slashforge-review-pr`

Reviews someone's pull request against *your* repo's standards — the entry
file, your rules, and the conventions in the surrounding code — then posts
line-level comments or an approval. With no argument it lists the PRs waiting on
your review.

==It never posts without showing you the exact text first==, and never chooses
between `comment` and `request-changes` for you. Blocking someone's merge is your
call.

## Why the workflow matters

==The gates are the point.== An agent that plans, gets confirmation, then implements
produces reviewable work. An agent that goes straight from prompt to a large
diff produces something you have to audit line by line.

Phase 6 runs lint, tests, and build before anything reaches a PR — so
=="it's done" means it was verified, not asserted==.

Want to see it rather than read about it?
**[What a run looks like](/slashforge/guides/example-run/)** walks one pass from
prompt to gate, then one PR review from finding the work to posting it.

## What a run costs

Stated up front, because it is the first thing worth knowing before committing
to a workflow this heavy.

| Mode | Cost |
| --- | --- |
| `/slashforge-setup` | ~50–120k tokens, once per repo |
| Full run | 100–250k tokens per feature |
| Full run, with Graphify indexed | ~75–225k tokens |
| `-quick` | ~40–70k tokens per change |
| `/slashforge-investigate` | ~15–60k tokens per report |
| `/slashforge-review-pr` | ~15–70k tokens per review |

==The range is driven by the size of the feature, not by the tooling== — a
single-module change lands near the bottom, a multi-layer feature near the top.
[Graphify](/slashforge/guides/graphify/) shaves roughly 4–10% off; it does not
change the order of magnitude. If you want a materially cheaper run, the lever
is `-quick`.

:::caution[Honest limit]
SlashForge is deliberately heavy. ==If what you want is a prompt turned into a
patch as fast as possible, this is the wrong tool.== See
[Plan mode and /init](/slashforge/guides/plan-mode-and-init/) for where the
lighter option is the right call.
:::

## Skills

==SlashForge ships every discipline skill the workflow uses== — brainstorming for
intake, test-driven development for implementation, and so on. Nothing else needs
installing. See [Skills](/slashforge/guides/skills/) for what runs at each phase.

## Supported tools

==Claude Code, Cursor and Codex== — every command has the same `slashforge-` name on
all three; only Codex invokes it with `$` instead of `/`.

The same `npx slashforge` sets up Cursor and Codex as well. It writes
`.agents/skills/`, the directory both of them read.

Commands are spelled differently on each agent. Pick yours in the header and
every command in these docs changes to match — including `setup`, which runs on
all three agents and scaffolds each one's own layout rather than `.claude/`.

