---
name: SlashForge — Slash Commands
<!--target:claude-->
description: How to create custom slash commands in .claude/commands/ or as skills
<!--/target-->
<!--target:cursor-->
description: How to create custom commands in .cursor/commands/ or as skills
<!--/target-->
<!--target:codex-->
description: Why Codex has no command files, and how to express a repo command as a skill instead
<!--/target-->
---

# Creating Slash Commands

Slash commands are shortcuts the user triggers with `/command-name`. The agent runs the command's content as if the user had typed it.

<!--target:claude-->
**Important:** Anthropic has merged slash commands into skills. A skill at `.claude/skills/deploy/SKILL.md` and a legacy command at `.claude/commands/deploy.md` both create `/deploy` and work the same way. For new commands, prefer the skill format — it supports supporting files, richer frontmatter, and auto-invocation.
<!--/target-->
<!--target:cursor-->
**Important:** prefer a skill. A skill at `.cursor/skills/deploy/SKILL.md` and a command at `.cursor/commands/deploy.md` both create `/deploy`, but the skill supports supporting files, richer frontmatter, glob scoping and auto-invocation.
<!--/target-->
<!--target:codex-->
**Do not create command files on this target.**

Codex custom prompts (`~/.codex/prompts/`) are **deprecated** in favour of skills, and
they are global rather than per-repo — the wrong home for a repo convention, since they
would follow the user into every other project.

Express every would-be command as a skill under `.agents/skills/` instead; see
`slashforge-skills.md`. A command with side effects is a skill the user types as `$name`,
with the `agents/openai.yaml` policy below so the agent never starts it on its own. Only
plain skills rely on their `description` to be picked up — front-load the trigger phrase
there.

The rest of this guide is about *deciding* whether something deserves to be a command at
all. That judgement still applies — only the file format changes.
<!--/target-->

---

## Command vs Skill vs Rule — When to Use Which

| Concept | Use when |
|---|---|
<!--target:claude-->
| **Slash command** (skill with `disable-model-invocation: true`) | A human-triggered action with side effects — `/deploy`, `/run-checks`, `/add-metric`. You want control over timing. |
<!--/target-->
<!--target:cursor-->
| **Slash command** (skill with `disable-model-invocation: true`) | A human-triggered action with side effects — `/deploy`, `/run-checks`, `/add-metric`. You want control over timing. |
<!--/target-->
<!--target:codex-->
| **Slash command** (skill with `agents/openai.yaml` → `allow_implicit_invocation: false`) | A human-triggered action with side effects — `$deploy`, `$run-checks`, `$add-metric`. You want control over timing. |
<!--/target-->
| **Skill** (default, model-invocable) | The agent can auto-load it when relevant. Use for recipes the agent should run when it matches the description. |
| **Rule** | Always-in-context behavior. Use for "how code must be written" — not "how to do X." |

If a workflow is triggered often and has a fixed sequence of steps, it's a command. If it's conceptual guidance the agent follows while working, it's a rule.

---

## Where Commands Live

Two equivalent forms — prefer the directory form for new commands:

<!--target:claude-->
```
.claude/skills/run-checks/SKILL.md      # Preferred: directory with SKILL.md
.claude/commands/run-checks.md          # Legacy: flat .md, still works
```
<!--/target-->
<!--target:cursor-->
```
.cursor/skills/run-checks/SKILL.md      # Preferred: directory with SKILL.md
.cursor/commands/run-checks.md          # Also works: flat .md
```
<!--/target-->
<!--target:codex-->
```
.agents/skills/run-checks/SKILL.md      # The only form on this target
```
<!--/target-->

<!--target:claude-->
User-level commands (apply to all projects): `~/.claude/skills/` or `~/.claude/commands/`.
<!--/target-->
<!--target:cursor-->
User-level commands (apply to all projects): `~/.cursor/skills/` or `~/.agents/skills/`.
<!--/target-->
<!--target:codex-->
User-level skills (apply to all projects): `~/.agents/skills/`. Keep repo conventions in the repo — a user-level file follows the user into unrelated projects.
<!--/target-->

<!--target:claude-->
Command name = filename (or directory name). `run-checks` becomes `/run-checks`.
<!--/target-->
<!--target:cursor-->
Command name = filename (or directory name). `run-checks` becomes `/run-checks`.
<!--/target-->
<!--target:codex-->
Skill name = directory name. `run-checks` is typed as `$run-checks`.
<!--/target-->

---

<!--target:claude-->
## Frontmatter for Commands

