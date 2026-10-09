---
name: SlashForge Workflow — Resume
description: Checkpoint format and the resume procedure used by /slashforge-resume. Defines the per-phase checkpoint the workflow writes to `.slashforge/run_<id>.ckpt.json`, the git-HEAD verification that guards a resume, and how the workflow re-enters at the next phase.
---

# Resume & Checkpointing

Read when `/slashforge-resume` runs. This file defines the checkpoint the change-shipping workflow
writes, and the procedure for safely re-entering a run from one.

Checkpointing is a property of the base workflow (`slashforge-workflow.md`), written at the end of
**every successful phase** of `/slashforge-code` and `/slashforge-fix`. `/slashforge-resume` is the
reader. Keeping the format in one file means the writer and the reader cannot drift.

## The checkpoint file

One file per run, at `.slashforge/run_<id>.ckpt.json`, where `<id>` is the run's `change_slug`
(or, for a fix run, the investigation `run_id`). `.slashforge/` is machine-local run state and
belongs in `.gitignore`.

```json
{
  "run_id": "oauth-login",
  "command": "/slashforge-code",
  "change_slug": "oauth-login",
  "current_phase": 5,
  "git_branch": "feat/oauth-login",
  "baseline_commit": "<sha before Phase 5>",
  "head_commit": "<sha at checkpoint time>",
  "context_snapshot": {
    "summary": "What has happened so far, in a few sentences.",
    "plan_path": "docs/slashforge/active/oauth-login/plan.md",
    "tasks_path": "docs/slashforge/active/oauth-login/tasks.md",
    "pr_number": 128,
    "pr_url": "https://github.com/<owner>/<repo>/pull/128",
    "gates_answered": { "plan_confirmed": true, "branch_decision": "new: feat/oauth-login from main" },
    "notes": "Any phase-specific state the next phase needs."
  },
  "updated_at": "<ISO-8601 timestamp>"
}
```

- **`current_phase`** — the highest phase that has *completed successfully*. Resume re-enters at
  `current_phase + 1`.
- **`git_branch` / `head_commit`** — what the tree looked like at checkpoint time. The resume
  verification compares the live HEAD against these.
- **`context_snapshot`** — everything the next phase needs that is not already on disk: the plan and
  tasks paths, which gates the user already answered (so they are not re-asked), and a short prose
  summary. It is a snapshot, not a transcript — keep it small. The Phase 8 checkpoint additionally
  records `pr_number`/`pr_url` once the PR is created, which the feedback re-entry below reads.

## Writing a checkpoint (the workflow's job, atomically)

At the end of each successful phase, the workflow writes the checkpoint with an **atomic write** —
write to a temp file in the same directory, then rename over the target — so an interrupted write
can never leave a half-written checkpoint that resume would choke on:

```bash
mkdir -p .slashforge
tmp="$(mktemp .slashforge/run_<id>.ckpt.json.XXXXXX)"
# ... write the JSON to "$tmp" with a tool that serialises JSON correctly ...
mv -f "$tmp" ".slashforge/run_<id>.ckpt.json"
```

`rename(2)` is atomic within a filesystem, so a reader ever sees either the previous checkpoint or
the complete new one, never a torn file. Writing the file by hand-concatenating strings risks
invalid JSON; use a tool that serialises it.

## Resuming from a checkpoint

1. **Load** the checkpoint `/slashforge-resume` Step 0 selected.
2. **Verify the HEAD.** Compare the live git state to the checkpoint:

   ```bash
   git rev-parse --abbrev-ref HEAD   # must equal git_branch
   git rev-parse HEAD                # compared against head_commit
   ```

   - **Branch mismatch** → stop. Resuming onto a different branch is almost always a mistake; show
     the user both branch names and let them check out the right branch or confirm.
   - **HEAD ahead of `head_commit` on the same branch** → work landed after the checkpoint. Show the
     user the commits in between (`git log head_commit..HEAD --oneline`) and ask whether to resume
     anyway or re-checkpoint first — the later phases will act on that extra work.
   - **HEAD behind `head_commit`** → the checkpoint references commits that are not in the tree
     (a reset or a different clone). Stop and surface it; do not resume blindly.
   - **Exact match** → safe to resume.
3. **Inject the `context_snapshot`** as the working context: the change being built, the plan and
   tasks paths, and the gates already answered.
4. **Re-enter the workflow at `current_phase + 1`.** Load `slashforge-workflow.md` (and
   `slashforge-workflow-fix.md` when `command` is `/slashforge-fix`) and run the phase loop from
   there. Do not re-run completed phases. Do not re-ask a gate whose answer is in
   `gates_answered`; a gate the run never reached still runs normally.
5. **Keep checkpointing.** The resumed run writes checkpoints at the end of each subsequent phase,
   same as a fresh run, so it can be resumed again if interrupted twice.

## Feedback re-entry (PR request-changes)

Reviewer feedback arrives asynchronously — usually in a fresh session after the Phase 8 checkpoint
was written. That checkpoint has `current_phase: 8` and carries `pr_number`/`pr_url`, so a normal
resume would already re-enter at Phase 9. Before doing so, establish the PR's actual review state:

```bash
gh pr view <pr_number> --json reviewDecision,reviews,comments,headRefName,baseRefName
```

- **`gh` missing or unauthenticated** → stop and ask the user to install/authenticate it
  (`gh auth status`). Never guess the review state.
- **`reviewDecision == CHANGES_REQUESTED`, or unresolved review threads exist** → there is feedback
  to ingest. First check divergence: if `origin/<baseRefName>` has advanced under the branch, run
  the merge/conflict ladder in `slashforge-workflow-conflicts.md` before touching the feedback.
  Then re-enter **Phase 9** (not `current_phase + 1`) — it reuses `slashforge-review-feedback` to
  classify the comments Must / Should / Discuss and to gate the Discuss items. The concrete `gh`
  fetch-and-map recipe lives in that skill.
- **No changes requested** (`APPROVED`, or only resolved threads) → report it and resume normally
  at `current_phase + 1`. Do not invent work from a PR that has none.

A Phase 8 checkpoint with no `pr_number` (the run stopped before the PR was created) resumes
normally — there is no PR to read.

## What resume never does

- It never *starts* a run — with no checkpoint it stops and says so.
- It never skips a mandatory gate the run had not yet reached.
- It never resumes onto a tree whose HEAD it could not verify without surfacing the mismatch first.
