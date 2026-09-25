---
name: Claude Setup — Slash Commands
description: How to create custom slash commands in .claude/commands/ or as skills
---

# Creating Slash Commands

Slash commands are shortcuts the user triggers with `/command-name`. Claude runs the command's content as if the user had typed it.

**Important:** Anthropic has merged slash commands into skills. A skill at `.claude/skills/deploy/SKILL.md` and a legacy command at `.claude/commands/deploy.md` both create `/deploy` and work the same way. For new commands, prefer the skill format — it supports supporting files, richer frontmatter, and auto-invocation.

---

## Command vs Skill vs Rule — When to Use Which

| Concept | Use when |
|---|---|
| **Slash command** (skill with `disable-model-invocation: true`) | A human-triggered action with side effects — `/deploy`, `/run-checks`, `/add-metric`. You want control over timing. |
| **Skill** (default, model-invocable) | Claude can auto-load it when relevant. Use for recipes Claude should run when it matches the description. |
| **Rule** | Always-in-context behavior. Use for "how code must be written" — not "how to do X." |

If a workflow is triggered often and has a fixed sequence of steps, it's a command. If it's conceptual guidance Claude follows while working, it's a rule.

---

## Where Commands Live

Two equivalent forms — prefer the directory form for new commands:

```
.claude/skills/run-checks/SKILL.md      # Preferred: directory with SKILL.md
.claude/commands/run-checks.md          # Legacy: flat .md, still works
```

User-level commands (apply to all projects): `~/.claude/skills/` or `~/.claude/commands/`.

Command name = filename (or directory name). `run-checks` becomes `/run-checks`.

---

## Frontmatter for Commands

Every command file must include the generated-by marker (see `forge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
argument-hint: [environment]
allowed-tools: Bash(git *) Bash(npm run deploy *)
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---
```

| Field | Purpose |
|---|---|
| `description` | Shown in `/` menu and used by Claude to decide when to auto-load (unless `disable-model-invocation: true`) |
| `disable-model-invocation: true` | **Critical for commands with side effects.** Prevents Claude from triggering it autonomously. |
| `argument-hint` | Autocomplete hint, e.g. `[branch-name]` |
| `allowed-tools` | Pre-approve specific tools for this command so Claude doesn't prompt the user mid-run |
| `user-invocable: false` | Hide from `/` menu — for background knowledge Claude uses but users shouldn't trigger |

---

## Passing Arguments

Use `$ARGUMENTS` for the full argument string, or `$0` / `$1` / `$ARGUMENTS[N]` for positional args:

```markdown
---
name: fix-issue
description: Fix a GitHub issue by number
disable-model-invocation: true
argument-hint: [issue-number]
---

Fix GitHub issue $ARGUMENTS following our coding standards.

1. Read the issue
2. Understand the requirements
3. Implement the fix
4. Write tests
5. Create a commit
```

Running `/fix-issue 123` replaces `$ARGUMENTS` with `123`.

For positional args: `/migrate-component SearchBar React Vue` with `$0`, `$1`, `$2` gives `SearchBar`, `React`, `Vue`.

---

## When to Create a Command

Create one if **all three** are true:
1. The workflow is triggered regularly (weekly or more)
2. It has a fixed sequence of steps (not "depends on context")
3. Getting the steps wrong would cause real harm — wrong deploy target, missed lint, pushed secret

Examples: `/run-checks`, `/deploy`, `/cut-release`, `/add-metric`, `/open-pr`.

Do not create a command for:
- One-off tasks
- Anything an agent already handles via natural language ("please run the tests")
- Exploratory or judgment-heavy work — commands are for mechanical sequences

---

## Scope

- Naming: kebab-case, matches the filename exactly
- Each command file: clear one-line purpose, exact steps, verify checklist
- Keep commands short and imperative — Claude runs the content verbatim
- Document team-shared commands in `CLAUDE.md`'s orchestration table so teammates discover them
