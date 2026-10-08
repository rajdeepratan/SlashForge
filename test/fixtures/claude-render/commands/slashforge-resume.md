---
name: /slashforge-resume
description: Resume an interrupted /slashforge-code or /slashforge-fix run from its last checkpoint — reads `.slashforge/run_<id>.ckpt.json`, verifies the git HEAD still matches, and re-enters the workflow at the next phase instead of starting over.
---

## What this command is

Long workflow runs get interrupted — a crashed session, a closed terminal, a context reset. Without
a checkpoint, the only option is to start `/slashforge-code` (or `/slashforge-fix`) again from
Phase 1 and redo work that already landed. `/slashforge-resume` reads the checkpoint the workflow
writes at the end of every successful phase and continues from there.

This command only *resumes* a run. It never starts one, and it never re-does a phase that already
completed — it re-enters at `current_phase + 1`.

## Step 0 — Load the checkpoint (do this first)

Read the workflow files, then resolve the checkpoint:

- /HOME/.claude/setup/slashforge/slashforge-workflow-resume.md
- /HOME/.claude/setup/slashforge/slashforge-workflow.md
- /HOME/.claude/setup/slashforge/slashforge-workflow-agents.md

Resolve which checkpoint to resume, in this order:

1. **A `run_<id>` argument** (or a path to a `.ckpt.json`) → resume exactly that checkpoint.
2. **No argument** → read the most recently modified `.slashforge/run_*.ckpt.json`.

```bash
ls -t .slashforge/run_*.ckpt.json 2>/dev/null | head -1
```

If no checkpoint exists, stop and tell the user: *"No checkpoint found under `.slashforge/`. There is
nothing to resume — start a fresh `/slashforge-code` or `/slashforge-fix` run."* Do not fabricate a
starting state.

## Step 1 — Verify, then resume

`slashforge-workflow-resume.md` carries the full procedure. In brief:

1. Parse the checkpoint: `current_phase`, `git_branch`, `context_snapshot` (plus `run_id`,
   `command`, `change_slug`, `baseline_commit`, `head_commit`, `updated_at`).
2. **Verify the git HEAD matches** what the checkpoint recorded (branch and commit). If it does not,
   **stop and show the user the difference** — resuming onto a diverged tree would apply later
   phases to work the checkpoint never saw. The user decides whether to continue.
3. Inject the `context_snapshot` as the working context: which change this is, the plan/tasks paths,
   what has shipped so far.
4. **Re-enter the originating workflow at `current_phase + 1`** — load `slashforge-workflow.md` (and
   `slashforge-workflow-fix.md` when `command` is `/slashforge-fix`) and continue the phase loop as
   if it had never stopped. Every downstream gate still applies.

**Mandatory gates** are never skipped by resuming. If the run stopped before a gate, the gate still
runs when you reach it; if it stopped after a gate the user already answered, the answer is in the
`context_snapshot` and is not asked again.

Follow `slashforge-workflow-resume.md` as the source of truth for the verification and re-entry
rules.
