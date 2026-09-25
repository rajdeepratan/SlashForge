---
<!--target:claude-->
name: Claude Setup Instructions
description: Entry point for setting up CLAUDE.md, agents, rules, and skills in any repo — golden rules, creation order, and verification
<!--/target-->
<!--target:cursor-->
name: Agent Setup Instructions
description: Entry point for setting up AGENTS.md, subagents, rules, and skills in any repo — golden rules, creation order, and verification
<!--/target-->
<!--target:codex-->
name: Agent Setup Instructions
description: Entry point for setting up AGENTS.md, subagents, rules, and skills in any repo — golden rules, creation order, and verification
<!--/target-->
<!--target:neutral-->
name: Agent Setup Instructions
description: Entry point for setting up a repo's entry file, agents, rules, and skills — golden rules, creation order, and verification
<!--/target-->
---

<!--target:claude-->
# Claude Setup Instructions

Reference this file whenever asked to create `CLAUDE.md`, agents, rules, or skills in any repo.
<!--/target-->
<!--target:cursor-->
# Agent Setup Instructions

Reference this file whenever asked to create `AGENTS.md`, subagents, rules, or skills in any repo.
<!--/target-->
<!--target:codex-->
# Agent Setup Instructions

Reference this file whenever asked to create `AGENTS.md`, subagents, rules, or skills in any repo.
<!--/target-->
<!--target:neutral-->
# Agent Setup Instructions

Reference this file whenever asked to create the repo's entry file, agents, rules, or skills.
<!--/target-->

> **Also read:** [`forge-workflow.md`](forge-workflow.md) — required companion file covering the end-to-end intake-to-PR workflow. Read both before proceeding.

---

## Golden Rules (always enforced)

- **Every generated `.md` file must stay under 200 lines, except a skill's `SKILL.md`, which may run to 500 lines.** Split into focused files if exceeded; a skill moves reference material into sibling files.
<!--target:claude-->
- `CLAUDE.md` → repo root. Agents / rules / skills → inside `.claude/` only. Never in root.
<!--/target-->
<!--target:cursor-->
- `AGENTS.md` → repo root. Subagents / rules / skills → inside `.cursor/` only. Never in root.
<!--/target-->
<!--target:codex-->
- `AGENTS.md` → repo root (and any subdirectory it governs). Subagents → `.codex/agents/`; skills → `.agents/skills/`. Never loose in root.
<!--/target-->
<!--target:neutral-->
- The entry file → repo root. Agents / rules / skills → inside the host's own config directory only. Never in root.
<!--/target-->
- Rules and skills must reflect **actual patterns in this codebase**, not generic best practices.
<!--target:claude-->
- Agent files reference **directories** (`.claude/rules/`), never specific file paths — they go stale.
<!--/target-->
<!--target:cursor-->
- Agent files reference **directories** (`.cursor/rules/`), never specific file paths — they go stale.
<!--/target-->
<!--target:codex-->
- Subagent instructions reference **the nearest `AGENTS.md`** and directories, never specific file paths — they go stale.
<!--/target-->
<!--target:neutral-->
- Agent files reference **directories**, never specific file paths — they go stale.
<!--/target-->
- No stale references — if a file is renamed or split, update every file that pointed to it.
<!--target:claude-->
- `CLAUDE.md` Project References table must list every rule and skill file by name.
<!--/target-->
<!--target:cursor-->
- `AGENTS.md` Project References table must list every rule and skill file by name.
<!--/target-->
<!--target:codex-->
- The root `AGENTS.md` Project References table must list every rule (nested `AGENTS.md` or root section) and skill by name.
<!--/target-->
<!--target:neutral-->
- The entry file's Project References table must list every rule and skill file by name.
<!--/target-->
<!--target:claude-->
- **Every file you create or regenerate in `.claude/` or `CLAUDE.md` must carry a generated-by marker** (see below).
<!--/target-->
<!--target:cursor-->
- **Every file you create or regenerate in `.cursor/` or `AGENTS.md` must carry a generated-by marker** (see below).
<!--/target-->
<!--target:codex-->
- **Every file you create or regenerate in `.codex/`, `.agents/skills/` or any `AGENTS.md` must carry a generated-by marker** (see below).
<!--/target-->
<!--target:neutral-->
- **Every file you create or regenerate, including the entry file, must carry a generated-by marker** (see below).
<!--/target-->

