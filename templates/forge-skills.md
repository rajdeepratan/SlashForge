---
<!--target:claude-->
name: Claude Setup — Skill Files
description: How to create skill files in .claude/skills/ when setting up Claude for a repo
<!--/target-->
<!--target:cursor-->
name: Agent Setup — Skill Files
description: How to create skill files in .cursor/skills/ when setting up Cursor for a repo
<!--/target-->
<!--target:codex-->
name: Agent Setup — Skill Files
description: How to create skill files in .agents/skills/ when setting up Codex for a repo
<!--/target-->
<!--target:neutral-->
name: Agent Setup — Skill Files
description: How to create skill files when setting up a repo — one directory per recipe
<!--/target-->
---

# Creating Skill Files

<!--target:claude-->
Skills = **step-by-step recipes** Claude can load on demand. Unlike CLAUDE.md (always in context) or rules (loaded per-path), a skill's body only enters context when it's invoked — so long reference material costs almost nothing until needed.
<!--/target-->
<!--target:cursor-->
Skills = **step-by-step recipes** the agent can load on demand. Unlike `AGENTS.md` (always in context) or rules (loaded per-glob), a skill's body only enters context when it's invoked — so long reference material costs almost nothing until needed.
<!--/target-->
<!--target:codex-->
Skills = **step-by-step recipes** the agent can load on demand. Unlike `AGENTS.md` (always in context for its subtree), a skill's body only enters context when it's invoked — so long reference material costs almost nothing until needed.

Skills matter more on this target than elsewhere: Codex custom prompts are deprecated, so
a repo command is expressed as a skill rather than a prompt file.
<!--/target-->
<!--target:neutral-->
Skills = **step-by-step recipes** the agent can load on demand. Unlike the entry file (always in context) or rules (loaded per-path), a skill's body only enters context when it's invoked — so long reference material costs almost nothing until needed.
<!--/target-->

Derive tasks from the repo's domain — think "add a new X", "create a Y", "wire up a Z". Examples: `add-endpoint`, `add-migration`, `add-page`, `add-metric`, `add-handler`.

## Check What Already Ships

Before creating a new skill, check whether SlashForge already ships one. `slashforge:brainstorm`, `slashforge:plan`, `slashforge:debug`, `slashforge:tdd`, `slashforge:verify`, `slashforge:request-review`, `slashforge:review-feedback`, `slashforge:worktree` and `slashforge:parallel` cover the general development disciplines. Skills you write should be about *this repo* — how to add an endpoint here, how to run a migration here — not general practice.

## What Deserves a Skill

Create a skill when a task meets all three:
1. **Repeatable** — done regularly, not once
2. **Multi-step** — more than 2–3 non-obvious steps
3. **Pattern-dependent** — getting it wrong without the recipe would produce inconsistent code

If a task is trivial, one-off, or fully handled by an agent's built-in workflow — skip it.

---

## File Location — Directory with `SKILL.md`

<!--target:claude-->
Anthropic's current spec: each skill is a **directory** containing a `SKILL.md` entrypoint, not a flat `.md` file.

```
.claude/skills/
└── add-endpoint/
    ├── SKILL.md          # Entrypoint (required)
    ├── template.ts       # Optional template Claude fills in
    └── examples/
        └── sample.ts     # Optional example output
```

The directory name becomes the slash command (`/add-endpoint`). Supporting files are only loaded when `SKILL.md` references them — keep large reference docs, templates, and scripts in separate files so they don't consume context until needed.

> **Note:** Flat `.claude/commands/*.md` files still work as a legacy form (Anthropic merged commands into skills). Prefer the `SKILL.md` directory format for new skills.
<!--/target-->
<!--target:cursor-->
Each skill is a **directory** containing a `SKILL.md` entrypoint, not a flat `.md` file.

```
.cursor/skills/
└── add-endpoint/
    ├── SKILL.md          # Entrypoint (required)
    ├── template.ts       # Optional template the agent fills in
    └── examples/
        └── sample.ts     # Optional example output
```

The directory name becomes the command (`/add-endpoint`) and **`name` in the frontmatter
must match it exactly** — lowercase letters, numbers and hyphens only. Supporting files
are only loaded when `SKILL.md` references them.

A skill in a nested project directory is automatically scoped to files under it, so
`apps/web/.cursor/skills/deploy-web/` only surfaces when working in `apps/web/`.
<!--/target-->
<!--target:codex-->
Each skill is a **directory** containing a `SKILL.md` entrypoint, not a flat `.md` file.

```
.agents/skills/
└── add-endpoint/
    ├── SKILL.md          # Entrypoint (required)
    ├── scripts/          # Optional CLI scripts Codex invokes
    ├── references/       # Optional reference material
    └── assets/           # Optional templates and fixtures
```

