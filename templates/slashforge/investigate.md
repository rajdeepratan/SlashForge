---
name: /slashforge:investigate
description: Research-only flow — reproduce and root-cause a bug or suspected issue. Produces a findings report. No branch, no PR, no code changes.
---

## Workflow files

Read the following in full — together they are your complete workflow guide:

- {{INSTALL_PATH}}/forge-workflow-investigation.md
- {{INSTALL_PATH}}/forge-workflow-agents.md

You MUST follow every phase in order. Do not skip phases. Do not combine phases.

## Read-only guarantee

This command is **read-only**. Do not edit application code. Do not create branches. Do not open
PRs. The deliverable is a findings report. Scratch files, temporary test files in a sandboxed
location, and logging are fine — but nothing PR-bound.

## Entry

The argument (if any) may be:

- A free-form symptom description
- A bug report or issue reference
- Nothing → ask: **"What's the symptom you want me to investigate?"**

Then begin Phase I1 — the workflow guide handles intake, the read-only investigation, and the
report.

## Phases

- **I1 — Investigation Intake:** parse input, extract expected vs. actual behaviour, ask clarifying questions until the scope is clear
- **I2 — Investigate (read-only):** reproduce, bisect, trace, read code. Consults the code graph when Graphify is installed. **No edits to application code**
- **I3 — Report & hand-off:** write the findings report, open it, summarise in chat, hand off to `/slashforge:code`

**Skills per phase (use the `Skill` tool, do not paraphrase). It ships with SlashForge:**
- Phase I2 — `slashforge:debug`

## The deliverable

A findings report at `docs/slashforge/investigations/investigation-<YYYY-MM-DD-HHMM>.html` — five
sections, written as a body fragment and spliced into the shipped report shell. Never regenerate
the shell's CSS, and never write the report under `.claude/`, which is hidden in Finder.

**Summarise in chat — never print the HTML.** The file is the report; the chat gets the one-line
conclusion, the root cause, the path, and the hand-off line. Phase I3 carries the fragment spec,
the splice command, the open helper and the exact hand-off wording.

Follow the workflow file as the source of truth for phase details and success criteria.