---

## File Structure

<!--target:claude-->
| File | Location |
|---|---|
| `CLAUDE.md` | Repo root |
| Agents | `.claude/agents/*.md` |
| Rules | `.claude/rules/*.md` |
| Skills | `.claude/skills/<name>/SKILL.md` |
| Commands | `.claude/commands/*.md` |
<!--/target-->
<!--target:cursor-->
| File | Location |
|---|---|
| `AGENTS.md` | Repo root (and any subdirectory it governs) |
| Subagents | `.cursor/agents/*.md` |
| Rules | `.cursor/rules/*.mdc` |
| Skills | `.cursor/skills/<name>/SKILL.md` |
| Commands | `.cursor/commands/*.md` |
| Hooks | `.cursor/hooks.json` |
<!--/target-->
<!--target:codex-->
| File | Location |
|---|---|
| `AGENTS.md` | Repo root (and any subdirectory it governs) |
| Subagents | `.codex/agents/*.toml` |
| Rules | nested `AGENTS.md` — Codex has no rules directory |
| Skills | `.agents/skills/<name>/SKILL.md` |
| Commands | none — prompts are deprecated; write a skill |
| Hooks | `.codex/hooks.json` (beta; needs `[features] codex_hooks = true`) |
<!--/target-->
<!--target:neutral-->
| File | Location |
|---|---|
| Entry file | Repo root |
| Agents | the host's agents directory |
| Rules | the host's rules directory |
| Skills | the host's skills directory |
<!--/target-->

---

## Generated File Markers

<!--target:claude-->
Every file you write into a target repo's `.claude/` (rules, skills, agents, commands, hooks) and the root `CLAUDE.md` must include a marker that identifies the kit version that created it. This is what makes safe, non-destructive re-runs possible.
<!--/target-->
<!--target:cursor-->
Every file you write into a target repo's `.cursor/` (rules, skills, subagents, commands, hooks) and the root `AGENTS.md` must include a marker that identifies the kit version that created it. This is what makes safe, non-destructive re-runs possible.
<!--/target-->
<!--target:codex-->
Every file you write into a target repo — subagents in `.codex/agents/`, skills in `.agents/skills/`, and every `AGENTS.md` — must include a marker that identifies the kit version that created it. This is what makes safe, non-destructive re-runs possible.
<!--/target-->
<!--target:neutral-->
Every file you write into a target repo, including its entry file, must include a marker that identifies the kit version that created it. This is what makes safe, non-destructive re-runs possible.
<!--/target-->

**Read the kit's version first:** the installer writes `meta.json` at the root of the guides directory (same folder as this file). Read it to get `version`, `package`, and `installed_at`. Use those values as the `generated_by` and `generated_at` fields.

**For files with YAML frontmatter** (rules, skills, agents, commands, hooks — anything with `---` fences), add these fields alongside `name` and `description`:

```yaml
---
name: <file name>
description: <one-line description>
generated_by: <package>@<version>
generated_at: <ISO 8601 timestamp>
---
```

<!--target:claude-->
**For `CLAUDE.md`** (which does not use YAML frontmatter), add an HTML comment as the very first line, then a blank line, then the normal content:
<!--/target-->
<!--target:cursor-->
**For `AGENTS.md`** (which does not use YAML frontmatter), add an HTML comment as the very first line, then a blank line, then the normal content:
<!--/target-->
<!--target:codex-->
**For `AGENTS.md`** (which does not use YAML frontmatter), add an HTML comment as the very first line, then a blank line, then the normal content. **For `.codex/agents/*.toml`**, the marker is a pair of TOML keys instead — `generated_by` and `generated_at` alongside `name`:
<!--/target-->
<!--target:neutral-->
**For the entry file** (which does not use YAML frontmatter), add an HTML comment as the very first line, then a blank line, then the normal content:
<!--/target-->

```markdown
<!-- generated_by: <package>@<version> generated_at: <ISO 8601 timestamp> -->

# <project name>
...
```

**Why these matter:**
- On re-run, the Update Existing Setup flow reads the markers to tell kit-generated files from user-edited ones. Files with no marker — or with a marker the user has changed — are treated as user content and never overwritten without asking.
- The version marker lets the flow detect drift: if the installed kit is newer than the marker in a file, that file is a candidate for a refresh.
- If the user removes or edits a marker, the file is treated as user-owned. That's the opt-out.

