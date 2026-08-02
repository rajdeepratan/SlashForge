---
name: Claude Development Workflow
description: End-to-end workflow invoked by /slashforge:code and /slashforge:investigate — requirements gathering, planning, change implementation, and research flows. Integrates superpowers skills when installed.
---

# Claude Development Workflow

Ten-phase change-shipping flow used by `/slashforge:code` (full and trivial paths) and `/slashforge:code -quick`. Companion files:

- `forge-workflow-investigation.md` — Investigation Flow I1–I3 (loaded by `/slashforge:investigate` only — it does not load this file)
- `forge-workflow-agents.md` — Agent Selection Table + multiple-agents rule + self-sufficiency rules (loaded by every workflow command)

Every phase with a named skill MUST invoke it via the `Skill` tool — do not paraphrase. SlashForge ships its own skills for most phases, so they are always available; where a phase names a `superpowers:` skill instead, that skill is optional and the phase falls back to its written steps when the plugin is absent. The flow runs without user intervention **except for four mandatory gates**: plan confirmation (Phase 3), branch decision (Phase 4), PR target + reviewers (Phase 8), and branch cleanup after merge (Phase 10).

---

## Phase 1 — Freeform Intake

**Skill:** `slashforge:brainstorm`

1. Open with: **"What do you want to build, fix, or change?"** — **unless** the command was invoked with a requirements document (`code.md` Step 0b resolved the argument to a file, typically an `docs/slashforge/investigations/investigation-*.html` report handed off by `/slashforge:investigate`). In that case the document *is* the intake: read it, then open with the confirmation line from Step 0b instead of the open question. Never make the user retype what the report already states.
2. **Classify the task yourself** — read the description (peek at affected files via Glob/Grep if it helps). Treat as **trivial** only if ALL of these hold:
   - Describable in one sentence without "and"
   - Touches ≤ 2 files by your best read
   - No new module, dependency, abstraction, or public API surface
   - Description contains none of these force-full keywords: `refactor`, `migrate`, `integrate`, `implement`, `rewrite`, `wire up`, `design`
   - When uncertain → **default to full flow**
3. **Announce the decision** before any token-heavy work: *"Treating this as [trivial | full]. [One-line reason from the checklist.] Say 'full flow' or 'quick' to override."* A user reply of `quick` or `trivial` forces the lean path; `full` or `full flow` forces the full path.
4. **Trivial path:** skip `slashforge:brainstorm`. Go to Phase 2 with the **Lean plan format** (see Phase 2). Phases 3–10 run as normal — every user gate and Phase 6 verification stay in place.
5. **Full path:** invoke `slashforge:brainstorm`. It writes the design spec to `.claude/specs/` by itself. Cover goal, user-visible behaviour, constraints, out-of-scope items, success criteria. Ask clarifying questions until the request is unambiguous. Do not propose a plan yet.

---

## Phase 2 — Propose Plan

**Skill:** `slashforge:plan`

1. **Pre-plan checks** — run two checks before drafting the plan: (a) **graph freshness** if `graphify-out/graph.json` is present (`forge-graph.md` Runtime section); (b) **`.claude/` coverage** for new-domain detection (`forge-coverage.md`). Both auto-skipped on `/slashforge:code -quick` and `/slashforge:code` trivial. Then invoke `slashforge:plan` to produce a structured plan. It writes to `.claude/plans/` by itself.
2. **Full plan format** (default): cover every section, omitting only those that genuinely do not apply:
   - **Changes** — files/modules to be added, modified, or removed
   - **Affected surface** — public APIs, exported functions, shared interfaces, DB schemas, migrations
   - **Env vars** — any new variables (must also be added to `.env.example` or equivalent)
   - **Breaking changes** — called out explicitly
   - **Risks & edge cases** — what could go wrong, what needs extra care
   - **Test strategy** — what will be tested and how
3. **Lean plan format** (used only when Phase 1 classified the task as trivial, or when the user invoked `/slashforge:code -quick`): write **Changes** and **Test strategy** only. Include any other section only if it genuinely applies. Do not write "N/A" — a missing section *is* the N/A.
4. Present the plan to the user in full — do not truncate

---

## Phase 3 — Confirm Plan (Gate)

1. Ask the user: **"Do you want to proceed with this plan? If not, what should change?"**
2. If the user approves → continue to Phase 4
3. If the user requests changes → return to Phase 1 with the new information and re-plan. Do not edit the plan in place without re-running intake — new info may change the scope
4. Do not start any code changes until the user explicitly approves the plan

---

## Phase 4 — Branch Decision (Gate)

**Skill (optional):** `superpowers:using-git-worktrees` (when isolation is warranted, and only if superpowers is installed)

1. Ask the user: **"Should I work on the current branch, or create a new one?"**
2. If **current branch**: verify it is not `main` / `master` / `production` (if it is, warn and require explicit override). Check the working tree is clean; if not, warn: **"There is uncommitted work. Please stash or commit before I continue."** Do not proceed until clean
3. If **new branch**:
   - Ask **"What should the new branch be named?"**
   - Ask: **"Which branch should I create it from?"**
   - Verify the working tree is clean (same check as above)
   - Fetch the latest remote state; if the base branch is behind its remote, warn: **"[branch] is behind its remote by N commit(s). Should I pull the latest before branching?"** Wait for confirmation
