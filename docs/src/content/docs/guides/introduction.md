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

Two things land on your machine. Where they go depends on your agent — pick yours
in the header:

:::agent[claude]
| What | Where |
| --- | --- |
| Guide files | `~/.claude/setup/slashforge/` |
| Commands | `~/.claude/commands/slashforge-<name>.md` |
:::

:::agent[cursor]
| What | Where |
| --- | --- |
| Guide files | `~/.agents/setup/slashforge/cursor/` |
| Commands | `~/.agents/skills/slashforge-<name>/` |
:::

:::agent[codex]
| What | Where |
| --- | --- |
| Guide files | `~/.agents/setup/slashforge/codex/` |
| Commands | `~/.agents/skills/slashforge-<name>/` |
:::

Cursor and Codex share the same `~/.agents/skills/` folders; only their guides are separate.

The commands are thin. ==They point at the guide files, which carry the actual
workflow.== That separation is why a command can change modes — `-quick` simply
loads one extra guide.

Every command carries the `slashforge-` prefix, which keeps it from colliding
with commands you already have — and it is the same name on every host.

## The vocabulary

`/slashforge-setup` generates six kinds of file into your repo. They are concepts
all three agents share rather than SlashForge inventions, though each keeps them
in its own place — shown here for the agent picked in the header:

:::agent[claude]
| Term | What it is | Where it lives |
| --- | --- | --- |
| Entry file | The root instruction file the agent reads first — architecture, conventions, and where to route a given kind of request | `CLAUDE.md` |
| Rules | Conventions the agent must follow. Short, imperative, scoped to the files they govern | `.claude/rules/` |
| Skills | Repo-specific procedures — how to add a migration, how to ship a component | `.claude/skills/` |
| Agents | Specialist sub-agents invoked for one job, such as code review or git operations | `.claude/agents/` |
| Commands | Repo-specific commands, on top of the six SlashForge installs | `.claude/commands/` |
| Hooks | Automated behaviours that fire on an event, without being asked | `.claude/settings.json` |
:::

:::agent[cursor]
| Term | What it is | Where it lives |
| --- | --- | --- |
| Entry file | The root instruction file the agent reads first — architecture, conventions, and where to route a given kind of request | `AGENTS.md` |
| Rules | Conventions the agent must follow. Short, imperative, scoped to the files they govern | `.cursor/rules/*.mdc` |
| Skills | Repo-specific procedures — how to add a migration, how to ship a component | `.cursor/skills/` |
| Agents | Specialist sub-agents invoked for one job, such as code review or git operations | `.cursor/agents/` |
| Commands | Repo-specific commands, on top of the six SlashForge installs | `.cursor/commands/` |
| Hooks | Automated behaviours that fire on an event, without being asked | `.cursor/hooks.json` |
:::

:::agent[codex]
| Term | What it is | Where it lives |
| --- | --- | --- |
| Entry file | The root instruction file the agent reads first — architecture, conventions, and where to route a given kind of request | `AGENTS.md` |
| Rules | Conventions the agent must follow. Short, imperative, scoped to the files they govern | nested `AGENTS.md` |
| Skills | Repo-specific procedures — how to add a migration, how to ship a component | `.agents/skills/` |
| Agents | Specialist sub-agents invoked for one job, such as code review or git operations | `.codex/agents/*.toml` |
| Commands | Repo-specific commands, on top of the six SlashForge installs | none — a skill instead |
| Hooks | Automated behaviours that fire on an event, without being asked | `.codex/hooks.json` |
:::

## The spec home

Alongside that configuration, SlashForge keeps a Markdown **spec home** in your
repo at `docs/slashforge/` — the source of truth the workflow reads and writes: a
`constitution.md` of non-negotiables, an `architecture.md`, a `status.md`, and a
folder per change under `active/` holding its `requirements.md`, `plan.md` and
`tasks.md`. ==`/slashforge-code` fills these as it runs and moves each change to
`archive/` on merge==, so the specs stay current and diff in a pull request
rather than going stale. The same layout on every host — see
[the spec home](/slashforge/commands/slashforge-setup/#the-spec-home).

## The six commands

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

### `/slashforge-fix`

Patches a bug straight from an investigation. Reads the finding
`/slashforge-investigate` left behind, ==locks its context to the implicated files, and
writes a regression test before the patch== — the tight investigate → fix loop, without a
full feature-planning phase. For a change big enough to need planning, use `/slashforge-code`.

### `/slashforge-investigate`

Read-only research. Reproduces a bug, finds the root cause, and writes a report
to `docs/slashforge/investigations/`. ==No branch, no PR, no code changes.== It ends by
offering `/slashforge-fix` (or `/slashforge-code`), so the fix starts with the diagnosis
already loaded instead of you restating the bug.

### `/slashforge-review-pr`

Reviews someone's pull request against *your* repo's standards — the entry
file, your rules, and the conventions in the surrounding code — then posts
line-level comments or an approval. With no argument it lists the PRs waiting on
your review.

==It never posts without showing you the exact text first==, and never chooses
between `comment` and `request-changes` for you. Blocking someone's merge is your
call. A dual-track security audit runs on the diff; any blocking finding gets its own
`SECURITY FINDINGS` header.

### `/slashforge-resume`

Resumes an interrupted `/slashforge-code` or `/slashforge-fix` run. The workflow writes a
checkpoint after every phase; this ==verifies the git HEAD still matches, then re-enters at
the next phase== instead of starting over.

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
| `/slashforge-fix` | tracks the base workflow for a small, scoped change |
| `/slashforge-investigate` | ~15–60k tokens per report |
| `/slashforge-review-pr` | ~15–70k tokens per review |
| `/slashforge-resume` | cheap — reads one checkpoint and continues |

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