The directory name becomes the command and **`name` in the frontmatter must match it
exactly** — lowercase letters, numbers and hyphens only. Supporting files are only loaded
when `SKILL.md` references them.
<!--/target-->
<!--target:neutral-->
Each skill is a **directory** containing a `SKILL.md` entrypoint, not a flat `.md` file. The directory name becomes the command, and `name` in the frontmatter must match it exactly — lowercase letters, numbers and hyphens only. Supporting files are only loaded when `SKILL.md` references them.
<!--/target-->

## What Each `SKILL.md` Must Include

1. **Reference file to read first** — the rule or source file that governs this area
2. **Steps in dependency order** — what to do and in what sequence
3. **Code snippets** — using this repo's actual patterns, not generic examples
4. **Verify checklist** — how to confirm the task was done correctly

Keep `SKILL.md` under 500 lines. Split reference material into sibling files.

Every `SKILL.md` must include the generated-by marker in its frontmatter — see `forge-instructions.md` § Generated File Markers.

---

## File Skeleton

```markdown
---
name: add-endpoint
description: Add a new HTTP endpoint — use when the user asks to create an API route, add a handler, or expose a new service operation
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---

## Before Starting

<!--target:claude-->
Read: `.claude/rules/api.md`
<!--/target-->
<!--target:cursor-->
Read: `.cursor/rules/api.mdc`
<!--/target-->
<!--target:codex-->
Read: the nearest `AGENTS.md`
<!--/target-->
<!--target:neutral-->
Read: the repo's rule file for this area
<!--/target-->

## Steps

1. [first step]
2. [second step]
...

## Verify

- [ ] [check one]
- [ ] [check two]
```

---

## Useful Frontmatter Fields (all optional except `description`)

<!--target:claude-->
| Field | When to use |
|---|---|
| `description` | Required. Front-load the key trigger phrase — the combined text is truncated at 1,536 characters in Claude's skill listing. |
| `when_to_use` | Extra trigger phrases (e.g. "user asks to add a route"). Counts toward the 1,536-char cap. |
| `allowed-tools` | Pre-approve specific tools for this skill (e.g. `Bash(npm run *)`). Skill still follows global permissions for unlisted tools. |
| `disable-model-invocation: true` | Only the user can run this (`/skill-name`). Use for skills with side effects — deploys, commits, message sends. |
| `argument-hint` | Autocomplete hint, e.g. `[endpoint-name]`. |
| `paths` | Glob that limits when Claude auto-loads the skill, e.g. `"src/api/**/*.ts"`. |
| `context: fork` + `agent` | Run the skill in a subagent (`Explore`, `Plan`, or a custom agent). Skill content becomes the subagent's prompt. |
<!--/target-->
<!--target:cursor-->
| Field | When to use |
|---|---|
| `name` | **Required.** Lowercase letters, numbers and hyphens only, and must match the parent folder name. |
| `description` | **Required.** Front-load the key trigger phrase — this is what the agent matches on. |
| `paths` | Glob patterns restricting the skill's visibility to matching files, e.g. `"src/api/**/*.ts"`. |
| `disable-model-invocation: true` | Only the user can run this (`/skill-name`). Use for skills with side effects — deploys, commits, message sends. |
| `icon` | Badge icon shown in Custom Mode display. |
| `color` | Badge colour: `default`, `green`, `cyan`, `blue`, `purple`, `magenta`, `orange`, `yellow`, `red`, `brand`. |
| `metadata` | Arbitrary key-value pairs for your own use. |
<!--/target-->
<!--target:codex-->
| Field | When to use |
|---|---|
| `name` | **Required.** Lowercase letters, numbers and hyphens only, and must match the parent folder name. |
| `description` | **Required.** Front-load the key trigger phrase — this is what the agent matches on, and it is how a would-be command gets discovered. |
<!--/target-->
<!--target:neutral-->
| Field | When to use |
|---|---|
| `name` | **Required.** Lowercase letters, numbers and hyphens only, and must match the parent folder name. |
| `description` | **Required.** Front-load the key trigger phrase — this is what the agent matches on. |
<!--/target-->

<!--target:claude-->
Use `$ARGUMENTS` in the body for the full argument string, or `$0` / `$1` / `$ARGUMENTS[N]` for positional args.
<!--/target-->
<!--target:cursor-->
Check the host's own documentation for argument placeholders before relying on one.
<!--/target-->
<!--target:codex-->
Check the host's own documentation for argument placeholders before relying on one.
<!--/target-->
<!--target:neutral-->
Check the host's own documentation for argument placeholders before relying on one.
<!--/target-->

---

## Scope

- The 80% happy path only — edge cases belong in code comments, not skill files
- Derive tasks from what developers actually do in this repo
- Do not create skills for one-off tasks or anything already handled by an agent workflow
