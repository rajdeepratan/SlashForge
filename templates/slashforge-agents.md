---
name: Agent Setup — Subagent Files
description: How to create subagent files when setting up a repo — one role per file, in the host's agents directory
---

# Creating Agent Files

Agents = **specialised roles** that own a category of task end-to-end.

---

## Global Agents — Always Create at Root

These exist once at the repo root and are shared across all apps:

- `developer` — general-purpose catch-all (last resort — invoke specialist agents first)
- `code-reviewer` — **always auto-invoked after every implementation, without user prompt** — non-negotiable, must exist in every repo
- `git` — handles all branch creation, pushing, and PR creation

**In a monorepo:** global agents live in the repo root's agents directory. Specialist agents belong inside the app they serve.

<!--target:claude-->
Root `.claude/agents/`; per-app `apps/web/.claude/agents/`, `apps/api/.claude/agents/`, etc.
<!--/target-->
<!--target:cursor-->
Root `.cursor/agents/`; per-app `apps/web/.cursor/agents/`, `apps/api/.cursor/agents/`, etc.

Cursor also reads `.claude/agents/` and `.codex/agents/`, with `.cursor/` winning on a
name conflict. Write to `.cursor/` so the kit's agents take precedence over anything a
previous setup left behind.
<!--/target-->

## Specialist Agents — Create Per App

Add these based on what the app actually does:

| Task type | Agent name |
|---|---|
| Frontend / UI / components | `frontend-developer` |
| API / backend / services | `api-builder` |
| Database / migrations / queries | `database-developer` |
| Tests only | `test-writer` |
| Bug investigation and fix | `debugger` |

If the needed agent type is not in this table, create one on the fly, save it to the agents directory, and notify the user naming the exact path you wrote.

<!--target:claude-->
> "I created a `[name]` agent to handle this — saved to `.claude/agents/[name].md`"
<!--/target-->
<!--target:cursor-->
> "I created a `[name]` agent to handle this — saved to `.cursor/agents/[name].md`"
<!--/target-->

## Agent Filename Rule

The agent's filename **must exactly match** its invocation name:

<!--target:claude-->
```
✓  agent name: debugger       → .claude/agents/debugger.md
✗  agent name: debugger       → .claude/agents/debug-agent.md
```

`CLAUDE.md`'s orchestration table, the workflow file, and the agent filename must all use
the same name — a mismatch means the agent will never be invoked correctly.
<!--/target-->
<!--target:cursor-->
```
✓  agent name: debugger       → .cursor/agents/debugger.md
✗  agent name: debugger       → .cursor/agents/debug-agent.md
```

`AGENTS.md`'s routing table, the workflow file, and the agent filename must all use the
same name — a mismatch means the agent will never be invoked correctly.
<!--/target-->

---

## What Each Agent File Must Include

1. **One-line role description**
2. **"Before starting" reading list** — directories to read, not specific files
3. **Skills** — which skills the agent invokes
4. **Phased workflow** — ordered steps the agent follows
5. **Code quality checklist** — what it checks before handing off
6. **When to ask vs decide** — what requires user input vs autonomous action
7. **Output format** — how the agent communicates results

---

## Reference Style

Reference directories, never specific files — file paths go stale:

<!--target:claude-->
```
✓  Read `.claude/rules/` for coding standards and `.claude/skills/` for recipes.
✗  Read `.claude/rules/typescript.md` and `.claude/rules/components.md`.
```
<!--/target-->
<!--target:cursor-->
```
✓  Read `.cursor/rules/` for coding standards and `.cursor/skills/` for recipes.
✗  Read `.cursor/rules/typescript.mdc` and `.cursor/rules/components.mdc`.
```
<!--/target-->

---

## Superpowers Skills Per Agent Type

Each agent type must invoke these skills. `slashforge-` skills ship with SlashForge and are always available:

| Agent | Skills to invoke |
|---|---|
| `developer`, `frontend-developer`, `api-builder` | `slashforge-brainstorm` (new features), `slashforge-plan`, `slashforge-tdd`, `slashforge-verify` (before handoff) |
| `debugger` | `slashforge-debug`, `slashforge-verify` |
| `code-reviewer` | `slashforge-request-review` |
| `test-writer` | `slashforge-tdd`, `slashforge-verify` |

Every skill named here ships with SlashForge, so there is nothing to check for and nothing to skip.

---

## File Skeleton

Every agent file must start with frontmatter, including the generated-by marker (see `slashforge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

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

<!--target:claude-->
Read `.claude/rules/` for coding standards and `.claude/skills/` for recipes.
<!--/target-->
<!--target:cursor-->
Read `.cursor/rules/` for coding standards and `.cursor/skills/` for recipes.
<!--/target-->

## Skills

Skills:
- [list the relevant skills for this agent type]

All of these ship with SlashForge and are always available.

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
<!--target:claude-->
- Code quality and conventions match `.claude/rules/`
<!--/target-->
<!--target:cursor-->
- Code quality and conventions match `.cursor/rules/`
<!--/target-->
- No leftover debug code, dead code, or temporary hacks
- No breaking changes to public APIs, exported functions, or shared interfaces — if found, **flag explicitly to the user before continuing**
<!--target:claude-->
- **`.claude/` coverage** — if the diff introduces a new domain not covered by existing agents/rules/`CLAUDE.md`, raise it as a review note per `slashforge-coverage.md` Phase 7 section. This is a note, not a block — flag the gap, suggest the addition, but don't fail the review on its absence
<!--/target-->
<!--target:cursor-->
- **`.cursor/` coverage** — if the diff introduces a new domain not covered by existing subagents/rules/`AGENTS.md`, raise it as a review note per `slashforge-coverage.md` Phase 7 section. This is a note, not a block — flag the gap, suggest the addition, but don't fail the review on its absence
<!--/target-->

If the review fails → return to the implementing agent with specific, actionable feedback. If it fails 3 times in a row → stop and escalate to the user.

---

## Scope

- Workflows should be scannable — not every scenario, just what to do and when
- Keep agents focused — a specialist agent is better than one mega-agent
- Multiple coding agents must always exist — never rely on a single agent for all implementation work
