---
name: Claude Setup — Memory System
description: How to use Claude Code's persistent memory system within a repo setup
---

# Using the Memory System

Claude Code has a file-based memory system at `~/.claude/projects/<project-path>/memory/`. Agents and Claude itself can write memories that persist across sessions — so context, preferences, and feedback don't have to be re-explained every time.

---

## What to Save

| Type | What belongs here | Examples |
|---|---|---|
| `user` | Role, preferences, expertise level | "User is a senior Go developer, new to React" |
| `feedback` | Corrections and confirmed approaches | "Don't mock the DB in tests — use real migrations" |
| `project` | Goals, decisions, deadlines, non-obvious context | "Auth rewrite is driven by compliance, not tech debt" |
| `reference` | Where to find things in external systems | "Bugs tracked in Linear project INFRA" |

---

## What NOT to Save

- Code patterns, file paths, or architecture — read the code instead
- Git history or recent changes — use `git log`
- In-progress task state — use TodoWrite/tasks for that
- Anything already in `CLAUDE.md` or rule files

---

## When Agents Should Save Memories

- **User corrects an approach** → save a `feedback` memory immediately
- **User confirms a non-obvious approach worked** → save a `feedback` memory
- **You learn the user's role or expertise** → save a `user` memory
- **A project decision is made** (deadline, scope, compliance reason) → save a `project` memory
- **An external resource is referenced** (Linear board, Grafana link, Confluence space) → save a `reference` memory

---

## Memory File Format

```markdown
---
name: [memory name]
description: [one-line description — used to decide relevance in future sessions]
type: [user | feedback | project | reference]
---

[Memory content]

**Why:** [reason this was saved]
**How to apply:** [when this should influence behavior]
```

Save each memory to its own file. Update `MEMORY.md` with a one-line pointer entry.

---

## How Memory Loads Into Sessions

Claude Code loads two kinds of persistent context at the start of every session. You don't need to do anything to trigger loading — you just need content to exist.

| Source | What loads | Limit |
|---|---|---|
| `CLAUDE.md` | Full file | No hard cap, but target <200 lines for adherence |
| `MEMORY.md` (auto memory entrypoint) | First 200 lines / 25KB, whichever comes first | Content past the cap is not loaded at session start |
| Topic files (`debugging.md`, etc.) | Nothing at session start | Claude reads them on demand when it needs the info |

`MEMORY.md` acts as an index. Claude keeps it concise by moving detail into topic files that only load when referenced.

### Verify what's loaded

In any Claude Code session, run `/memory` to see every `CLAUDE.md`, `CLAUDE.local.md`, rules file, and the auto memory folder currently in context.

### If memory isn't working

- **Auto memory not saving:** check `autoMemoryEnabled` isn't `false` in `~/.claude/settings.json` or project settings; check `CLAUDE_CODE_DISABLE_AUTO_MEMORY` env var isn't set
- **Wrong Claude Code version:** auto memory requires v2.1.59+ — check with `claude --version`
- **CLAUDE.md instructions ignored:** make them more specific ("Use 2-space indentation" beats "format code nicely") and run `/memory` to confirm the file is actually being loaded
- **Instructions disappeared after `/compact`:** root-level `CLAUDE.md` is re-injected automatically; nested CLAUDE.md files in subdirectories reload only when Claude next reads a file in that directory

---

## Scope

- Write memories that will be useful in future conversations — not just the current one
- Lead with the rule or fact, then explain why and how to apply it
- Update or remove memories that turn out to be wrong — stale memories are worse than no memories