**Never write a marker claiming a version the kit didn't actually produce.** Read `meta.json` every time. Do not hard-code.

---

## Creation Order

Follow this order — each step depends on the previous:

1. Understand the codebase (see Step 1 below)
2. Ask clarifying questions (see Step 2 below)
<!--target:claude-->
3. Create rule files → see [`forge-rules.md`](forge-rules.md)
4. Create skill files → see [`forge-skills.md`](forge-skills.md)
5. Create agent files → see [`forge-agents.md`](forge-agents.md)
6. Create slash commands → see [`forge-commands.md`](forge-commands.md)
7. Configure hooks if team wants automated behaviors → see [`forge-hooks.md`](forge-hooks.md)
8. Create `CLAUDE.md` last → see [`forge-claude-md.md`](forge-claude-md.md)
9. Verify (see Step 9 below)
<!--/target-->
<!--target:cursor-->
3. Create rule files → see [`forge-rules.md`](forge-rules.md)
4. Create skill files → see [`forge-skills.md`](forge-skills.md)
5. Create subagent files → see [`forge-agents.md`](forge-agents.md)
6. Create commands → see [`forge-commands.md`](forge-commands.md)
7. Configure hooks if team wants automated behaviors → see [`forge-hooks.md`](forge-hooks.md)
8. Create `AGENTS.md` last → see [`forge-agents-md.md`](forge-agents-md.md)
9. Verify (see Step 9 below)
<!--/target-->
<!--target:codex-->
3. Encode rules as nested `AGENTS.md` files → see [`forge-rules.md`](forge-rules.md)
4. Create skill files → see [`forge-skills.md`](forge-skills.md)
5. Create subagent files → see [`forge-agents-codex.md`](forge-agents-codex.md)
6. Configure hooks if team wants automated behaviors → see [`forge-hooks.md`](forge-hooks.md)
7. Create the root `AGENTS.md` last → see [`forge-agents-md.md`](forge-agents-md.md)
8. Verify (see Step 9 below)

There is no command step on this target: Codex custom prompts are deprecated, so a
would-be command is expressed as a skill in step 4.
<!--/target-->
<!--target:neutral-->
3. Create rule files → see [`forge-rules.md`](forge-rules.md)
4. Create skill files → see [`forge-skills.md`](forge-skills.md)
5. Create agent files → see [`forge-agents.md`](forge-agents.md)
6. Create commands → see [`forge-commands.md`](forge-commands.md)
7. Configure hooks if team wants automated behaviors → see [`forge-hooks.md`](forge-hooks.md)
8. Create the repo's entry file last
9. Verify (see Step 9 below)
<!--/target-->

---

## Step 1 — Understand the Codebase

Read the repo before writing anything. Identify:

- **Language, runtime, framework** and primary libraries (state, HTTP, testing, UI, database)
- **Project structure** — monorepo? multiple apps? where is the main work target?
- **Existing patterns** — shared abstractions, naming conventions, import resolution
- **Build & dev commands** — install, dev, build, test, lint

Read: manifest files, config files, and representative source files across different layers.

<!--target:claude-->
**If it's a monorepo:** create one `CLAUDE.md` at the repo root (shared conventions, global agents, repo map) and one `CLAUDE.md` per app (app-specific stack, commands, rules, skills, and agents). Claude Code reads `CLAUDE.md` files and `.claude/` folders up the directory tree — place each file at the level where its context applies:

| What | Root | Per-app |
|---|---|---|
| `CLAUDE.md` | Repo overview, shared rules, links to apps | App-specific stack, commands, rules, skills, and agents |
| `.claude/agents/` | Global agents: `git`, `code-reviewer` | Specialist agents: `frontend-developer`, `api-builder`, `debugger`, etc. |
| `.claude/rules/` | Shared conventions (git, commit style) | App-specific coding standards |
| `.claude/skills/` | — | App-specific recipes |
| `.claude/commands/` | Shared commands (e.g. `/slashforge:setup`) | App-specific commands (e.g. `/run-checks`, `/add-metric`) |
<!--/target-->
<!--target:cursor-->
**If it's a monorepo:** create one `AGENTS.md` at the repo root (shared conventions, global subagents, repo map) and one `AGENTS.md` per app. Cursor reads `AGENTS.md` files up the directory tree, nearest first, and scopes nested skills to their directory — place each file at the level where its context applies:

