---
title: Skills
description: SlashForge ships every discipline skill the workflow uses. No plugin is required, and none is checked for.
---

SlashForge ships **its own discipline skills**. They install with the package and ==are always
available — no plugin, no marketplace, nothing to add==. On every host they are named
`slashforge-brainstorm`, `slashforge-plan` and so on; the prefix keeps them from colliding with
skills you already have.

## What ships with SlashForge

| Phase | Skill |
| --- | --- |
| 1 Intake | `slashforge-brainstorm` (full mode only) |
| 2 Plan | `slashforge-plan` |
| 4 Branch | `slashforge-worktree` (only when isolation is warranted) |
| 5 Implement | `slashforge-debug` (bugs) · `slashforge-parallel` (independent units) · `slashforge-tdd` (everything else) |
| 6 Verify | `slashforge-verify` |
| 7 Review | `slashforge-request-review` |
| 9 PR feedback | `slashforge-review-feedback` |

==Phases 3, 8 and 10 use no skill== — they are user gates and git operations the workflow handles
directly.

Three skills carry names worth distinguishing: ==`slashforge-request-review` gets **your own** work
reviewed before it ships==, ==`slashforge-review-feedback` handles comments **you received**==, and the
==`/slashforge-review-pr` command reviews **someone else's** pull request==.

## Where they install

| Claude Code | Cursor and Codex |
| --- | --- |
| `~/.claude/commands/slashforge-<skill>.md` | `~/.agents/skills/slashforge-<skill>/SKILL.md` |

Codex invokes them with `$` (`$slashforge-plan`) like every other skill; Claude Code and Cursor use `/`.

All nine are adapted from [superpowers](https://github.com/obra/superpowers) under the MIT
licence, © 2025 Jesse Vincent. Each file carries the notice, because skills install into your
home directory detached from this repo.

:::note
==Skills are detected once per session.== One installed mid-session may not be visible until the next
session starts.
:::

## Keeping it current

Re-run the installer to pull updated skills and guides:

```bash
npx slashforge
```

## Graphify

[Graphify](/slashforge/guides/graphify/) is the one optional integration — a **one-time
setup-time offer** inside `/slashforge-setup` rather than a per-command check. Once installed it
surfaces graph context automatically: through a hook on Claude Code and Codex, and an always-on
rule on Cursor.
