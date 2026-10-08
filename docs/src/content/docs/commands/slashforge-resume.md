---
title: /slashforge-resume
description: Resume an interrupted /slashforge-code or /slashforge-fix run from its last checkpoint instead of starting over.
---

```
/slashforge-resume
/slashforge-resume <run-id>
```

:::note
==Using Cursor or Codex? Pick your agent in the header== and every command on this page
changes with it. See [Hosts](/slashforge/reference/cli/#hosts) for what else differs.
:::

Long runs get interrupted — a closed terminal, a crashed session, a context reset.
==`/slashforge-resume` reads the checkpoint the workflow writes after every phase and continues
from there==, instead of re-running [`/slashforge-code`](/slashforge/commands/slashforge-code/)
or [`/slashforge-fix`](/slashforge/commands/slashforge-fix/) from Phase 1 and redoing work that
already landed.

> **It only resumes a run. It never starts one, and it never re-does a completed phase.**

## How checkpointing works

Every `/slashforge-code` and `/slashforge-fix` run writes a checkpoint to
`.slashforge/run_<id>.ckpt.json` ==at the end of every successful phase==, with an atomic write
(temp file, then rename) so an interrupted write never leaves a torn file. The checkpoint
records:

- **`current_phase`** — the phase that just completed. Resume re-enters at `current_phase + 1`.
- **`git_branch`** and the commit at checkpoint time.
- **`context_snapshot`** — the plan and tasks paths, which gates you have already answered, and
  a short summary of progress.

`.slashforge/` holds machine-local run state — ==gitignore it.==

## What resume does

1. Reads the latest `.slashforge/run_<id>.ckpt.json` (or the `run-id` you name).
2. ==Verifies the git HEAD still matches the checkpoint== — the branch and the commit. If the
   tree has diverged, it stops and shows you the difference rather than applying later phases to
   work the checkpoint never saw.
3. Injects the `context_snapshot` as the working context.
4. ==Re-enters the workflow at `current_phase + 1`== and runs the phase loop as if it had never
   stopped.

## Gates are never skipped

A mandatory gate the run had not yet reached ==still runs when resume gets there.== A gate you
already answered is recorded in the checkpoint and is not asked again.

## Argument

With no argument, `/slashforge-resume` resumes the most recently updated checkpoint. Pass a
`run-id` (the `<change-slug>`) to resume a specific one. ==With no checkpoint at all, it stops
and says so== — there is nothing to resume.