| What | Root | Per-app |
|---|---|---|
| `AGENTS.md` | Repo overview, shared rules, links to apps | App-specific stack, commands, rules, skills, and subagents |
| `.cursor/agents/` | Global subagents: `git`, `code-reviewer` | Specialist subagents: `frontend-developer`, `api-builder`, `debugger`, etc. |
| `.cursor/rules/` | Shared conventions (git, commit style), `alwaysApply: true` | App-specific standards, scoped with `globs` |
| `.cursor/skills/` | — | App-specific recipes |
| `.cursor/commands/` | Shared commands | App-specific commands (e.g. `/run-checks`, `/add-metric`) |
<!--/target-->
<!--target:codex-->
**If it's a monorepo:** create one `AGENTS.md` at the repo root (shared conventions, repo map) and one `AGENTS.md` per app. Codex loads every `AGENTS.md` from the root down to the working directory, closest file winning — that nesting *is* the rules mechanism:

| What | Root | Per-app |
|---|---|---|
| `AGENTS.md` | Repo overview, repo-wide rules, links to apps | App-specific stack, commands, and rules |
| `.codex/agents/` | Every subagent lives here | — Codex resolves `.codex/` from the project root, so per-app subagent dirs are not read |
| `.agents/skills/` | Shared recipes | App-specific recipes |
<!--/target-->
<!--target:neutral-->
**If it's a monorepo:** create one entry file at the repo root (shared conventions, global agents, repo map) and one per app. Hosts read entry files up the directory tree, nearest first — place each file at the level where its context applies. Global agents (`git`, `code-reviewer`) live at the root; specialist agents belong to the app they serve.
<!--/target-->

---

## Step 2 — Ask Clarifying Questions

Ask before writing if any of the following are unclear:

- Is this a monorepo with multiple apps, or a single-app repo?
- What is this repo's primary purpose and who uses it?
- What are the most common day-to-day developer tasks?
- Are there workflows complex enough to warrant a specialist agent?
- Any team conventions or rules not visible from reading the code?

Do not guess — a wrong assumption produces misleading documentation.

---

## Step 9 — Verify

<!--target:claude-->
```bash
# No file over its limit: 200 lines, or 500 for a skill's SKILL.md.
# find, not a recursive glob: bash leaves globstar off, so one would stop a folder deep.
find CLAUDE.md .claude \( -path .claude/setup -o -path .claude/commands/slashforge \) -prune -o -name '*.md' -exec wc -l {} + \
  | awk '$NF == "total" { next } { limit = ($NF ~ /SKILL\.md$/) ? 500 : 200 } $1 > limit { print "over " limit ": " $0; bad = 1 } END { exit bad }'

# No stale file references
grep -r "rules\.md\|skills\.md\|agents\.md" CLAUDE.md .claude/

# Every file listed in CLAUDE.md Project References actually exists
# (manually cross-check the table in CLAUDE.md against ls .claude/rules/ and ls .claude/skills/)
```
<!--/target-->
<!--target:cursor-->
```bash
# No file over its limit: 200 lines, or 500 for a skill's SKILL.md.
# find, not a recursive glob: bash leaves globstar off, so one would stop a folder deep.
find AGENTS.md .cursor \( -name '*.md' -o -name '*.mdc' \) -exec wc -l {} + \
  | awk '$NF == "total" { next } { limit = ($NF ~ /SKILL\.md$/) ? 500 : 200 } $1 > limit { print "over " limit ": " $0; bad = 1 } END { exit bad }'

# No stale file references
grep -r "rules\.md\|skills\.md\|agents\.md" AGENTS.md .cursor/

# Rules must be .mdc — a plain .md in .cursor/rules/ is silently ignored
ls .cursor/rules/ | grep -v '\.mdc$' || echo "all rules are .mdc"

# Every file listed in the AGENTS.md Project References table actually exists
```
<!--/target-->
<!--target:codex-->
```bash
# No file over its limit: 200 lines, or 500 for a skill's SKILL.md.
# find, not a recursive glob: bash leaves globstar off, so one would stop a folder deep.
find . \( -path ./node_modules -o -path ./.git -o -path './.agents/setup' -o -path './.agents/skills/slashforge-*' \) -prune -o \( -name AGENTS.md -o -name SKILL.md \) -exec wc -l {} + \
  | awk '$NF == "total" { next } { limit = ($NF ~ /SKILL\.md$/) ? 500 : 200 } $1 > limit { print "over " limit ": " $0; bad = 1 } END { exit bad }'

# Subagents must be TOML and must parse
ls .codex/agents/*.toml

# Every file listed in the root AGENTS.md Project References table actually exists
```
<!--/target-->
<!--target:neutral-->
```bash
# No file over its limit (200 lines, 500 for a skill's SKILL.md) — check the entry file and every generated file
# No stale file references — grep the entry file and the config directory
# Every file listed in the entry file's Project References table actually exists
```
<!--/target-->

