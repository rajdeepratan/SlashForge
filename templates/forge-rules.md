---
<!--target:claude-->
name: Claude Setup — Rule Files
description: How to create rule files in .claude/rules/ when setting up Claude for a repo
<!--/target-->
<!--target:cursor-->
name: Agent Setup — Rule Files
description: How to create rule files in .cursor/rules/ when setting up Cursor for a repo
<!--/target-->
<!--target:codex-->
name: Agent Setup — Rule Files
description: How to encode rules as nested AGENTS.md files when setting up Codex for a repo
<!--/target-->
---

# Creating Rule Files

<!--target:claude-->
Rules = **how code must be written** in this repo. One file per concern.
<!--/target-->
<!--target:cursor-->
Rules = **how code must be written** in this repo. One file per concern.

**Location:** `.cursor/rules/<concern>.mdc`. The extension must be `.mdc`: a plain `.md`
file in that directory is **silently ignored**, because the rules system needs the
frontmatter to know when to apply it.
<!--/target-->
<!--target:codex-->
Rules = **how code must be written** in this repo. One concern per section.

**Codex has no rules directory.** Its rules mechanism is nested `AGENTS.md`: Codex loads
every `AGENTS.md` from the repo root down to the file being worked on, closest file
winning. So a rule that governs a subtree becomes an `AGENTS.md` in that directory, and a
repo-wide rule becomes a section of the root `AGENTS.md`.

Do not create `.codex/rules/` — nothing reads it.
<!--/target-->

Derive topics from what you observed in the codebase — do not copy a template. Common concerns:

- Language conventions (types, error handling, async patterns)
- File structure, naming conventions, import style
- How modules / components / services are structured
- Testing conventions and any critical gotchas
- Git & branching (always include — see below)

Every rule file must cover: where files live, how they are named, what is forbidden, and any non-obvious patterns that would trip up a new developer.

---

## Always Create `git.md`

<!--target:claude-->
Always create a `git.md` rule file containing:
<!--/target-->
<!--target:cursor-->
Always create a `git.mdc` rule file (with `alwaysApply: true`) containing:
<!--/target-->
<!--target:codex-->
Always cover git conventions in the root `AGENTS.md` — they apply repo-wide, so they do not belong in a nested file. Include:
<!--/target-->

- Branch naming pattern — ask the user for the project's preferred format (e.g. `feat/<short-description>`, `fix/<short-description>`)
- Always ask which branch to create the new branch from before starting any work
- After the user names the base branch, fetch the latest remote state and check if that branch is behind — if it is, warn the user and ask if they want to pull before branching
- Commit messages must be clear and descriptive — reference any related issue where relevant
- Never commit `.env` files, credentials, API keys, tokens, or secrets
- If a sensitive file is staged accidentally, remove it and add to `.gitignore` before committing

---

## File Skeleton

<!--target:claude-->
Every rule file must start with frontmatter, including the generated-by marker (see `forge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```markdown
---
name: [concern name]
description: [one-line description of what this rule covers]
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---

[Rule stated plainly]

✓ Correct:
[code example]

✗ Wrong:
[code example]
```
<!--/target-->
<!--target:cursor-->
Every rule file must start with frontmatter, including the generated-by marker (see `forge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```markdown
---
description: [one-line description of what this rule covers]
globs: src/api/**/*.ts
alwaysApply: false
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---

[Rule stated plainly]

✓ Correct:
[code example]

✗ Wrong:
[code example]
```

`description` tells the agent when the rule matters. `globs` limits it to matching files.
`alwaysApply: true` loads it unconditionally — use that for repo-wide conventions and
leave `globs` off.
<!--/target-->
<!--target:codex-->
A rule is a section of an `AGENTS.md`, so it carries no frontmatter of its own. The file's generated-by marker is an HTML comment on its first line (see `forge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```markdown
<!-- generated_by: [package]@[version] generated_at: [ISO 8601 timestamp] -->

# [directory this file governs]

## [concern name]

[Rule stated plainly]

✓ Correct:
[code example]

✗ Wrong:
[code example]
```
<!--/target-->

Not every rule needs a code example. Location and naming rules can be stated plainly:

```markdown
- Service files live in `src/services/` — one file per domain entity
- Filenames use kebab-case: `user-profile.service.ts`, not `UserProfile.service.ts`
```

Only add code examples when the rule covers logic, patterns, or syntax — not when it's a file/folder convention.

---

## Path-Scoped Rules

<!--target:claude-->
Rules can be scoped to specific file globs so Claude only loads them when working with matching files. This saves context and prevents rules from polluting unrelated work. Use the `paths` frontmatter field:

```markdown
---
name: api
description: API layer conventions
paths:
  - "src/api/**/*.ts"
  - "src/services/**/*.ts"
---

- All endpoints must include input validation
- Use the standard error response format
```

Rules without a `paths` field load unconditionally at session start (the default). Path-scoped rules trigger only when Claude reads a matching file. Use brace expansion for multiple extensions: `"src/**/*.{ts,tsx}"`.
<!--/target-->
<!--target:cursor-->
Rules can be scoped to file globs so the agent only loads them when working with matching files. This saves context and stops rules polluting unrelated work. Use the `globs` field:

```markdown
---
description: API layer conventions
globs: src/api/**/*.ts,src/services/**/*.ts
alwaysApply: false
---

- All endpoints must include input validation
- Use the standard error response format
```

A rule with `alwaysApply: true` loads unconditionally. One with `globs` triggers only on
matching files. Use brace expansion for multiple extensions: `src/**/*.{ts,tsx}`.
<!--/target-->
<!--target:codex-->
Scoping is positional on this target: a rule applies to the directory its `AGENTS.md` sits in, and everything below it. There is no glob field, because the file's location *is* the scope.

```
AGENTS.md                 # repo-wide conventions
src/api/AGENTS.md         # applies only under src/api/
src/services/AGENTS.md    # applies only under src/services/
```

A nested file is a complete entry point for its subtree, not a diff against the root. It
should not repeat the root's stack table, but it must name anything that differs.
<!--/target-->

---

## Scope

- Non-obvious and project-specific only — skip what any developer already knows
- If a rule applies everywhere in any codebase, it doesn't belong here
- Derive from observed patterns — never invent rules that aren't in the code
