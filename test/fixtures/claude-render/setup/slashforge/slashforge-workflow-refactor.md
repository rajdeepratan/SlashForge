---
name: SlashForge Workflow — Refactor Overrides
description: Overrides /slashforge-refactor applies on top of the base workflow — a zero-functional-change rule gated by a green test suite before and after, with review and documentation overrides.
---

# Refactor Overrides

Loaded by `/slashforge-refactor` **on top of** `slashforge-workflow.md`. Read the
base workflow first, then apply every override here. The defining rule:

> **Zero-functional-change.** A refactor changes structure only — never behaviour,
> never a public API, never a feature. It is proven by the existing test suite
> passing with **identical** results before and after.

Use `/slashforge-refactor` to improve the shape of code whose behaviour must not
move. For a change that *should* change behaviour, use `/slashforge-code`.

---

## Phase R0 — Baseline gate (before any edit)

A zero-functional-change guarantee is only meaningful against a known-green
baseline. Before touching anything:

1. **Discover and run the existing test suite** over the target (framework
   discovery as in `slashforge-workflow-test.md` Phase T1). Record the result as
   the **baseline** — the exact set of passing tests.
2. **If the suite is already red**, refuse: *"The suite is red before any change,
   so I can't establish a zero-functional-change baseline. Fix the failing tests
   first (`/slashforge-fix`), then re-run `/slashforge-refactor`."* Stop.
3. **If coverage over the target is absent**, or you cannot identify specific
   happy-path **and** edge-case assertions for the target functions in the adjacent
   test files, **auto-run the `/slashforge-test` flow** (`slashforge-workflow-test.md`)
   to build the net first. Announce that you are doing so.
   - If that flow surfaces failing tests (a pre-existing bug), **halt and report** —
     you cannot refactor on red. It has already written the investigation contract;
     route the user to `/slashforge-fix`, then retry the refactor once green.
4. Only once a green baseline exists over the target do you proceed.

---

## Phase R1–R2 — Intake & plan

- **Intake:** resolve the target and the refactor's intent (what structure
  improves, and why). No `slashforge-brainstorm` — a refactor adds no behaviour to
  design.
- **Plan (`slashforge-plan`, lean):** describe the structural change only —
  what moves where, what is extracted or renamed. The plan must assert **no**
  change to public APIs, exports, behaviour, or tests. List the baseline test
  command so Phase R6 re-runs exactly it.

Phases 3 and 4 (plan confirmation, branch decision) run unchanged — refactoring
edits code, so it branches and opens a PR.

---

## Phase R5 — Implement (structure only)

- Make structural edits only: extract, inline, rename, move, de-duplicate,
  reshape. **Do not add or modify test files** — the tests are the invariant that
  proves behaviour did not move; editing them would void the guarantee. (A test
  that must change means behaviour changed — stop; this is not a refactor.)
- No new dependencies, no new public surface, no behavioural "while I'm here"
  fixes. A genuine bug found mid-refactor is a finding to raise, not to fix here.

---

## Phase R6 — Verify (identical before/after)

Re-run the **same** suite recorded in the baseline. The gate passes only if the
results are **identical** to the baseline — the same tests pass, none newly fail,
and behaviour is unchanged. Any new failure, changed assertion outcome, or
behavioural diff **fails** the gate: revert or correct the structure until the
results match the baseline exactly. The base Phase 6 retry/abort loop applies.

---

## Phase R7 — Review override

Run Phase 7 as normal, but the `code-reviewer` agent is prompted **specifically**
to enforce the zero-functional-change rule rather than the base checklist's
feature-completeness expectation:

- **Reject** the change if any feature addition, behavioural change, or public-API
  / export / signature change is detected.
- Confirm no test file was altered to accommodate the new structure.
- Otherwise apply the usual quality checks (duplication, dead code, conventions).

---

## Phase R8 — Documentation override

A zero-functional-change refactor has nothing to announce in user-facing release
notes. In the Phase 8 documentation sweep:

- **Skip the user-facing `CHANGELOG.md` feature entry** — do not add an `Added` or
  `Changed` line describing new behaviour, because there is none.
- At most, record an internal/chore note (e.g. under an internal "Maintenance"
  heading) if the project keeps one. Never present a refactor as a user-facing
  change.
- README/API docs need no update, since the public surface did not move.

---

## Gates & skills

**Mandatory gates** (unchanged from `/slashforge-code`): Phase 3 (plan
confirmation), Phase 4 (branch decision), Phase 8 (PR target + reviewers), Phase 10
(branch cleanup).

**Skills per phase.**
Invoke each via the `Skill` tool — do not paraphrase.
Phase 2 — `slashforge-plan` (lean, structure-only); Phase 5 — structural edits, no
new tests; Phase 6 — `slashforge-verify` (re-run the baseline suite); Phase 7 —
`slashforge-request-review` then the `code-reviewer` override above. Phases 8 and
10 are the `git` agent's branch-completion flow.
