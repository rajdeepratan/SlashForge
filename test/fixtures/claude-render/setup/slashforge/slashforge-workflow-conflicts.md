---
name: SlashForge Workflow — Conflicts
description: The upstream-integration and merge-conflict ladder used by Phase 8 push, Phase 10 base pull, and the resume feedback re-entry. Integrates an advanced base with a merge (never a rebase on an already-pushed branch) and stops with the conflicted-file list rather than auto-resolving a side.
---

# Upstream Integration & Conflict Ladder

Read when a push is rejected for divergence (Phase 8 push), when the base branch has to be pulled
(Phase 10 cleanup), or before a resume feedback re-entry (`slashforge-workflow-resume.md`) — any
point where `origin/<base>` may have advanced under an already-pushed PR branch.

The ladder is **assisted but gated**: a clean integration proceeds on its own; a conflict stops and
hands the files back to the user. A side is never auto-picked.

## Preconditions

- **Clean working tree.** Run `git status --porcelain`; if it is non-empty, stop and ask the user to
  stash or commit first (the same check Phase 4 uses). Integrating onto dirty work loses changes.
- **Know the base.** `<base>` is the PR's target branch chosen at Phase 8 — not always `main`.

## The ladder

1. **Fetch.** `git fetch origin` — refresh the remote-tracking refs without touching the tree.
2. **Measure divergence.**
   ```bash
   git rev-list --left-right --count origin/<base>...HEAD
   ```
   The left count is how far the base is ahead (commits the branch is missing); the right is the
   branch's own commits. Report both. A left count of `0` means nothing to integrate — go to push.
3. **Integrate with a merge — not a rebase.**
   ```bash
   git merge --no-edit origin/<base>
   ```
   The merge is deliberate. The PR branch is already on the remote, so a rebase would rewrite
   published history and force a `--force-with-lease` push; a merge keeps history and updates the PR
   with a **plain, non-force `git push`**. Do not rebase or force-push a pushed branch in this flow.
4. **Clean merge → continue.** If the merge completes with no conflict, the merge commit is created;
   continue to the push (Phase 8) or report the base pull complete (Phase 10).
5. **Conflict → stop.** If the merge reports conflicts, list the unmerged files and hand back:
   ```bash
   git diff --name-only --diff-filter=U
   ```
   **Stop there.** Do not run `git checkout --ours/--theirs`, do not `git merge -X ours`/`-X theirs`,
   and do not guess a resolution — a wrong auto-resolve silently ships broken code. Give the user the
   file list and wait. `git merge --abort` returns to the pre-merge state if they want to back out.

## After a clean integration

- Push with a plain `git push` — no force is needed because the merge did not rewrite history.
- Re-run the verification (Phase 6) if the merge pulled in code that interacts with the change: an
  integrated base can break a branch that was green a moment earlier.

## What this ladder never does

- Never rebases or force-pushes a branch that is already on the remote.
- Never auto-resolves a conflict by picking a side.
- Never integrates onto a dirty working tree.
