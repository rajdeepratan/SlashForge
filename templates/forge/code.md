---
name: /forge:code
description: End-to-end development workflow — gather requirements, plan, confirm, branch, implement, verify, review, push, PR. Pass `-quick` for lean mode on small changes (skips brainstorming, minimal plan, inline self-review instead of the agent review). Uses superpowers skills at each phase when installed.
preflight: superpowers
---

**Preflight:** before reading anything else, open `{{INSTALL_PATH}}/forge-preflight.md` and run the **Superpowers Check**.

## Step 0 — Mode selection (do this first)

Inspect the argument this command was invoked with:

- **The argument contains `-quick`** → **LEAN MODE.** Read `{{INSTALL_PATH}}/forge-workflow-quick.md` in full, in addition to the workflow files below, and apply its overrides on top of everything in this file. Tell the user: *"Lean mode — skipping brainstorming, minimal plan, inline self-review."*
- **Anything else, including no argument** → **FULL MODE.** Do **not** read `forge-workflow-quick.md`. Do not apply any lean override. Run every phase at full depth.

Full mode is the default. Never infer lean mode from the size of the task — only
an explicit `-quick` selects it. If the user describes a tiny change without
passing `-quick`, run full mode; its Phase 1 auto-classification already handles
trivial work without the ceremony.

## Workflow files

Read the following in full — together they are your complete workflow guide:

- {{INSTALL_PATH}}/forge-workflow.md
- {{INSTALL_PATH}}/forge-workflow-agents.md

You MUST follow every phase in order. Do not skip phases. Do not combine phases.

**Entry (full mode):** Ask the user: **"What do you want to build, fix, or change?"**
In lean mode, use the entry line from `forge-workflow-quick.md` instead.

Then begin Phase 1 — the workflow guide handles the auto-classification (trivial vs full) and decides whether `superpowers:brainstorming` applies. Do not invoke brainstorming unconditionally; let Phase 1 make that call.

The same classification also governs Graphify usage when installed: **full flow** consults the code graph (~10–25k tokens saved on real work); **trivial path** skips it (load overhead exceeds value on tiny edits). When announcing the classification to the user (per Phase 1), this is part of what the decision means.

**Mandatory gates** — stop and wait for the user at these points in **both modes**:
1. **Phase 3** — plan confirmation
2. **Phase 4** — branch decision (same / new + base + name)
3. **Phase 8** — PR target branch and reviewers
4. **Phase 10** — branch cleanup after merge

**Superpowers skills per phase (if superpowers is installed — use the `Skill` tool, do not paraphrase):**
- Phase 1 — `superpowers:brainstorming` (full path only — skipped on the trivial auto-detect path, and skipped entirely in lean mode)
- Phase 2 — `superpowers:writing-plans`
- Phase 4 — `superpowers:using-git-worktrees` (when isolation is warranted)
- Phase 5 — **exactly one** of: `superpowers:systematic-debugging` (bug) · `superpowers:subagent-driven-development` (parallel units) · `superpowers:test-driven-development` (everything else testable). See Phase 5 table in the workflow file.
- Phase 6 — `superpowers:verification-before-completion`
- Phase 7 — `superpowers:requesting-code-review`
- Phase 8 — `superpowers:finishing-a-development-branch`
- Phase 9 — `superpowers:receiving-code-review`
- Phase 10 — (no skill; `git` agent handles the cleanup)

If superpowers is not installed, the workflow still runs — the skill steps degrade to following the written phase instructions without Skill tool invocations.

Follow the workflow file as the source of truth for phase details and success criteria.
