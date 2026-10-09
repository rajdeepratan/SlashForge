# Light Gears (`/slashforge-test` + `/slashforge-refactor`) — Requirements

## Goal
Add two lightweight, standalone commands to the kit — `/slashforge-test` (generate
spec-based test coverage for existing files) and `/slashforge-refactor` (zero-
functional-change refactoring gated by a passing suite) — shipped together.

## Problem
Today the only code-shipping entry point is `/slashforge-code`'s full ten-phase
flow (and the bug-scoped `/slashforge-fix`). Two common, bounded tasks have no
right-sized gear:

- **Adding test coverage to code that already exists** forces the whole feature
  machinery — brainstorm, plan gate, PR flow — when all the user wants is tests.
- **Refactoring** has no command that *guarantees* behavior is unchanged; a user
  doing it through `/slashforge-code` gets planning ceremony but no built-in
  before/after safety gate.

## Behaviour

### `/slashforge-test <file|glob>`
- A light, self-contained flow — **not** the base ten-phase workflow.
- **Framework discovery first.** Reads `CLAUDE.md` (or `AGENTS.md`) to identify the
  repo's prescribed test framework, file-naming conventions, and run command. If
  none is prescribed there, infers them from the repo's manifest (the `test`
  script, installed test deps) and existing test files. Never guesses the framework
  or run command blind (e.g. no writing Jest tests into a Vitest codebase).
- Derives the target's **intended** behaviour from its contract (signatures,
  docstrings/types, naming, adjacent docs/README, existing tests). Where intent is
  genuinely ambiguous, it asks the user rather than guessing.
- Writes **spec-based** tests (assert what the code *should* do) in the discovered
  framework and conventional location.
- Runs them and reports:
  - **green** → the behaviour is now covered.
  - **red** → a **bug is surfaced**: report it as a finding (expected vs. actual)
    and do **not** modify production code. Before exiting, write a *complete, valid*
    investigation contract to `.slashforge/latest_investigation.json` — every
    required key (`run_id`, `reproduction_steps`, `root_cause`, `implicated_files`,
    `suggested_approach`), with the failing-test steps as `reproduction_steps` — so
    `/slashforge-fix` consumes it on its Step 0 instead of erroring on a missing
    contract. (A partial contract fails `/slashforge-fix`'s key validation, so it
    must be the full schema.) Then route the user to `/slashforge-fix`
    (recommended) or `/slashforge-code`.
- Ends there: no branch, no PR. Tests are left in the working tree for the user to
  commit or route onward.

### `/slashforge-refactor <file|glob|description>`
- Inherits the base workflow (`slashforge-workflow.md`) with refactor overrides,
  and enforces a **zero-functional-change** rule: no behaviour, public-API, or
  feature changes — structure only.
- **Baseline gate (before):** establish a green suite over the target.
  - If the existing suite is already **red**, refuse — a clean before-baseline
    can't be established.
  - If coverage over the target is **absent**, or if the agent cannot identify
    specific happy-path **and** edge-case assertions for the target functions in
    the adjacent test files, auto-run the `/slashforge-test` flow to build the net
    first. (This mechanical test replaces a subjective "thin" judgement.) If that
    surfaces failing tests (pre-existing bugs), **halt and report** — refactoring
    needs a green baseline; the user fixes first (`/slashforge-fix`) and retries.
- Refactors, then **re-runs the suite (after):** it must pass with results
  identical to the baseline. Any new failure, or any behavioural diff, fails the
  gate.
- **Phase 7 (Review) override:** the `code-reviewer` agent is prompted specifically
  to verify the zero-functional-change rule and to **reject** the change if any
  feature addition, behavioural change, or public-API change is detected — instead
  of the base checklist's feature-completeness expectation.
- **Phase 8 (Docs) override:** skip the user-facing `CHANGELOG.md` feature entry —
  a zero-functional-change refactor has nothing to announce in release notes. Any
  note is an internal/chore line at most, never an `Added`/`Changed` feature entry.
- Changes code, so it branches → PR with the usual mandatory gates (branch
  decision, PR target + reviewers, post-merge cleanup).

### Packaging (both)
- Both are **user-facing commands** → registered in `COMMAND_FILES`, so they
  appear in `meta.json`'s `commands`, the `status` output, and the docs site.
- Installed on every host (`claude`, `cursor`, `codex`, `skills`) with the usual
  per-host target blocks.

## Constraints & out of scope
- Honour every kit non-negotiable (`docs/slashforge/constitution.md`): zero runtime
  deps, ≤200-line guides (≤500 for a `SKILL.md`), balanced target blocks, and the
  pinned Claude render regenerated after template changes.
- `/slashforge-test` **never** modifies production code and **never** opens a PR.
- Not building a new test framework — tests are generated in the target repo's
  existing framework and style.
- No dynamic issue-tracker ingestion, no new runtime dependency, no change to the
  existing commands' behaviour.
- The commands are authored once in `templates/` and work across all four hosts;
  no host-specific command logic beyond the standard target blocks.

## Success criteria
- `node bin/install.js` installs `/slashforge-test` and `/slashforge-refactor` on
  every target; both appear in `meta.json`'s `commands` list and in `status`.
- `npm test` passes, including new coverage asserting both commands ship and
  install (the `spec-features.test.js` pattern) and that `GUIDE_FILES` /
  `COMMAND_FILES` registration is complete.
- The pinned Claude render (`test/fixtures/claude-render`) is regenerated from the
  new templates and its diff is intentional.
- The docs site documents both commands and `check-docs-facts.mjs` still passes.
- `/slashforge-refactor` demonstrably refuses on a red baseline and auto-runs the
  test flow when coverage is thin; `/slashforge-test` leaves the tree branch-free
  and reports a surfaced bug without touching production code.
