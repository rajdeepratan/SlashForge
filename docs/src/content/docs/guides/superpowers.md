---
title: Skills and the superpowers plugin
description: SlashForge ships its own discipline skills. The superpowers plugin is optional, and adds three capabilities rather than gating anything.
---

SlashForge ships **its own discipline skills**. They install with the package, live under the
`slashforge:` namespace, and are always available — no plugin, no marketplace, nothing to add.

The [superpowers](https://github.com/obra/superpowers) plugin used to be a preflight gate: every
command stopped, checked for it, and warned about degraded mode if it was missing. That is no
longer the case. It is now **optional**, and its absence costs three capabilities rather than the
discipline layer.

## What ships with SlashForge

| Phase | Skill |
| --- | --- |
| 1 Intake | `slashforge:brainstorm` (full mode only) |
| 2 Plan | `slashforge:plan` |
| 5 Implement | `slashforge:debug` (bugs) or `slashforge:tdd` (everything else testable) |
| 6 Verify | `slashforge:verify` |
| 9 PR feedback | `slashforge:review-feedback` |

Phases 7, 8 and 10 use no skill — SlashForge's own review checklist and branch-completion flow
are more specific than a generic one would be.

These are adapted from superpowers under the MIT licence, © 2025 Jesse Vincent. Each skill file
carries the notice, because skills install into `~/.claude/` detached from the repo.

## What superpowers still adds

| Phase | Optional skill | Without it |
| --- | --- | --- |
| 4 Branch | `superpowers:using-git-worktrees` | Branches normally, no worktree isolation |
| 5 Implement | `superpowers:subagent-driven-development` | Uses `slashforge:tdd` instead |
| 7 Review | `superpowers:requesting-code-review` | The `code-reviewer` agent works from the Phase 7 checklist |

Nothing else changes. No gate, no prompt, no warning at the start of a run.

## Installing it anyway

```
/plugin install superpowers@claude-plugins-official
```

Worth it if you want worktree isolation on risky refactors, or parallel subagent execution on
plans with genuinely independent units. Not worth installing solely to satisfy SlashForge.

:::note
Skills are detected once per session. One installed mid-session may not be visible until the
next session starts.
:::

## Keeping it current

Re-run the installer to pull updated skills and guides:

```bash
npx slashforge
```

## Graphify

[Graphify](/slashforge/guides/graphify/) is the other optional integration, and works
differently — a **one-time setup-time offer** inside `/slashforge:setup` rather than a
per-command check. Once installed, its own hook surfaces graph context automatically.
