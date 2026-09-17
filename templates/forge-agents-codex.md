---
name: Agent Setup — Codex Subagents
description: How to create Codex subagent files in .codex/agents/ when setting up a repo
---

# Creating Codex Subagent Files

Subagents = **specialised roles** that own a category of task end-to-end.

Codex subagents are **TOML**, not markdown. There is no frontmatter and no prose body: the whole definition is TOML keys, and the agent's instructions live inside a `developer_instructions` string.

**Location:** `.codex/agents/<name>.toml` (project, checked in) or `~/.codex/agents/<name>.toml` (personal). Codex identifies an agent by its `name` field, so the filename is convention only — keep it equal to `name` anyway, or the file becomes impossible to find.

---

## Required Fields

| Field | Type | Meaning |
|---|---|---|
| `name` | string | The name Codex uses when spawning or referring to this agent |
| `description` | string | When to deploy it — human-facing guidance |
| `developer_instructions` | string | The agent's role and behaviour; this is the prompt body |

Optional keys mirror `config.toml`: `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, `skills.config`.

Codex ships three built-in agents a custom definition may override: `default`, `worker`, `explorer`. Do not name a new agent after one of these unless you intend to replace it.

---

## Global Subagents — Always Create at Root

These exist once at the repo root and are shared across all apps:

- `developer` — general-purpose catch-all (last resort — deploy specialists first)
- `code-reviewer` — **always deployed after every implementation, without user prompt** — non-negotiable, must exist in every repo
- `git` — handles all branch creation, pushing, and PR creation

**In a monorepo:** global subagents live in the root `.codex/agents/`. Codex resolves `.codex/` from the project root, so per-app subagent directories are not read the way nested `AGENTS.md` files are — keep every subagent at the root and scope it by its `developer_instructions` instead.

## Specialist Subagents — Create Per App

Add these based on what the app actually does:

| Task type | Agent name |
|---|---|
| Frontend / UI / components | `frontend-developer` |
| API / backend / services | `api-builder` |
| Database / migrations / queries | `database-developer` |
| Tests only | `test-writer` |
| Bug investigation and fix | `debugger` |

If the needed agent type is not in this table, create one on the fly, save it to `.codex/agents/`, and notify the user: **"I created a `[name]` agent to handle this — saved to `.codex/agents/[name].toml`"**

---

## What Each `developer_instructions` Must Include

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

```
✓  Read the nearest AGENTS.md for conventions and `.agents/skills/` for recipes.
✗  Read src/api/AGENTS.md and .agents/skills/add-endpoint/SKILL.md.
```

Rules on this target live in nested `AGENTS.md` files, so "the nearest `AGENTS.md`" is the correct way to point at them — never a fixed path, which only holds for one subtree.

---

## Skills Per Agent Type

Each agent type must invoke these skills. `slashforge:` skills ship with SlashForge and are always available:

| Agent | Skills to invoke |
|---|---|
| `developer`, `frontend-developer`, `api-builder` | `slashforge:brainstorm` (new features), `slashforge:plan`, `slashforge:tdd`, `slashforge:verify` (before handoff) |
| `debugger` | `slashforge:debug`, `slashforge:verify` |
| `code-reviewer` | `slashforge:request-review` |
| `test-writer` | `slashforge:tdd`, `slashforge:verify` |

Every skill named here ships with SlashForge, so there is nothing to check for and nothing to skip.

---

## File Skeleton

The generated-by marker is a TOML key, not an HTML comment or frontmatter — see `forge-instructions.md` § Generated File Markers, and read `meta.json` for the version and timestamp.

```toml
name = "code-reviewer"
description = "Reviews changes for correctness and repo convention drift before a PR."
generated_by = "[package]@[version]"
generated_at = "[ISO 8601 timestamp]"

developer_instructions = """
## Role

Review implementation work in this repo before it becomes a PR.

## Before Starting

Read the nearest AGENTS.md for conventions and `.agents/skills/` for recipes.

## Skills

- slashforge:request-review

## Workflow

1. Read the diff in full before commenting.
2. Check it against the conventions in the nearest AGENTS.md.
3. Report findings most severe first.

## Quality Checklist

- [ ] No duplicate code introduced
- [ ] No leftover debug or dead code

## When to Ask

Always ask — never assume:
- **Which branch to create this from?** — before any branch is created
- **Which branch should I target for this PR?** — before any PR is created
"""
```

**TOML string rules that will bite you:** use `"""` for multi-line strings; a literal backslash must be escaped as `\\`; and a `"""` sequence cannot appear inside the string. Markdown headings, lists and backticks are all safe.

---

## `code-reviewer` Mandatory Checklist

Every `code-reviewer` agent created must include these checks — non-negotiable regardless of the repo:

- No duplicate code introduced
- Proper component / module structure (files in the right place, correctly named)
- Code quality and conventions match the nearest `AGENTS.md`
- No leftover debug code, dead code, or temporary hacks
- No breaking changes to public APIs, exported functions, or shared interfaces — if found, **flag explicitly to the user before continuing**
- **Setup coverage** — if the diff introduces a new domain not covered by existing subagents, rules or `AGENTS.md`, raise it as a review note per `forge-coverage.md` Phase 7 section. This is a note, not a block — flag the gap, suggest the addition, but don't fail the review on its absence

If the review fails → return to the implementing agent with specific, actionable feedback. If it fails 3 times in a row → stop and escalate to the user.

---

## Scope

- Workflows should be scannable — not every scenario, just what to do and when
- Keep agents focused — a specialist agent is better than one mega-agent
- Multiple coding agents must always exist — never rely on a single agent for all implementation work
