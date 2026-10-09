---
name: /slashforge-refactor
description: Refactor code with a zero-functional-change guarantee — gated by the existing test suite passing with identical results before and after. Structure only: no behaviour, API, or feature changes.
---

## What this command is

`/slashforge-refactor` improves the structure of existing code while proving its
behaviour does not move. It inherits the base ten-phase workflow in
`slashforge-workflow.md` but **mutates it** with a zero-functional-change rule and a
test-suite baseline gate: the existing suite must pass with **identical** results
before and after. Use it to reshape code safely. For a change that should alter
behaviour, use `/slashforge-code`.

## Step 0 — Target resolution (do this first)

Resolve what to refactor from the argument:

1. **An argument** → the file(s)/glob to refactor, optionally with a description of
   the structural goal. Strip a leading `@` or `#`.
2. **No argument** → ask: *"What should I refactor, and what structural improvement
   are you after?"*

Announce the target and the intent, then begin with the baseline gate:

> *"Refactoring `<target>` with a zero-functional-change guarantee. First I'll
> establish a green test baseline; I won't change any behaviour, API, or test."*

## Workflow files

Read the following in full — together they are your complete workflow guide:

- /HOME/.claude/setup/slashforge/slashforge-workflow.md
- /HOME/.claude/setup/slashforge/slashforge-workflow-refactor.md
- /HOME/.claude/setup/slashforge/slashforge-workflow-test.md
- /HOME/.claude/setup/slashforge/slashforge-workflow-agents.md

Read `slashforge-workflow.md` for the base phases, then apply every override in
`slashforge-workflow-refactor.md` on top of it. `slashforge-workflow-test.md` is
the flow the baseline gate auto-runs when coverage over the target is missing. You
MUST follow every phase in order; do not skip phases beyond the ones the refactor
overrides explicitly change.

## The phase mutations, in brief

The refactor overrides (full detail in `slashforge-workflow-refactor.md`) are:

- **Phase R0 — Baseline gate:** run the existing suite over the target and record
  the green baseline. Refuse on an already-red suite. If coverage is absent (or has
  no happy-path/edge-case assertions for the target), auto-run the `/slashforge-test`
  flow first; if that surfaces a bug, halt and route to `/slashforge-fix`.
- **Phases 1–2:** no `slashforge-brainstorm`; a lean, structure-only plan asserting
  no behaviour/API/test change.
- **Phase 5 — Implement:** structural edits only; **never** add or modify test files.
- **Phase 6 — Verify:** re-run the **same** suite; results must be **identical** to
  the baseline or the gate fails.
- **Phase 7 — Review:** the `code-reviewer` rejects any functional/API change.
- **Phase 8 — Docs:** skip the user-facing `CHANGELOG.md` feature entry.

**Mandatory gates** — stop and wait for the user, same as `/slashforge-code`:
1. **Phase 3** — plan confirmation
2. **Phase 4** — branch decision (same / new + base + name)
3. **Phase 8** — PR target branch and reviewers
4. **Phase 10** — branch cleanup after merge

**Skills per phase (use the `Skill` tool, do not paraphrase). All ship with SlashForge:**
- Phase 2 — `slashforge-plan` (lean, structure-only)
- Phase 6 — `slashforge-verify` (re-run the baseline suite; results must match)
- Phase 7 — `slashforge-request-review`, then the `code-reviewer` agent against the zero-functional-change override
- Phase 8 — the `git` agent (no skill; Phases 8 and 10 are SlashForge's own flow)
- Phase 9 — `slashforge-review-feedback`
- Phase 10 — (no skill; the `git` agent handles the cleanup)

Follow the workflow files as the source of truth for phase details and success criteria.
