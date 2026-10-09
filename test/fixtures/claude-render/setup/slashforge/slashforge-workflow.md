---
name: SlashForge Workflow
description: End-to-end workflow invoked by /slashforge-code and /slashforge-investigate — requirements gathering, planning, change implementation, and research flows. Uses SlashForge's own skills at each phase.
---

# SlashForge Workflow

Ten-phase change-shipping flow used by `/slashforge-code` (full and trivial paths) and `/slashforge-code -quick`. Companion files:

- `slashforge-workflow-investigation.md` — Investigation Flow I1–I3 (loaded by `/slashforge-investigate` only — it does not load this file)
- `slashforge-workflow-review-pr.md` — PR Review Flow R1–R7 (loaded by `/slashforge-review-pr` only; it applies the Phase 7 checklist below as its review standard, but does not load the rest of this file)
- `slashforge-workflow-fix.md` — Fix Overrides (loaded by `/slashforge-fix` *on top of* this file: it ingests a structured investigation, skips discovery, enforces a regression test, and hard-fails Phase 6 if no test was added)
- `slashforge-workflow-verify.md` · `slashforge-workflow-security.md` · `slashforge-workflow-docs.md` · `slashforge-workflow-conflicts.md` — read at Phase 6 (localized retry loop), Phase 7 (dual-track security audit; also used by `/slashforge-review-pr`), Phase 8 (the CHANGELOG/README documentation sweep, and the merge/conflict ladder on a push rejection) and Phase 10 (the same ladder when pulling an advanced base)
- `slashforge-workflow-resume.md` — Resume (loaded by `/slashforge-resume`: reads the latest `.slashforge/run_<id>.ckpt.json` checkpoint, verifies git HEAD, and re-enters this flow at the next phase)
- `slashforge-workflow-agents.md` — Agent Selection Table + multiple-agents rule + self-sufficiency rules (loaded by every workflow command)

Every phase with a named skill MUST invoke it via the `Skill` tool — do not paraphrase. Every skill the workflow names ships with SlashForge, so all of them are always available. There are no optional dependencies. The flow runs without user intervention **except for four mandatory gates**: plan confirmation (Phase 3), branch decision (Phase 4), PR target + reviewers (Phase 8), and branch cleanup after merge (Phase 10).

---

## Checkpointing (every phase)

The run is resumable. At the **end of every successful phase**, atomically write (temp file, then
`mv`) `.slashforge/run_<id>.ckpt.json` with `current_phase`, `git_branch` and a small
`context_snapshot` — every path alike. `/slashforge-resume` reads it and re-enters at
`current_phase + 1`; format in **`slashforge-workflow-resume.md`**. `.slashforge/` — gitignore it.

---

## Phase 1 — Freeform Intake

**Skill:** `slashforge-brainstorm`

1. Open with: **"What do you want to build, fix, or change?"** — **unless** the command was invoked with a requirements document (`code.md` Step 0b resolved the argument to a file, typically an `docs/slashforge/investigations/investigation-*.html` report handed off by `/slashforge-investigate`). In that case the document *is* the intake: read it, then open with the confirmation line from Step 0b instead of the open question. Never make the user retype what the report already states.
2. **Classify the task yourself** — read the description (peek at affected files with a quick search if it helps). Treat as **trivial** only if ALL of these hold:
   - Describable in one sentence without "and"
   - Touches ≤ 2 files by your best read
   - No new module, dependency, abstraction, or public API surface
   - Description contains none of these force-full keywords: `refactor`, `migrate`, `integrate`, `implement`, `rewrite`, `wire up`, `design`
   - When uncertain → **default to full flow**
