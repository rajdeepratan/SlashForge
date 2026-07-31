---
name: Claude Setup — Agent Files
description: How to create agent files in .claude/agents/ when setting up Claude for a repo
---

# Creating Agent Files

Agents = **specialised roles** that own a category of task end-to-end.

---

## Global Agents — Always Create at Root

These exist once at the repo root and are shared across all apps:

- `developer` — general-purpose catch-all (last resort — invoke specialist agents first)
- `code-reviewer` — **always auto-invoked after every implementation, without user prompt** — non-negotiable, must exist in every repo
- `git` — handles all branch creation, pushing, and PR creation

**In a monorepo:** global agents live at root `.claude/agents/`. Specialist agents belong inside the app they serve (`apps/web/.claude/agents/`, `apps/api/.claude/agents/`, etc.).

## Specialist Agents — Create Per App

Add these based on what the app actually does:

| Task type | Agent name |
|---|---|
| Frontend / UI / components | `frontend-developer` |
| API / backend / services | `api-builder` |
| Database / migrations / queries | `database-developer` |
| Tests only | `test-writer` |
| Bug investigation and fix | `debugger` |

If the needed agent type is not in this table, create one on the fly, save it to `.claude/agents/`, and notify the user: **"I created a `[name]` agent to handle this — saved to `.claude/agents/[name].md`"**

## Agent Filename Rule

The agent's filename **must exactly match** its invocation name:

```
✓  agent name: debugger       → .claude/agents/debugger.md
✗  agent name: debugger       → .claude/agents/debug-agent.md
```

CLAUDE.md's orchestration table, the workflow file, and the agent filename must all use the same name — a mismatch means the agent will never be invoked correctly.

---

## What Each Agent File Must Include

1. **One-line role description**
2. **"Before starting" reading list** — directories to read, not specific files
3. **Superpowers skills** — which skills to invoke if the superpowers plugin is installed
4. **Phased workflow** — ordered steps the agent follows
5. **Code quality checklist** — what it checks before handing off
6. **When to ask vs decide** — what requires user input vs autonomous action
7. **Output format** — how the agent communicates results

---

## Reference Style

Reference directories, never specific files — file paths go stale:

```
✓  Read `.claude/rules/` for coding standards and `.claude/skills/` for recipes.
✗  Read `.claude/rules/typescript.md` and `.claude/rules/components.md`.
```

---

## Superpowers Skills Per Agent Type

If superpowers is installed, each agent type must invoke these skills:

| Agent | Skills to invoke |
|---|---|
| `developer`, `frontend-developer`, `api-builder` | `superpowers:brainstorming` (new features), `superpowers:writing-plans`, `superpowers:test-driven-development`, `superpowers:verification-before-completion` (before handoff) |
| `debugger` | `superpowers:systematic-debugging`, `superpowers:verification-before-completion` |
| `code-reviewer` | `superpowers:requesting-code-review` |
| `test-writer` | `superpowers:test-driven-development`, `superpowers:verification-before-completion` |

If superpowers is not installed, skip the skill and proceed with the workflow as written.

---

## File Skeleton

Every agent file must start with frontmatter, including the generated-by marker (see `forge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```markdown
---
name: [agent name]
description: [one-line role description]
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---

## Role

[What this agent owns end-to-end]

## Before Starting

Read `.claude/rules/` for coding standards and `.claude/skills/` for recipes.

## Skills

If superpowers is installed:
- [list the relevant superpowers skills for this agent type]

If superpowers is not installed, skip and proceed with the workflow.

## Workflow

1. [phase one]
2. [phase two]
...

## Quality Checklist

- [ ] [check one]
- [ ] [check two]

## When to Ask

Always ask — never assume:
- **Which branch to create this from?** — before any branch is created
- **Which branch should I target for this PR?** — before any PR is created

Ask for anything else that would cause irreversible or hard-to-reverse actions if guessed wrong.
```

---

## `code-reviewer` Mandatory Checklist

Every `code-reviewer` agent created must include these checks — they are non-negotiable regardless of the repo:

- No duplicate code introduced
- Proper component / module structure (files in the right place, correctly named)
- Code quality and conventions match `.claude/rules/`
- No leftover debug code, dead code, or temporary hacks
- No breaking changes to public APIs, exported functions, or shared interfaces — if found, **flag explicitly to the user before continuing**
- **`.claude/` coverage** — if the diff introduces a new domain not covered by existing agents/rules/`CLAUDE.md`, raise it as a review note per `forge-coverage.md` Phase 7 section. This is a note, not a block — flag the gap, suggest the addition, but don't fail the review on its absence

If the review fails → return to the implementing agent with specific, actionable feedback. If it fails 3 times in a row → stop and escalate to the user.

---

## Scope

- Workflows should be scannable — not every scenario, just what to do and when
- Keep agents focused — a specialist agent is better than one mega-agent
- Multiple coding agents must always exist — never rely on a single agent for all implementation work
