---
name: Agent Setup — AGENTS.md
description: How to create AGENTS.md at the repo root when setting up Cursor or Codex for a repo
---

# Creating AGENTS.md

`AGENTS.md` is the entry point for every agent. Keep it under 200 lines — it is a map, not a manual.

Create this **last** — after all rules, skills, and agents exist — so the references table is accurate.

**Location:** `./AGENTS.md` (repo root). Both Cursor and Codex also read `AGENTS.md` from subdirectories, applying the nearest one to the files being worked on — see § Nested AGENTS.md below.

**Generated-by marker (required).** `AGENTS.md` does not use YAML frontmatter, so place the marker as an HTML comment on the very first line, followed by a blank line, then the normal content. See `forge-instructions.md` § Generated File Markers for details — read `meta.json` for the version and timestamp.

```markdown
<!-- generated_by: [package]@[version] generated_at: [ISO 8601 timestamp] -->

# [project name]
...
```

**If the repo has `CLAUDE.md`:** it was written by a Claude Code setup, and it is not yours to rewrite. Surface the choice during Phase 1 clarifying questions — collapse it to a one-line `@AGENTS.md` import, leave it untouched, or mirror the content into both — and do nothing to it without an answer. `AGENTS.md` is the source of truth on this target.

---

## Required Sections (in this order)

1. **Task routing table** — user intent phrases mapped to entry points (put this first)
2. **Project References table** — every rule and skill file listed by path
3. **Project overview** — what this repo does and who uses it
4. **Tech stack table** — language, framework, key libraries, package manager
5. **Commands** — install, dev, build, test, lint — must be **exact runnable commands**, not descriptions (agents execute these directly without asking)
6. **Project structure** — annotated directory tree of the main source
7. **Architecture overview** — how pieces connect; key shared abstractions
8. **Non-negotiable rules summary** — 6–10 bullets linking to the rule files for detail

---

## Task Routing Table

Maps natural language intent to the right entry point. For whole-task requests, route to a command (`/slashforge:code`, `/slashforge:code -quick`, `/slashforge:investigate`) — the command handles the full workflow. For mid-task intents that arise inside an active workflow, route to the subagent that owns that step.

```markdown
| When the user says... | Invoke |
|---|---|
| "investigate", "does this bug exist?", "reproduce this", "root-cause" | `/slashforge:investigate` |
| "build", "add a feature", "change X", "fix Y" | `/slashforge:code` |
| "small change", "tiny fix", "one-liner" | `/slashforge:code -quick` |
| "review", "check the code" (mid-task) | `code-reviewer` subagent |
| "push", "create a PR", "branch" (mid-task) | `git` subagent |
| "write tests", "add coverage" (mid-task) | `test-writer` subagent |
| anything else | `developer` subagent |
```

The catch-all row (`anything else → developer`) is **mandatory** and must always be the last row — it ensures every request has a handler even if it doesn't match a specific pattern.

---

## Project References Table

Lists every rule, skill, and subagent file so agents know what exists:

<!--target:cursor-->
```markdown
| Type | File |
|---|---|
| Rule | `.cursor/rules/git.mdc` |
| Rule | `.cursor/rules/typescript.mdc` |
| Skill | `.cursor/skills/add-endpoint/SKILL.md` |
| Subagent | `.cursor/agents/debugger.md` |
| Subagent | `.cursor/agents/frontend-developer.md` |
```
<!--/target-->
<!--target:codex-->
```markdown
| Type | File |
|---|---|
| Rule | `src/api/AGENTS.md` (nested — governs `src/api/`) |
| Rule | `AGENTS.md` § Non-negotiable rules (repo-wide) |
| Skill | `.agents/skills/add-endpoint/SKILL.md` |
| Subagent | `.codex/agents/debugger.toml` |
| Subagent | `.codex/agents/frontend-developer.toml` |
```

Codex has no rules directory, so a rule is either a nested `AGENTS.md` or a section of
the root one. List both kinds here — a reader must be able to find every rule from this
table alone.
<!--/target-->

---

## Graphify Section

If Graphify was provisioned during setup, `AGENTS.md` must carry a `## graphify` section instructing the agent to consult `graphify-out/graph.json` before answering codebase questions, and to rebuild the graph after code changes.

On the Claude target, `graphify claude install` appends this section itself. That command has no equivalent here, so **the kit writes the section** — which means it sits inside the kit's `generated_by` marker and is refreshed on re-run, rather than being left alone as user-owned content.

```markdown
## graphify

This repo has a knowledge graph at `graphify-out/graph.json`.

- Before answering a question about the codebase, its architecture, or how files
  relate, query the graph first rather than grepping blind.
- After changing code, rebuild it: `graphify update .`
- The post-commit hook (`graphify hook install`) rebuilds it automatically on commit.
```

---

## If AGENTS.md Exceeds 200 Lines

Move overflow content to a rule or skill file and replace it with a one-line link. Common offenders:

<!--target:cursor-->
| Section that grows | Move it to |
|---|---|
| Architecture detail | `.cursor/rules/architecture.mdc` |
| Complex commands / scripts | `.cursor/rules/commands.mdc` |
| Onboarding notes | `.cursor/rules/onboarding.mdc` |
<!--/target-->
<!--target:codex-->
| Section that grows | Move it to |
|---|---|
| Architecture detail | a nested `AGENTS.md` at the directory it describes |
| Complex commands / scripts | a skill under `.agents/skills/` |
| Onboarding notes | `docs/` with a one-line link from here |
<!--/target-->

Never truncate — always move and link.

---

## Nested AGENTS.md

Both vendors load every `AGENTS.md` from the repo root down to the file being worked on, with the **closest file winning** on a conflict. Use this for per-directory conventions:

```
AGENTS.md                 # repo-wide: stack, commands, routing table
apps/web/AGENTS.md        # applies only under apps/web/
apps/api/AGENTS.md        # applies only under apps/api/
```

A nested file is a complete entry point for its subtree, not a diff against the root. It should not repeat the root's stack table, but it must name anything that differs.

<!--target:codex-->
This is also Codex's rules mechanism. A rule that governs one subtree belongs in that
subtree's `AGENTS.md`; a repo-wide rule belongs in the root file's rules summary. Do not
create `.codex/rules/` — nothing reads it.
<!--/target-->

---

## Monorepo — Per-app AGENTS.md

Each app's `AGENTS.md` is a complete, self-contained entry point for that app. Its routing table should only list the app's own specialist subagents — **do not re-list `git` and `code-reviewer`**, they are global and live at the root, inherited automatically.

```markdown
| When the user says... | Invoke |
|---|---|
| "investigate", "reproduce this", "root-cause" | `/slashforge:investigate` |
| "build", "add a feature", "change X", "fix Y" | `/slashforge:code` |
| "small change", "tiny fix", "one-liner" | `/slashforge:code -quick` |
| "fix a bug", "debug" (mid-task) | `frontend-developer` or `debugger` as appropriate |
| "write tests" (mid-task) | `test-writer` |
| anything else | `developer` |
```

The root `AGENTS.md` routing table covers `git`, `code-reviewer`, and the commands. Per-app tables only list specialist subagents specific to the app.

---

## Scope

- Summary only — detail belongs in rule or skill files, not here
- If a section grows past ~20 lines, move the detail to a rule or skill file and link it
- Agents read `AGENTS.md` first — keep it fast to scan