3. **Announce the decision** before any token-heavy work: *"Treating this as [trivial | full]. [One-line reason from the checklist.] Say 'full flow' or 'quick' to override."* A user reply of `quick` or `trivial` forces the lean path; `full` or `full flow` forces the full path.
4. **Trivial path:** skip `slashforge-brainstorm`. Go to Phase 2 with the **Lean plan format** (see Phase 2). Phases 3–10 run as normal — every user gate and Phase 6 verification stay in place.
5. **Full path:** invoke `slashforge-brainstorm`. It writes `docs/slashforge/active/<change>/requirements.md` as Markdown by itself (see `slashforge-spec-home.md`). Cover goal, user-visible behaviour, constraints, out-of-scope items, success criteria. Ask clarifying questions until the request is unambiguous. Do not propose a plan yet.
6. **Pick the change-slug (every path).** The change needs a short kebab `<change-slug>` — it names the `docs/slashforge/active/<change-slug>/` folder the plan and tasks (and, on the full path, `requirements.md`) are written into, and the folder Phase 10 archives on merge. The full path's `slashforge-brainstorm` picks it; the **trivial** path picks it here at intake; **`-quick` lean mode** picks it when it writes the plan (see `slashforge-workflow-quick.md`). Every path produces one `active/<change-slug>/` folder.

---

## Phase 2 — Propose Plan

**Skill:** `slashforge-plan`

1. **Pre-plan checks** — run two checks before drafting the plan: (a) **graph freshness** if `graphify-out/graph.json` is present (`slashforge-graph.md` Runtime section); (b) **`.claude/` coverage** for new-domain detection (`slashforge-coverage.md`). Both auto-skipped on `/slashforge-code -quick` and `/slashforge-code` trivial. Then invoke `slashforge-plan` to produce a structured plan. It writes `docs/slashforge/active/<change>/plan.md` and `tasks.md` as Markdown by itself.
2. **Full plan format** (default): cover every section, omitting only those that genuinely do not apply:
   - **Changes** — files/modules to be added, modified, or removed
   - **Affected surface** — public APIs, exported functions, shared interfaces, DB schemas, migrations
   - **Env vars** — any new variables (must also be added to `.env.example` or equivalent)
   - **Breaking changes** — called out explicitly
   - **Risks & edge cases** — what could go wrong, what needs extra care
   - **Test strategy** — what will be tested and how
3. **Lean plan format** (used only when Phase 1 classified the task as trivial, or when the user invoked `/slashforge-code -quick`): write **Changes** and **Test strategy** only. Include any other section only if it genuinely applies. Do not write "N/A" — a missing section *is* the N/A.
4. Present the plan to the user in full — do not truncate

---

## Phase 3 — Confirm Plan (Gate)

1. Ask the user: **"Do you want to proceed with this plan? If not, what should change?"**
2. If the user approves → continue to Phase 4
3. If the user requests changes → return to Phase 1 with the new information and re-plan. Do not edit the plan in place without re-running intake — new info may change the scope
4. Do not start any code changes until the user explicitly approves the plan

---

## Phase 4 — Branch Decision (Gate)

**Skill:** `slashforge-worktree` (only when isolation is warranted — ordinary feature work does not need it)

1. Ask the user: **"Should I work on the current branch, or create a new one?"**
2. If **current branch**: verify it is not `main` / `master` / `production` (if it is, warn and require explicit override). Check the working tree is clean; if not, warn: **"There is uncommitted work. Please stash or commit before I continue."** Do not proceed until clean
3. If **new branch**:
   - Ask **"What should the new branch be named?"**
   - Ask: **"Which branch should I create it from?"**
   - Verify the working tree is clean (same check as above)
   - Fetch the latest remote state; if the base branch is behind its remote, warn: **"[branch] is behind its remote by N commit(s). Should I pull the latest before branching?"** Wait for confirmation
4. For larger changes or risky refactors — or when a dev server must stay up on the current branch — invoke `slashforge-worktree` to isolate the workspace
5. Invoke the `git` agent to execute the branching

---

## Phase 5 — Implement

**Invoke exactly one skill** based on task shape — do not load multiple:

| Task shape | Skill |
|---|---|
| Bug fix (intake established the intent is bug) | `slashforge-debug` — reproduce, root-cause, **write a failing regression test first**, then fix until it passes (red → green) |
| Feature/task with 2+ truly independent parallelisable units in the plan | `slashforge-parallel` — dispatch the units; each agent works test-first. Most plans are not parallel; the skill's independence test decides |
| Everything else that is testable (features, tasks, refactors) | `slashforge-tdd` |
| Genuinely not testable (docs, config, infra-only tweaks) | No Phase 5 skill — state *why* TDD was skipped, then implement |

