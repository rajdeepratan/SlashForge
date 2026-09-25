---
name: Claude Setup — Rule Files
description: How to create rule files in .claude/rules/ when setting up Claude for a repo
---

# Creating Rule Files

Rules = **how code must be written** in this repo. One file per concern.

Derive topics from what you observed in the codebase — do not copy a template. Common concerns:

- Language conventions (types, error handling, async patterns)
- File structure, naming conventions, import style
- How modules / components / services are structured
- Testing conventions and any critical gotchas
- Git & branching (always include — see below)

Every rule file must cover: where files live, how they are named, what is forbidden, and any non-obvious patterns that would trip up a new developer.

---

## Always Create `git.md`

Always create a `git.md` rule file containing:

- Branch naming pattern — ask the user for the project's preferred format (e.g. `feat/<short-description>`, `fix/<short-description>`)
- Always ask which branch to create the new branch from before starting any work
- After the user names the base branch, fetch the latest remote state and check if that branch is behind — if it is, warn the user and ask if they want to pull before branching
- Commit messages must be clear and descriptive — reference any related issue where relevant
- Never commit `.env` files, credentials, API keys, tokens, or secrets
- If a sensitive file is staged accidentally, remove it and add to `.gitignore` before committing

---

## File Skeleton

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

Not every rule needs a code example. Location and naming rules can be stated plainly:

```markdown
- Service files live in `src/services/` — one file per domain entity
- Filenames use kebab-case: `user-profile.service.ts`, not `UserProfile.service.ts`
```

Only add code examples when the rule covers logic, patterns, or syntax — not when it's a file/folder convention.

---

## Path-Scoped Rules

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

---

## Scope

- Non-obvious and project-specific only — skip what any developer already knows
- If a rule applies everywhere in any codebase, it doesn't belong here
- Derive from observed patterns — never invent rules that aren't in the code
