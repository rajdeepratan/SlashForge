---
name: /slashforge-test
description: Generate spec-based test coverage for existing files — a light, standalone flow with no full feature machinery. Discovers the repo's test framework, writes tests, runs them, and reports; surfaces bugs as findings without touching production code.
---

## What this command is

`/slashforge-test` raises test coverage for code that **already exists**. It is a
light, self-contained gear — **not** the base ten-phase workflow. It discovers how
the repo tests, derives each target's *intended* behaviour, writes **spec-based**
tests (asserting what the code should do), runs them, and reports. A failing test
means a bug is surfaced, not that the test should bend to the code. This command
**never modifies production code** and **never opens a PR**.

For a bug you already understand, use `/slashforge-fix`. For a change big enough to
need planning, use `/slashforge-code`.

## Step 0 — Target resolution (do this first)

Resolve what to cover from the argument:

1. **An argument** → the file(s) or glob to cover. Strip a leading `@` or `#` —
   users paste those out of habit.
2. **No argument** → ask: *"Which file(s) do you want me to generate test coverage
   for?"*

## Workflow files

Read the following in full — together they are your complete guide:

- {{INSTALL_PATH}}/slashforge-workflow-test.md
- {{INSTALL_PATH}}/slashforge-workflow-agents.md

Follow `slashforge-workflow-test.md` phase by phase: discover the framework, derive
the intended behaviour, write the tests, run them, and report. On a red result,
write the full `.slashforge/latest_investigation.json` contract and route the user
to `/slashforge-fix` — see the Test Flow's red path.

Announce the resolved targets and the discovered framework before writing, then run
the flow. This command leaves its new tests in the working tree: no branch, no PR,
no edits to production code.
