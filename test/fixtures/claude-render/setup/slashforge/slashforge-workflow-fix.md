---
name: SlashForge Workflow — Fix Overrides
description: Overrides applied on top of the standard workflow when /slashforge-fix runs. Ingests a structured investigation, skips discovery, locks context to the implicated files, enforces a regression test before the patch, and hard-fails verification if no test was added.
---

# Fix Flow Overrides

Read only when `/slashforge-fix` is running. Apply these overrides on top of `slashforge-workflow.md`
and `slashforge-workflow-agents.md`. Every phase not overridden here runs exactly as the base
workflow describes — including all four user gates and the Phase 6 verification loop.

`/slashforge-fix` exists to close the loop between `/slashforge-investigate` (read-only, finds the
root cause) and shipping a patch, **without** paying for the full feature-planning phases. The bug
is already understood; this flow writes the regression test and the fix, nothing more.

## The investigation contract

The flow is driven by a structured artifact `/slashforge-investigate` writes to
`.slashforge/latest_investigation.json`. Every key is required:

```json
{
  "run_id": "<issue-slug>",
  "reproduction_steps": ["string", "..."],
  "root_cause": "string",
  "implicated_files": [
    { "filepath": "path/to/file.ts", "line_numbers": [42, 118] }
  ],
  "suggested_approach": "string"
}
```

- **`reproduction_steps`** drive the regression test — each entry is a step that triggers the bug.
- **`implicated_files`** are the *entire* editable surface for this run. The fix does not read or
  change a file that is not listed. A test file created for the fix is allowed even if it was not
  listed — tests are an output of the flow, not part of the investigated surface.
- **`suggested_approach`** is a proposal, not an approved plan. Phase 2 still produces a real plan
  and Phase 3 still gates on the user.

`.slashforge/` is machine-local run state and belongs in `.gitignore`.

---

## Phase 0 — Ingestion (replaces Freeform Intake)

Handled by `fix.md` Step 0: read and validate `.slashforge/latest_investigation.json` (or ingest
`--issue <url>`). The contract replaces the "What do you want to build, fix, or change?" question
entirely — never ask the user to retype what the investigation already states.

---

## Phase 1 — Setup / Discovery: **SKIPPED**

The base workflow's Phase 1 (`slashforge-brainstorm`, requirements gathering) and its pre-plan
discovery do not run.

- **Do not invoke `slashforge-brainstorm`.** There is no `requirements.md` for a fix run; the
  contract is the requirements source.
- **Do not run the pre-plan graph/coverage checks** (`slashforge-graph.md`, `slashforge-coverage.md`).
  A scoped bug fix does not introduce a new domain, and discovery is exactly what this flow skips.
- **Lock context to `implicated_files`.** Read those files (and their existing tests) and nothing
  else. If, while patching, you find the real fix must touch a file the contract did not list, that
  is a signal the investigation was incomplete: **stop and tell the user**, naming the extra file
  and why, rather than silently widening scope. The user can approve the wider scope or re-run
  `/slashforge-investigate`.

Reuse the investigation's `run_id` — the issue slug — as the `<change-slug>` here (Phase 1 normally
picks one): the investigation already created `docs/slashforge/active/<issue-slug>/investigation.md`,
so Phase 2 writes `plan.md`/`tasks.md` into that **same** folder and Phase 10 archives it whole.

---

## Phase 2 — Plan: **Test-Driven Development enforced**

Produce a plan with `slashforge-plan`, written to `docs/slashforge/active/<change-slug>/plan.md` +
`tasks.md` in the **lean plan format** (Changes + Test strategy; add another section only if it
genuinely applies). There is no `requirements.md`.

The plan **must** open with a regression test, before any production change:

1. **Regression test first.** The first task is always: write a test that reproduces the
   `reproduction_steps` and therefore **fails** against the current (buggy) code. Name the test
   file in the plan's Changes.
2. **Then the patch.** The production change addresses the `root_cause`, not just the visible
   symptom, informed by `suggested_approach`.
3. **Then confirm red → green.** The test must be observed failing before the patch and passing
   after.

`tasks.md` therefore starts with the failing-test steps:

```markdown
## Task 1: regression test
- [ ] Step 1: write the test reproducing the bug
- [ ] Step 2: run it, confirm it FAILS for the right reason
## Task 2: fix
- [ ] Step 3: patch the root cause in the implicated files
- [ ] Step 4: run the test, confirm it PASSES
- [ ] Step 5: run the full suite + lint + build
```

Present the plan in full and stop at the **Phase 3 gate** — the user confirms before any code is
written, same as `/slashforge-code`.

---

## Phases 3 & 4 — Gates unchanged

Plan confirmation (Phase 3) and the branch decision (Phase 4) run exactly as the base workflow
describes. A fix is still code going to a branch; the gates still apply.

---

## Phase 5 — Implement: always `slashforge-debug`

A fix run is a bug flow by construction, so Phase 5 always invokes `slashforge-debug`: reproduce,
confirm the regression test fails, patch the root cause in the implicated files, confirm the test
passes. Never pick `slashforge-parallel`, and never "straight implement" without a test — the whole
flow is red → green.

---

## Phase 6 — Verify: **hard test-diff check**

Run the base Phase 6 verification (lint, test, build, convergence) **and** add a hard gate at the
front of it:

> **If the diff from the branch point (the base commit, before Phase 5) to the working tree adds or
> modifies no test file, the run fails immediately.**

```bash
# Files changed since the branch point, filtered to tests. Adjust the pattern to the
# repo's test layout (the plan's Test strategy names the file you added).
git diff --name-only "<baseline_commit>"...HEAD | grep -Ei '(^|/)(test|tests|spec|__tests__)/|\.(test|spec)\.[a-z]+$'
```

If that comes back empty, print `FIX FAILED: no regression test was added or modified.` and return
to Phase 5 — do not proceed to review. A fix with no test is indistinguishable from a claim that
the bug is gone. This check is in addition to, not a replacement for, the base workflow's bugfix
rule that the regression test must be seen failing before the fix and passing after.

---

## Phases 7–10 — Base workflow unchanged

Code review (Phase 7, including the security audit), push & PR (Phase 8, including the documentation
sweep), PR feedback (Phase 9) and post-merge cleanup with archival (Phase 10) all run exactly as
`slashforge-workflow.md` describes. The fix flow only mutates the front of the pipeline; the tail is
the same shipping flow as every other change.
