---
<!--target:claude-->
name: Claude Development Workflow — Agent Selection
<!--/target-->
<!--target:agents-->
name: Claude Development Workflow — Task Handling
<!--/target-->
<!--target:claude-->
description: Agent selection table, mandatory multiple-agent rule, and self-sufficiency rules shared across all workflow commands
<!--/target-->
<!--target:agents-->
description: How task types are handled and the self-sufficiency rules shared across all workflow commands
<!--/target-->
---

<!--target:claude-->
# Agent Selection & Self-Sufficiency
<!--/target-->
<!--target:agents-->
# Task Handling & Self-Sufficiency
<!--/target-->

<!--target:claude-->
This file is loaded alongside `forge-workflow.md` by every workflow command (`/slashforge:code`, `/slashforge:code -quick`, `/slashforge:investigate`). It covers which agent handles which task type, and the rules that keep the workflow running without unnecessary user prompts.
<!--/target-->
<!--target:agents-->
This file is loaded alongside `forge-workflow.md` by every workflow command (`/slashforge-code`, `/slashforge-code -quick`, `/slashforge-investigate`). It covers how task types are handled, and the rules that keep the workflow running without unnecessary user prompts.
<!--/target-->

---

<!--target:claude-->
## Agent Selection Table

Claude self-selects the correct agent based on the task type. The user will never specify.

| Task type | Agent |
|---|---|
| Frontend / UI / components | `frontend-developer` or equivalent |
| API / backend / services | `api-builder` or equivalent |
| Database / migrations / queries | `database-developer` or equivalent |
| Tests only | `test-writer` or equivalent |
| Bug investigation and fix | `debugger` or equivalent |
| After any implementation | `code-reviewer` (always) |
| Branch, push, PR | `git` agent (always) |

If the required agent does not exist in `.claude/agents/`, create it on the fly and notify the user.

---

## Multiple Coding Agents — Mandatory

Always create more than one coding agent when setting up a repo. At minimum:

- `developer` — general-purpose fallback
- One specialist per major concern in the codebase (e.g. `frontend-developer`, `api-builder`, `test-writer`, `debugger`)

The `developer` agent is the last resort — invoke specialist agents first when the task clearly fits one.

---
<!--/target-->
<!--target:agents-->
## Handling Task Types

You handle every task type yourself — frontend, API, database, tests, debugging, review, and git.
There is no agent to select and none to create. **Do not write agent definition files.**

The one rule worth keeping from the agent model is the useful one: **review is a separate pass.**
After implementing, stop, re-read the diff against the Phase 7 checklist as a reviewer would, and
fix what you find before Phase 8. Reviewing while you write is not the same thing and does not
catch the same class of mistake.

---
<!--/target-->

## Self-Sufficiency Rules

<!--target:claude-->
- Claude selects agents based on task type — never ask the user which agent to use
- If a needed agent is missing, create it silently and notify the user after
<!--/target-->
<!--target:agents-->
- You handle every task type yourself — never ask the user which agent to use, and never create agent files
<!--/target-->
- The change-shipping loop (`/slashforge:code`, `/slashforge:code -quick`) runs without user intervention except for the four mandatory gates: **plan confirmation** (Phase 3), **branch decision** (Phase 4), **PR target + reviewers** (Phase 8), and **branch cleanup** (Phase 10)
- Every phase with a named skill MUST invoke it via the `Skill` tool before acting — do not paraphrase from memory. All of them ship with SlashForge
