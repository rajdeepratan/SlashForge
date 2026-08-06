---
title: Skills
description: SlashForge ships every discipline skill the workflow uses. No plugin is required, and none is checked for.
---

SlashForge ships **its own discipline skills**. They install with the package, live under the
`slashforge:` namespace, and ==are always available — no plugin, no marketplace, nothing to add==.

The [superpowers](https://github.com/obra/superpowers) plugin used to be a preflight gate: every
command stopped, checked for it, and warned about degraded mode if it was missing. ==That is no
longer the case.== **SlashForge needs no plugin at all** — every discipline the workflow uses ships
with it.

## What ships with SlashForge

| Phase | Skill |
| --- | --- |
| 1 Intake | `slashforge:brainstorm` (full mode only) |
| 2 Plan | `slashforge:plan` |
| 4 Branch | `slashforge:worktree` (only when isolation is warranted) |
| 5 Implement | `slashforge:debug` (bugs) · `slashforge:parallel` (independent units) · `slashforge:tdd` (everything else) |
| 6 Verify | `slashforge:verify` |
| 7 Review | `slashforge:request-review` |
| 9 PR feedback | `slashforge:review-feedback` |

==Phases 3, 8 and 10 use no skill== — they are user gates and git operations the workflow handles
directly.

Three skills carry names worth distinguishing: ==`slashforge:request-review` gets **your own** work
reviewed before it ships==, ==`slashforge:review-feedback` handles comments **you received**==, and the
==`/slashforge:review-pr` command reviews **someone else's** pull request==.

All nine are adapted from superpowers under the MIT licence, © 2025 Jesse Vincent. Each file
carries the notice, because skills install into `~/.claude/` detached from this repo.

## Do you need the superpowers plugin?

**No.** ==As of v4.3.0 nothing in SlashForge invokes it, checks for it, or behaves differently when
it is present.== There is no preflight, no prompt, and no degraded mode, because there is nothing to
degrade.

## Installing it anyway

```
/plugin install superpowers@claude-plugins-official
```

It is a good library in its own right and covers ground SlashForge does not — writing skills,
condition-based waiting, defence in depth. ==Install it because you want those, not because
SlashForge needs it.==

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

[Graphify](/slashforge/guides/graphify/) is the other optional integration, and works
differently — a **one-time setup-time offer** inside `/slashforge:setup` rather than a
per-command check. Once installed, its own hook surfaces graph context automatically.