When uncertain, pick `slashforge-tdd` and note the reasoning. `/slashforge-code -quick` always lands in row 3 or 4 — never `slashforge-debug`, never `slashforge-parallel`.

1. Select the appropriate specialist coding agent based on the task type (see Agent Selection Table in `slashforge-workflow-agents.md`). If no suitable agent exists, create it on the fly and notify the user: *"I created a `[name]` agent to handle this — saved to `.claude/agents/[name].md`"*
2. Invoke the selected Phase 5 skill (or state why no skill applies). **Before writing any code, record `baseline_commit = git rev-parse HEAD`** — the pre-implementation state Phase 6 rolls back to on `abort` and diffs against; the same `baseline_commit` the checkpoint stores. Then implement.
3. Implement strictly to the approved plan, working through `docs/slashforge/active/<change>/tasks.md` and flipping each step's `- [ ]` to `- [x]` as it lands — if the plan turns out wrong mid-implementation, stop and return to the intake phase.

---

## Phase 6 — Verify (Lint, Test, Build)

**Skill:** `slashforge-verify`. **Read `slashforge-workflow-verify.md`** — it carries the full phase.

Phase 6 is a **localized micro-state machine**. Use `baseline_commit` (the pre-Phase-5 SHA); set
`max_retries = 3`, `current_attempt = 1`. Run lint, tests, build and convergence against the spec —
all green with evidence → Phase 7. On any failure, do **not** bounce back to replanning: run
**Localized Patch Generation** (a single-shot fix constrained to the files the failure implicates,
from the plan + the diff since `baseline_commit` + failing output, never altering the plan), re-run,
increment `current_attempt`. After `max_retries`, hit the **Human Intervention Gate** — print exactly
`VERIFY FAILED: 3 consecutive test/build failures.` and wait for `proceed` or `abort`
(`git reset --hard <baseline_commit>`, discarding the whole attempt, then exit).

---

## Phase 7 — Code Review

**Skill:** `slashforge-request-review`

1. Invoke `slashforge-request-review`, then hand off to the `code-reviewer` agent against the checklist below
2. Review must check:
   - Matches `requirements.md` and the approved plan — no scope creep, no missing pieces
   - Honours `docs/slashforge/constitution.md` — violates none of the project's non-negotiables
   - No duplicate code, no dead code, no debug leftovers, no hardcoded secrets
   - Follows `.claude/rules/` and the user's coding style
   - No unintended breaking changes to public APIs, exports, or shared interfaces
   - Production-ready: error handling at boundaries, no unsafe assumptions
3. **For bug fixes:** root cause is addressed, not just the symptom. The regression test meaningfully covers the bug.
4. If review **fails** → return to Phase 5 with specific, actionable feedback
5. If review fails **3 times in a row**, stop looping and escalate: **"The code has failed review 3 times. Outstanding issues: [list]. Please advise."**
6. Loop until the review passes or the user intervenes

### Security audit (dual-track, blocking)

Before Phase 7 can pass, run the dual-track security audit in **`slashforge-workflow-security.md`** —
Track A (`npm audit --json` on a dependency-file diff; High/Critical blocks) and Track B (a rigid
AppSec OWASP pass on source diffs). **Any `category: security`, `severity: blocking` finding halts
Phase 7 so Phase 8 does not run** — fix it in Phase 5 and re-run the audit; never deferred to a follow-up.

---

## Phase 8 — Documentation, Push & PR (Gate)

**Skill:** none — Phases 8 and 10 below are SlashForge's own branch-completion flow, and are more specific than a generic one.

### Documentation sweep (before pushing, so the docs land in the PR)

