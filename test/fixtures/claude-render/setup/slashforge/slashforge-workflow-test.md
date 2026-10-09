---
name: SlashForge Workflow — Test Flow
description: The read-and-write-tests flow used by /slashforge-test — framework discovery, spec-based test authoring, run, and report. A light, self-contained gear that never modifies production code.
---

# Test Flow

A short, self-contained flow used by `/slashforge-test`. It is **not** the base
ten-phase workflow: no brainstorm, no plan gate, no branch, no PR. Its job is to
raise test coverage for code that already exists and report what that coverage
reveals. It is also the flow `/slashforge-refactor` auto-runs to build a safety
net before refactoring (see `slashforge-workflow-refactor.md`).

This file is loaded by `/slashforge-test`.

---

## Phase T1 — Framework discovery (do this first)

Before writing a single test, learn how this repo tests — never guess the
framework or the run command (no writing Jest tests into a Vitest codebase).

1. **Read `CLAUDE.md` first.** If it prescribes a test framework, file-naming
   convention, test directory, and run command, use those verbatim.

2. **If none is prescribed there, infer from the repo:** the manifest's `test`
   script (e.g. `package.json`, `pyproject.toml`, `Cargo.toml`), the installed
   test dependencies, and the existing test files' imports and layout.
3. If the repo has no test setup at all and nothing prescribes one, stop and ask
   the user which framework to use rather than inventing one.

Announce the discovered framework, test location, and run command before writing.

---

## Phase T2 — Derive the intended behaviour

These are **spec-based** tests: they assert what the code *should* do, so a
failure exposes a bug rather than pinning a mistake in place.

Derive the intended behaviour of each target from its contract:

- function/method signatures and types
- docstrings and comments stating intent
- naming (a function called `isValidEmail` has an obvious contract)
- adjacent docs/README and any existing tests
- the caller sites — how the code is actually used

Where the intended behaviour is genuinely ambiguous — two readings are equally
plausible and the contract does not decide — **ask the user** rather than guess.
A test that encodes a guess is worse than no test.

---

## Phase T3 — Write the tests

Write spec-based tests in the discovered framework, in the conventional location
and naming for this repo. Cover the happy path and the edge cases the contract
implies (empty input, boundaries, error conditions).

This flow **never modifies production code.** It only adds tests. If making a test
pass would require touching the implementation, that is a finding for Phase T5,
not an edit to make here.

---

## Phase T4 — Run and report

Run the tests with the discovered command and read the output.

- **All green** → the behaviour is now covered. Report what was added and where.
- **Any red** → a **bug is surfaced**: the code does not meet its intended
  behaviour. Go to Phase T5. Do not change production code to make the test pass,
  and do not weaken the test to match the buggy behaviour.

---

## Phase T5 — Surface the bug (red path only)

When a spec-based test fails, the mismatch is a finding. Before exiting, leave the
artifact `/slashforge-fix` needs so the user can act on it immediately.

1. **Write the investigation contract** to `.slashforge/latest_investigation.json`
   (create `.slashforge/` if absent; it is gitignored). Write it with a tool that
   serialises JSON correctly, and include **every** required key — a partial
   contract fails `/slashforge-fix`'s Step 0 validation:

   ```json
   {
     "run_id": "test-<YYYY-MM-DD-HHMM>",
     "reproduction_steps": ["run <the failing test command>", "observe <expected> vs <actual>"],
     "root_cause": "Spec test surfaced a mismatch; root cause not yet analysed. Expected <X>, got <Y>.",
     "implicated_files": [{ "filepath": "path/to/target", "line_numbers": [] }],
     "suggested_approach": "Make <target> meet the asserted behaviour, or correct the spec if the assertion is wrong."
   }
   ```

   `reproduction_steps` are the steps that trigger the failing test — these become
   the regression test `/slashforge-fix` enforces. `implicated_files` must list the
   production file(s) under test **and** the new test file, since `/slashforge-fix`
   locks its context to exactly these.

2. **Report in chat:** the failing assertion (expected vs. actual), the file, and
   the one-line conclusion. Do not print the whole test file.

3. **Route the user:** recommend `/slashforge-fix` (reads the contract just
   written, patches test-first, scoped to the implicated files) or
   `/slashforge-code` for a larger change.

---

## Phase T6 — Hand off

This flow ends here. **No branch, no PR.** The new tests are left in the working
tree for the user to commit or route onward. Summarise:

- the targets covered and the framework used
- green: coverage added, suite still green
- red: the bug surfaced, the contract written, and the suggested next command

Never commit, branch, or open a PR from this flow — that is the user's call, or a
job for `/slashforge-code` / `/slashforge-fix`.