Every command file must include the generated-by marker (see `slashforge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

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
| `description` | Shown in `/` menu and used by the agent to decide when to auto-load (unless `disable-model-invocation: true`) |
| `disable-model-invocation: true` | **Critical for commands with side effects.** Prevents the agent from triggering it autonomously. |
| `argument-hint` | Autocomplete hint, e.g. `[branch-name]` |
| `allowed-tools` | Pre-approve specific tools for this command so the agent doesn't prompt the user mid-run |
| `user-invocable: false` | Hide from `/` menu — for background knowledge the agent uses but users shouldn't trigger |

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

<!--/target-->
<!--target:cursor-->
## Frontmatter for Commands

A command is a skill that only runs when typed. Every command file must include the generated-by marker (see `slashforge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```yaml
---
name: deploy
description: Deploy the application to production
disable-model-invocation: true
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---
```

| Field | Purpose |
|---|---|
| `name` | Lowercase letters, digits and hyphens; must match the folder name |
| `description` | Shown in the `/` menu, and used by the agent to decide when a skill applies |
| `disable-model-invocation: true` | **Critical for commands with side effects.** The skill then runs only when the user types `/name`; the agent never starts it on its own. |
| `paths` | Optional glob patterns that limit where the skill is offered, e.g. `"src/api/**/*.ts"` |
| `icon` | Optional badge icon when the skill is used as a Custom Mode |
| `color` | Optional badge colour when the skill is used as a Custom Mode |
| `metadata` | Optional key-value map for anything else |

Cursor documents no other fields. Tool permissions are the user's Cursor settings, not something a command can grant itself.

---

## Passing Arguments

There is no substitution variable. Whatever the user types after the command arrives with it in the message, so the command says what to do with it:

```markdown
---
name: fix-issue
description: Fix a GitHub issue by number
disable-model-invocation: true
---

Fix the GitHub issue whose number the user gave after the command, following our
coding standards. If no number was given, ask for one.

1. Read the issue
2. Understand the requirements
3. Implement the fix
4. Write tests
5. Create a commit
```

Running `/fix-issue 123` gives the command the text `123`.

<!--/target-->
<!--target:codex-->
## Frontmatter for Commands

A would-be command is a skill that only runs when typed. Its `SKILL.md` carries the usual skill frontmatter, including the generated-by marker (see `slashforge-instructions.md` § Generated File Markers — read `meta.json` for the version and timestamp):

```yaml
---
name: deploy
description: Deploy the application to production
generated_by: [package]@[version]
generated_at: [ISO 8601 timestamp]
---
```

| Field | Purpose |
|---|---|
| `name` | Lowercase letters, digits and hyphens; must match the folder name |
| `description` | Shown in the skill list, and used by the agent to decide when a skill applies |

**Anything with side effects must not start on its own.** Codex does not read that from `SKILL.md`: add `agents/openai.yaml` beside it:

```
.agents/skills/deploy/
├── SKILL.md
└── agents/
    └── openai.yaml
```

```yaml
policy:
  allow_implicit_invocation: false
```

With that policy the skill runs only when the user types `$deploy`; the agent never starts it on its own.

---

## Passing Arguments

There is no substitution variable. Whatever the user types after `$name` arrives with it in the message, so the skill says what to do with it:

```markdown
---
name: fix-issue
description: Fix a GitHub issue by number
---

Fix the GitHub issue whose number the user gave after the skill name, following
our coding standards. If no number was given, ask for one.

1. Read the issue
2. Understand the requirements
3. Implement the fix
4. Write tests
5. Create a commit
```

Running `$fix-issue 123` gives the skill the text `123`.

<!--/target-->
---

## When to Create a Command

Create one if **all three** are true:
1. The workflow is triggered regularly (weekly or more)
2. It has a fixed sequence of steps (not "depends on context")
3. Getting the steps wrong would cause real harm — wrong deploy target, missed lint, pushed secret

<!--target:claude-->
Examples: `/run-checks`, `/deploy`, `/cut-release`, `/add-metric`, `/open-pr`.
<!--/target-->
<!--target:cursor-->
Examples: `/run-checks`, `/deploy`, `/cut-release`, `/add-metric`, `/open-pr`.
<!--/target-->
<!--target:codex-->
Examples: `$run-checks`, `$deploy`, `$cut-release`, `$add-metric`, `$open-pr`.
<!--/target-->

Do not create a command for:
- One-off tasks
- Anything an agent already handles via natural language ("please run the tests")
- Exploratory or judgment-heavy work — commands are for mechanical sequences

---

## Scope

- Naming: kebab-case, matches the filename exactly
- Each command file: clear one-line purpose, exact steps, verify checklist
- Keep commands short and imperative — the agent runs the content verbatim
<!--target:claude-->
- Document team-shared commands in `CLAUDE.md`'s orchestration table so teammates discover them
<!--/target-->
<!--target:cursor-->
- Document team-shared commands in the `AGENTS.md` routing table so teammates discover them
<!--/target-->
<!--target:codex-->
- Document team-shared skills in the root `AGENTS.md` routing table so teammates discover them
<!--/target-->
