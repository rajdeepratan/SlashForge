---
name: Claude Setup — CLAUDE.md
description: How to create CLAUDE.md at the repo root when setting up Claude for a repo
---

# Creating CLAUDE.md

`CLAUDE.md` is the entry point for every agent. Keep it under 200 lines — it is a map, not a manual.

Create this **last** — after all rules, skills, and agents exist — so the references table is accurate.

**Location:** `./CLAUDE.md` (repo root) or `./.claude/CLAUDE.md` — both are valid per Anthropic's spec. Prefer the repo root so humans discover it too.

**Generated-by marker (required).** `CLAUDE.md` does not use YAML frontmatter, so place the marker as an HTML comment on the very first line, followed by a blank line, then the normal content. See `forge-instructions.md` § Generated File Markers for details — read `meta.json` for the version and timestamp.

```markdown
<!-- generated_by: [package]@[version] generated_at: [ISO 8601 timestamp] -->

# [project name]
...
```

**If the repo has `AGENTS.md`:** Claude Code reads `CLAUDE.md`, not `AGENTS.md`. If you want both to share instructions, make `CLAUDE.md` start with `@AGENTS.md` to import it, then add any Claude-specific additions below.

---

## Required Sections (in this order)

1. **Agent orchestration table** — user intent phrases mapped to agent names (put this first)
2. **Project References table** — every rule and skill file listed by path
3. **Project overview** — what this repo does and who uses it
4. **Tech stack table** — language, framework, key libraries, package manager
5. **Commands** — install, dev, build, test, lint — must be **exact runnable commands**, not descriptions (agents execute these directly without asking)
6. **Project structure** — annotated directory tree of the main source
7. **Architecture overview** — how pieces connect; key shared abstractions
8. **Non-negotiable rules summary** — 6–10 bullets linking to `.claude/rules/` for detail

---

## Agent Orchestration Table

Maps natural language intent to the right entry point. For whole-task requests, route to a slash command (`/forge:code`, `/forge:code -quick`, `/forge:investigate`) — the command handles the full workflow. For mid-task intents that arise inside an active workflow, route directly to the agent that owns that step.

```markdown
| When the user says... | Invoke |
|---|---|
| "investigate", "does this bug exist?", "reproduce this", "root-cause" | `/forge:investigate` |
| "build", "add a feature", "change X", "fix Y" | `/forge:code` |
| "small change", "tiny fix", "one-liner" | `/forge:code -quick` |
| "review", "check the code" (mid-task) | `code-reviewer` agent |
| "push", "create a PR", "branch" (mid-task) | `git` agent |
| "write tests", "add coverage" (mid-task) | `test-writer` agent |
| anything else | `developer` agent |
```

The catch-all row (`anything else → developer`) is **mandatory** and must always be the last row — it ensures every request has a handler even if it doesn't match a specific pattern.

---

## Project References Table

Lists every rule, skill, and agent file so agents know what exists:

```markdown
| Type | File |
|---|---|
| Rule | `.claude/rules/git.md` |
| Rule | `.claude/rules/typescript.md` |
| Skill | `.claude/skills/add-endpoint.md` |
| Agent | `.claude/agents/debugger.md` |
| Agent | `.claude/agents/frontend-developer.md` |
```

---

## If CLAUDE.md Exceeds 200 Lines

Move overflow content to a rule or skill file and replace it with a one-line link. Common offenders:

| Section that grows | Move it to |
|---|---|
| Architecture detail | `.claude/rules/architecture.md` |
| Complex commands / scripts | `.claude/rules/commands.md` |
| Onboarding notes | `.claude/rules/onboarding.md` |

Never truncate — always move and link.

---

## Imports with `@path`

CLAUDE.md supports `@path/to/file.md` imports — Claude expands them at session start. Use this to pull in context without inlining it:

```markdown
See @README.md for project overview and @package.json for available scripts.

## Git workflow
@.claude/rules/git.md
```

Relative paths resolve from the file containing the import. Absolute paths work too. Max depth is 5 hops. Useful for monorepos sharing a common rule file, or for pointing at docs that live outside `.claude/`.

---

## Monorepo — Per-app CLAUDE.md

Each app's `CLAUDE.md` is a complete, self-contained entry point for that app. Its agent orchestration table should only list the app's own specialist agents — **do not re-list `git` and `code-reviewer`**, they are global agents that live at the root and are inherited automatically.

```markdown
| When the user says... | Invoke |
|---|---|
| "investigate", "reproduce this", "root-cause" | `/forge:investigate` |
| "build", "add a feature", "change X", "fix Y" | `/forge:code` |
| "small change", "tiny fix", "one-liner" | `/forge:code -quick` |
| "fix a bug", "debug" (mid-task) | `frontend-developer` or `debugger` as appropriate |
| "write tests" (mid-task) | `test-writer` |
| anything else | `developer` |
```

The root `CLAUDE.md` orchestration table covers `git`, `code-reviewer`, and the slash commands. Per-app tables only list specialist agents specific to the app.

---

## Scope

- Summary only — detail belongs in rule or skill files, not here
- If a section grows past ~20 lines, move the detail to a rule or skill file and link it
- Agents read `CLAUDE.md` first — keep it fast to scan
