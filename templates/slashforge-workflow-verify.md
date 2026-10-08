---
name: SlashForge Workflow — Verify Loop
description: Phase 6 localized retry micro-state machine for /slashforge-code and /slashforge-fix — the verification suite, the three-attempt localized patch loop, and the human-intervention gate with proceed/abort rollback. Loaded when a run reaches Phase 6.
---

# Phase 6 — Verify (localized retry loop)

Read when a `/slashforge-code` or `/slashforge-fix` run reaches Phase 6. The skill is
`slashforge-verify` — invoke it first; no success claims without evidence.

Phase 6 is a **localized micro-state machine**, not a single pass. A lint error or one failing test
is usually a typo or a missed import — a reason for a tight, constrained fix, not for crashing the
run or bouncing back to architectural replanning. The loop retries locally up to three times and
escalates to the user only when those are exhausted.

## Setup

1. Invoke `slashforge-verify`.
2. Record `baseline_commit` — the git SHA at the **start of Phase 6**, i.e. the state Phase 5 left
   behind (`git rev-parse HEAD`, or a `git stash create` snapshot if Phase 5's work is uncommitted).
   Initialise `max_retries = 3` and `current_attempt = 1`.
<!--target:claude-->
3. Verify that lint, test and build commands are defined in `CLAUDE.md`. If any are missing, ask the user for them before continuing.
<!--/target-->
<!--target:cursor-->
3. Verify that lint, test and build commands are defined in `AGENTS.md`. If any are missing, ask the user for them before continuing.
<!--/target-->
<!--target:codex-->
3. Verify that lint, test and build commands are defined in `AGENTS.md`. If any are missing, ask the user for them before continuing.
<!--/target-->
4. If new env vars were added, confirm they are in `.env.example` (or equivalent) before running anything.

## The verification suite

Run every step, in order, reading each output in full:

- **Lint / format** — zero errors.
- **Tests** — zero failures. **For bug fixes:** confirm the regression test **failed before the fix
  and passes after**; if it passed both times it does not cover the bug, so fix the test.
- **Build** — exit 0.
- **Converge against the spec** — every success criterion in
  `docs/slashforge/active/<change>/requirements.md` is individually met, and every step box in
  `tasks.md` is ticked. (The lean and trivial paths have no `requirements.md`; converge against the
  plan's Changes and `tasks.md` instead.)

## On success

Lint, tests, build and convergence all pass with evidence → proceed to Phase 7. Nothing less.

## On failure (any command exits non-zero, or convergence is not met)

- **`current_attempt <= max_retries`** → run **Localized Patch Generation** below, then
  `current_attempt += 1` and re-run the whole suite from the top.
- **`current_attempt > max_retries`** → run the **Human Intervention Gate** below. Do not keep
  retrying past three.

## Localized Patch Generation

A single-shot, tightly constrained fix — **not** a replan and **not** a return to Phase 5's full
implementation freedom. Work only from:

- the **Phase 2 plan** (read-only — you may not change it here),
- the **git diff of Phase 5** (and of any earlier Phase 6 attempts this run),
- the **stdout/stderr of the command that failed**.

Hold to this constraint exactly:

> *"You are in a localized fix loop. You may only edit the files implicated in this stack trace /
> failure output. Do not alter the Phase 2 Plan. Fix the error preventing the build from passing."*

Do not add behaviour, do not refactor beyond the failure, do not touch files the failure does not
implicate. Then re-run the suite.

## Human Intervention Gate

When the retries are exhausted (`current_attempt > max_retries`), **suspend execution** and print
exactly:

```
VERIFY FAILED: 3 consecutive test/build failures.
```

Summarise what failed on each attempt, then wait for the user to type one of:

- **`proceed`** — the user has fixed the code by hand. Reset `current_attempt = 1` and re-run the
  verification suite from the top.
- **`abort`** — roll the branch back to the pre-verify state and exit the run:

  ```bash
  git reset --hard <baseline_commit>
  ```

  This **discards every change since the start of Phase 6** — which is what `abort` means — so say
  so when offering the choice. After the reset, stop the run and hand back to the user.

Never infer `proceed` or `abort`; wait for the explicit word.