Before the push, run the documentation sweep in **`slashforge-workflow-docs.md`**: prepend a
[Keep a Changelog](https://keepachangelog.com) snippet under `CHANGELOG.md`'s `## [Unreleased]`
header, apply targeted `README.md` updates for any public-interface change (exported APIs, CLI flags,
env vars), and commit them as `docs: auto-update changelog and readme for <feature>`. If there is
nothing to document, skip the commit and say why.

### Push

1. Invoke the `git` agent to push. If push is rejected because the remote diverged, follow the merge/conflict ladder in **`slashforge-workflow-conflicts.md`** (merge `origin/<base>`, not rebase; a conflict stops with the file list).
2. Ask: **"Which branch should I target for this PR?"** and **"Who should I assign as reviewer(s)?"** — do not guess either (or read from a repo config if one exists).
3. Create the PR with this structure:
   - **Title:** short imperative <70 chars
   - **What / How / Testing:** what changed and why, brief approach (bugs: include **Root cause**), unit/integration/manual coverage
   - **New env vars** (list with purpose, must also be in `.env.example`), **Breaking changes** (explicit call-out of API/export/interface changes), **Checklist** (lint ✓, tests ✓, build ✓, no console logs, no hardcoded values)

---

## Phase 9 — PR Review Feedback

**Skill:** `slashforge-review-feedback`

Reached live when a reviewer comments during the run, or re-entered later by `/slashforge-resume` — which fetches the PR's review state with `gh` and lands here on `CHANGES_REQUESTED` (see **`slashforge-workflow-resume.md`**, Feedback re-entry). Either way:

1. Invoke `slashforge-review-feedback` — apply technical rigour, not performative agreement
2. Read all comments in full before making any changes
3. Group by type: **Must fix** (blocking), **Should fix** (quality/convention), **Discuss** (opinions/decisions). For **Discuss**, summarise and ask the user before touching code. For **Must/Should fix**, return to Phase 5, then re-run Phases 6–7 before pushing.
4. Push the updated branch — the existing PR updates automatically
5. If the same reviewer comments remain unresolved after 2 iterations, escalate: **"I've made 2 attempts to address [reviewer]'s comments but they remain unresolved. Please review and advise."**
6. Once approved, notify **"PR approved — please merge when ready."** — do not merge autonomously unless the user explicitly asks. After they confirm the merge, continue to Phase 10.

---

## Phase 10 — Post-Merge Cleanup (Gate)

Runs only after the user confirms the PR merged. Cleans up the feature branch locally and on the remote.

1. Ask: **"PR merged. Clean up the feature branch `<branch>`? This deletes it locally and on the remote. (y/n)"** — skip the phase if the user declines
2. **Verify the PR is actually merged** before deleting anything. Use `gh pr view <branch> --json state,mergedAt` (or the repo's equivalent) and confirm `state == MERGED`. If it isn't merged (draft, closed, or unknown), stop and warn the user — do not delete.

**Archive the change (all hosts).** This happens inside step 3's base-branch work — **after** the base branch is checked out and pulled, and **before** the feature branch is deleted. Move `docs/slashforge/active/<change-slug>/` to `docs/slashforge/archive/<change-slug>/` with `git mv` (the folder was committed with the change, so it is tracked on the base branch after the merge — if it was somehow never committed, `git add` it first), update `docs/slashforge/status.md` (drop the change from the active list, add it under "recently archived" with the merge date), and commit on the base branch — if direct pushes to the base are blocked, open a short archive-only PR instead. **Every completed change is archived — full, lean and trivial alike**; skip only if no `docs/slashforge/active/<change-slug>/` exists at all. See `slashforge-spec-home.md` for the layout.

3. Invoke the `git` agent to perform the cleanup. Expected steps: fetch latest from the remote; checkout the PR's base branch and pull; delete the local feature branch (prefer `git branch -d`; fall back to `-D` only if the PR was merged via squash/rebase and step 2 confirmed MERGED — explain when falling back); delete the remote feature branch `git push origin --delete <branch>` (treat "remote ref does not exist" as success); prune stale remote-tracking refs (`git remote prune origin`).
4. **Never delete** `main`, `master`, `production`, `develop`, `staging`, or any branch the repo's `.claude/rules/git.md` marks as protected. If the PR branch name matches a protected pattern, stop and warn.
5. Confirm cleanup complete: **"Cleaned up branch `<branch>`. You are now on `<base>`."** If anything fails mid-cleanup (push rejected, local delete fails, or base-branch pull conflicts — for which the merge/conflict ladder is **`slashforge-workflow-conflicts.md`**), stop at the failure and hand back to the user with the exact error. Do not continue on the assumption something worked.