Fix anything found before finishing.

---

## Updating an Existing Setup

Whether adding to a partially set up repo or making ongoing updates to a complete one:

1. Read `meta.json` from the guides directory to learn the **current** kit version
2. Read every affected file in full before touching anything
<!--target:claude-->
3. For each file in the target repo's `.claude/` and `CLAUDE.md`:
<!--/target-->
<!--target:cursor-->
3. For each file in the target repo's `.cursor/` and every `AGENTS.md`:
<!--/target-->
<!--target:codex-->
3. For each file in the target repo's `.codex/agents/`, `.agents/skills/` and every `AGENTS.md`:
<!--/target-->
<!--target:neutral-->
3. For each generated file in the target repo, including its entry file:
<!--/target-->
   - If the file has a `generated_by` marker **matching the current kit version** → safe to refresh the generated content
   - If the marker is from an **older kit version** → the file is kit-generated but stale. Propose a refresh; ask the user before overwriting
   - If the marker is **missing or edited** → treat as user-owned. Edit to fill gaps only; do not overwrite
<!--target:claude-->
4. Identify gaps — missing agents, outdated rules, incomplete `CLAUDE.md` sections
<!--/target-->
<!--target:cursor-->
4. Identify gaps — missing subagents, outdated rules, incomplete `AGENTS.md` sections
<!--/target-->
<!--target:codex-->
4. Identify gaps — missing subagents, outdated rules, incomplete `AGENTS.md` sections
<!--/target-->
<!--target:neutral-->
4. Identify gaps — missing agents, outdated rules, incomplete entry-file sections
<!--/target-->
5. Do not overwrite user-owned files wholesale — edit to fill gaps and preserve what is correct
6. Every file you create or refresh gets a fresh marker with the current version and timestamp
<!--target:claude-->
7. New rule/skill/agent added → update `CLAUDE.md` Project References table
<!--/target-->
<!--target:cursor-->
7. New rule/skill/subagent added → update the `AGENTS.md` Project References table
<!--/target-->
<!--target:codex-->
7. New rule/skill/subagent added → update the root `AGENTS.md` Project References table
<!--/target-->
<!--target:neutral-->
7. New rule/skill/agent added → update the entry file's Project References table
<!--/target-->
8. File renamed or split → grep for all references and update them
9. Always re-run the verify step after any change
<!--target:claude-->
10. If a rule file no longer applies, delete it and remove it from the CLAUDE.md Project References table
<!--/target-->
<!--target:cursor-->
10. If a rule file no longer applies, delete it and remove it from the `AGENTS.md` Project References table
<!--/target-->
<!--target:codex-->
10. If a rule no longer applies, delete its nested `AGENTS.md` (or its section of the root file) and remove it from the Project References table
<!--/target-->
<!--target:neutral-->
10. If a rule file no longer applies, delete it and remove it from the entry file's Project References table
<!--/target-->

**Triggers for updating:** new major dependency adopted, team agrees on a new pattern, an agent consistently produces wrong output (signals a rule gap), a skill references files that have moved, or a significant refactor changes how a layer is structured.

## When to Split a File

Split at 200 lines (500 for a `SKILL.md`) by meaning — by phase (scaffold vs wiring), by concern (frontend vs backend), or by frequency (common vs rare tasks). Name splits clearly: `add-metric-scaffold.md` + `add-metric-wiring.md`, not `add-metric-part1.md`.

## What NOT to Put in These Files

| Don't put this here | It belongs here instead |
|---|---|
| Step-by-step recipes | Skills file |
| Coding standards | Rules file |
| Project history / decisions | Git commit messages / ADRs |
| Edge cases and exceptions | Inline code comments |
| Invented patterns not in the codebase | Nowhere — don't invent |
