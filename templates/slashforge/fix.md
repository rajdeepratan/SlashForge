---
name: /slashforge-fix
description: Fix a bug straight from a `/slashforge-investigate` finding — reads `.slashforge/latest_investigation.json`, locks context to the implicated files, writes a regression test first, then patches. The tight investigate → code loop, with no full-feature planning phase.
---

## What this command is

`/slashforge-fix` bridges the read-only `/slashforge-investigate` command to the code-generation
pipeline. It inherits the base ten-phase workflow in `slashforge-workflow.md` but **mutates the
early phases**: it ingests a structured investigation instead of gathering requirements, skips
discovery, locks its context to the files the investigation implicated, and enforces
Test-Driven Development. Use it when a bug is already understood — a root cause is in hand and you
want it patched. For a change big enough to need planning, use `/slashforge-code` instead.

## Step 0 — Ingestion (do this first)

Resolve the investigation to fix, in this order:

1. **No argument (the expected form)** → read `.slashforge/latest_investigation.json`, the artifact
   `/slashforge-investigate` wrote on its last run. This is the investigation contract. If the file
   is missing, stop and tell the user: *"No `.slashforge/latest_investigation.json` found. Run
   `/slashforge-investigate` first, or pass `--issue <url>`."* Do not fall back to guessing.
2. **`--issue <url>`** → reserved for future dynamic ingestion of an issue tracker URL. If passed,
   fetch the issue and derive the same contract fields from it before continuing. If dynamic
   ingestion is not yet wired up in this repo, say so and ask the user to run
   `/slashforge-investigate <url>` first, which produces the contract this command reads.

Strip a leading `@` or `#` before resolving an argument — users paste those out of habit.

Validate the contract before using it. It must carry `run_id`, `reproduction_steps`, `root_cause`,
`implicated_files` and `suggested_approach` (see `slashforge-workflow-fix.md` for the schema). If a
required key is missing or malformed, stop and say which — a half-formed contract is not something
to patch against.

Announce what you loaded and the scope you are locked to, then begin:

> *"Loaded investigation `<run_id>`. Root cause: [one line]. Fixing test-first, scoped to:
> `<file>`, `<file>` … Say 'stop' to abort."*

## Workflow files

Read the following in full — together they are your complete workflow guide:

- {{INSTALL_PATH}}/slashforge-workflow.md
- {{INSTALL_PATH}}/slashforge-workflow-fix.md
- {{INSTALL_PATH}}/slashforge-workflow-agents.md

Read `slashforge-workflow.md` for the base phases, then apply every override in
`slashforge-workflow-fix.md` on top of it. You MUST follow every phase in order. Do not skip phases
beyond the ones the fix overrides explicitly skip. Do not combine phases.

## The phase mutations, in brief

The fix overrides (full detail in `slashforge-workflow-fix.md`) are:

- **Phase 0 — Ingestion:** the step above. The investigation contract *is* the requirements source;
  there is no freeform intake question.
- **Phase 1 — Setup / Discovery: SKIPPED.** Context is locked to the contract's `implicated_files`.
  Do not explore the wider codebase; do not run `slashforge-brainstorm`.
- **Phase 2 — Plan (TDD-enforced):** the plan **must** write a regression test reproducing the
  `reproduction_steps` before any production code is patched.
- **Phases 3, 4** — plan confirmation and branch decision gates run unchanged.
- **Phase 5 — Implement:** always `slashforge-debug` (this is a bug flow by construction) — write the
  failing regression test first, watch it fail, then patch until it passes.
- **Phase 6 — Verify (hard test-diff check):** if the diff since the branch point adds or modifies
  **no** test file, the run fails immediately — a fix with no regression test is not a fix.
- **Phases 7–10** — review, push/PR, feedback and cleanup run as in the base workflow.

**Mandatory gates** — stop and wait for the user at these points, same as `/slashforge-code`:
1. **Phase 3** — plan confirmation
2. **Phase 4** — branch decision (same / new + base + name)
3. **Phase 8** — PR target branch and reviewers
4. **Phase 10** — branch cleanup after merge

**Skills per phase (use the `Skill` tool, do not paraphrase). All of them ship with SlashForge:**
- Phase 2 — `slashforge-plan` (lean plan format, TDD-first — see the fix overrides)
- Phase 5 — `slashforge-debug` (always; never `slashforge-parallel`, never plain implement)
- Phase 6 — `slashforge-verify`
<!--target:claude-->
- Phase 7 — `slashforge-request-review`, then the `code-reviewer` agent against the Phase 7 checklist
- Phase 8 — the `git` agent (no skill; Phases 8 and 10 are SlashForge's own flow)
- Phase 9 — `slashforge-review-feedback`
- Phase 10 — (no skill; the `git` agent handles the cleanup)
<!--/target-->
<!--target:agents-->
- Phase 7 — `slashforge-request-review`, then review the diff yourself against the Phase 7 checklist
- Phase 8 — push and open the PR directly (no skill; Phases 8 and 10 are SlashForge's own flow)
- Phase 9 — `slashforge-review-feedback`
- Phase 10 — (no skill; do the branch cleanup directly)
<!--/target-->

Follow the workflow files as the source of truth for phase details and success criteria.
