# Post-Merge & Feedback Lifecycle — Requirements

## Goal
Give SlashForge a structured, assisted-but-gated loop for ingesting a reviewer's
request-changes from GitHub and driving the fixes, plus a structured upstream-integration
and conflict ladder — both extending existing phases, both honouring the project's
human-gate constitution.

## Problem
Two parts of the change-shipping workflow stop short of the reviewer-feedback and
divergence reality:

- **Phase 9 (PR Review Feedback)** is written as *"if a human reviewer leaves comments"* but
  never says how to *fetch* them. There is no GitHub ingestion step, and no way to re-enter
  the loop later — reviewer feedback almost always arrives asynchronously, in a fresh session
  after the original `/slashforge-code` run has ended.
- **Phase 8 push** and **Phase 10 pull** handle divergence in a single line
  (*"rebase on the latest; if conflict is not auto-resolvable, stop and ask"*). There is no
  structured ladder, no stated integrate strategy, and rebase silently implies a force-push on
  an already-pushed PR branch.

Both gaps push users back to manual GitHub-and-git work at exactly the point the workflow
claims to cover.

## Behaviour
Once this ships:

- **Resume ingests reviewer feedback.** A user whose PR has received request-changes runs
  `/slashforge-resume`. Resume reads the run's checkpoint (`current_phase >= 8`, carrying the
  PR number), fetches the PR's review state via `gh`, and — when changes are requested or
  threads are unresolved — re-enters **Phase 9** instead of reporting "nothing to resume".
- **Feedback is evaluated, not obeyed.** Phase 9 reuses the `slashforge-review-feedback`
  skill to classify each item **Must fix / Should fix / Discuss**. *Discuss* items are
  summarised and the user is asked before any code changes (the gate). *Must/Should* items run
  through implement → verify → review (Phases 5–7), then the branch is pushed. Nothing is
  applied blindly.
- **Upstream changes are integrated safely.** When the base branch has advanced under an
  already-pushed PR branch (at Phase 8 push, at Phase 10 pull, or before a feedback re-entry),
  the loop follows a single ladder: fetch, report ahead/behind, **merge `origin/<base>` into
  the branch** (not rebase, so a plain non-force push updates the PR). A clean merge proceeds
  automatically; a conflict **stops** with the list of conflicted files handed back to the
  user. A side is never auto-picked.

## Constraints & out of scope
- **Assisted + gated, never fully automated.** The existing human gates (Discuss-item
  confirmation, conflict stop, PR-merge confirmation) are preserved. This is a hard
  requirement from `docs/slashforge/constitution.md` and the `slashforge-review-feedback`
  skill's *"evaluate, don't accept"* stance.
- **Merge, not rebase**, for integrating an advanced base into a pushed PR branch — so the PR
  updates with a plain push and no history rewrite.
- **Reuse `/slashforge-resume`** as the async re-entry point — no new top-level command, no new
  installer command wiring.
- **`slashforge-workflow.md` cannot grow.** It renders at 199/200 lines for the Claude host;
  its edits must be net-neutral pointer rewrites. New prose lives in sibling guides
  (`slashforge-workflow-conflicts.md`, `slashforge-workflow-resume.md`) and in the
  `slashforge-review-feedback` skill (500-line cap).
- **Non-negotiables stay intact**: zero runtime dependencies, balanced target blocks, line
  limits (≤200 rendered guide / ≤500 SKILL.md), and a regenerated — never hand-edited —
  pinned Claude render fixture.
- **Out of scope:** auto-merging the PR; auto-resolving individual conflict hunks; resuming on
  a fresh clone / another machine where no `.slashforge/` checkpoint exists (resume keeps its
  existing "nothing to resume" behaviour there); adding `.slashforge/` to `.gitignore` (a
  separate pre-existing gap); any change to the `/slashforge-review-pr` reviewer-side flow.

## Success criteria
- A checkpoint written at Phase 8 carries the PR number, and `/slashforge-resume` on such a
  checkpoint with `reviewDecision == CHANGES_REQUESTED` re-enters Phase 9 and documents the
  `gh` ingestion steps it runs.
- Phase 9 / the `slashforge-review-feedback` skill contains a concrete `gh` recipe for fetching
  request-changes reviews and unresolved threads, mapped to Must / Should / Discuss.
- A new `slashforge-workflow-conflicts.md` guide documents the fetch → ahead/behind → merge
  `origin/<base>` → clean-proceeds / conflict-stops ladder, and is referenced from Phase 8
  push, Phase 10 pull, and the feedback re-entry.
- `slashforge-workflow.md` still renders at ≤200 lines for every host.
- The new guide is registered in `bin/install.js` `GUIDE_FILES`, the pinned Claude render is
  regenerated to include it, and `npm test` is green (target-block balance, frontmatter, line
  limits, render snapshot).