4. For larger changes or risky refactors, if superpowers is installed consider `superpowers:using-git-worktrees` to isolate the workspace
5. Invoke the `git` agent to execute the branching

---

## Phase 5 — Implement

**Invoke exactly one superpowers skill (if installed)** based on task shape — do not load multiple:

| Task shape | Skill |
|---|---|
| Bug fix (intake established the intent is bug) | `slashforge:debug` — reproduce, root-cause, **write a failing regression test first**, then fix until it passes (red → green) |
| Feature/task with 2+ truly independent parallelisable units in the plan | `superpowers:subagent-driven-development` (optional; skip if superpowers is absent) — dispatch the units; each subagent uses TDD internally |
| Everything else that is testable (features, tasks, refactors) | `slashforge:tdd` |
| Genuinely not testable (docs, config, infra-only tweaks) | No Phase 5 skill — state *why* TDD was skipped, then implement |

When uncertain, pick `slashforge:tdd` and note the reasoning. `/slashforge:code -quick` always lands in row 3 or 4 — never systematic-debugging, never subagent-driven.

1. Select the appropriate specialist coding agent based on the task type (see Agent Selection Table in `forge-workflow-agents.md`). If no suitable agent exists, create it on the fly and notify the user: *"I created a `[name]` agent to handle this — saved to `.claude/agents/[name].md`"*
2. Invoke the selected Phase 5 skill (or state why no skill applies), then implement.
3. Implement strictly to the approved plan — if the plan turns out wrong mid-implementation, stop and return to the intake phase.

---

## Phase 6 — Verify (Lint, Test, Build)

**Skill:** `slashforge:verify`

1. Invoke `slashforge:verify` — no success claims without evidence
2. Verify that lint, test, and build commands are defined in `CLAUDE.md`. If any are missing, ask the user for them before continuing
3. If new env vars were added, confirm they are in `.env.example` (or equivalent) before running anything
4. Run lint/format — fix all errors before continuing
5. Run tests — if any fail, return to Phase 5 with the failure output and loop until all pass
6. **For bug fixes**: confirm the regression test **failed before the fix and passes after**. If it passed both times, the test doesn't actually cover the bug — fix the test before proceeding.
7. Run build — fix any failures before proceeding
8. Do not continue to review until lint, tests, and build all pass with evidence

---

## Phase 7 — Code Review

**Skill:** none — the checklist below is the review standard. If superpowers is installed, `superpowers:requesting-code-review` may be used to dispatch a reviewer subagent.

1. Hand off to the `code-reviewer` agent against the checklist below. If superpowers is installed, `superpowers:requesting-code-review` covers dispatching a reviewer subagent
2. Review must check:
   - Matches the approved plan — no scope creep, no missing pieces
   - No duplicate code, no dead code, no debug leftovers, no hardcoded secrets
   - Follows `.claude/rules/` and the user's coding style
   - No unintended breaking changes to public APIs, exports, or shared interfaces
   - Production-ready: error handling at boundaries, no unsafe assumptions
3. **For bug fixes:** root cause is addressed, not just the symptom. The regression test meaningfully covers the bug.
4. If review **fails** → return to Phase 5 with specific, actionable feedback
5. If review fails **3 times in a row**, stop looping and escalate: **"The code has failed review 3 times. Outstanding issues: [list]. Please advise."**
6. Loop until the review passes or the user intervenes

---

## Phase 8 — Push & PR (Gate)

**Skill:** none — Phases 8 and 10 below are SlashForge's own branch-completion flow, and are more specific than a generic one.

1. Invoke the `git` agent to push. If push is rejected because the remote diverged, rebase on the latest; if conflict is not auto-resolvable, stop and ask the user.
2. Ask: **"Which branch should I target for this PR?"** and **"Who should I assign as reviewer(s)?"** — do not guess either (or read from a repo config if one exists).
3. Create the PR with this structure:
   - **Title:** short imperative <70 chars
   - **What / How / Testing:** what changed and why, brief approach (bugs: include **Root cause**), unit/integration/manual coverage
   - **New env vars** (list with purpose, must also be in `.env.example`), **Breaking changes** (explicit call-out of API/export/interface changes), **Checklist** (lint ✓, tests ✓, build ✓, no console logs, no hardcoded values)

---

## Phase 9 — PR Review Feedback

**Skill:** `slashforge:review-feedback`

If a human reviewer leaves comments on the PR:

1. Invoke `slashforge:review-feedback` — apply technical rigour, not performative agreement
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
3. Invoke the `git` agent to perform the cleanup. Expected steps: fetch latest from the remote; checkout the PR's base branch and pull; delete the local feature branch (prefer `git branch -d`; fall back to `-D` only if the PR was merged via squash/rebase and step 2 confirmed MERGED — explain when falling back); delete the remote feature branch `git push origin --delete <branch>` (treat "remote ref does not exist" as success); prune stale remote-tracking refs (`git remote prune origin`).
4. **Never delete** `main`, `master`, `production`, `develop`, `staging`, or any branch the repo's `.claude/rules/git.md` marks as protected. If the PR branch name matches a protected pattern, stop and warn.
5. Confirm cleanup complete: **"Cleaned up branch `<branch>`. You are now on `<base>`."** If anything fails mid-cleanup (push rejected, local delete fails, base branch pull conflicts), stop at the failure and hand back to the user with the exact error. Do not continue on the assumption something worked.
