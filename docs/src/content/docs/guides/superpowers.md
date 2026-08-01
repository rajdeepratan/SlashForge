---
title: Superpowers preflight
description: Every command checks for the superpowers plugin before doing any repo work, and tells you what you lose without it.
---

Every SlashForge command runs a **preflight check before touching your repo** —
before exploring the codebase, reading files, or starting a phase.

If the [superpowers](https://github.com/obra/superpowers) plugin is missing, the
command stops, explains what you lose, and offers to install it.

You can decline. It then runs in an **explicitly degraded mode**. The important
part is that it never silently drops a skill call — you always know which mode
you are in.

## Installing

```
/plugin install superpowers@claude-plugins-official
```

## What each phase uses it for

| Phase | Skill |
| --- | --- |
| 1 Intake | `brainstorming` (full mode only) |
| 2 Plan | `writing-plans` |
| 4 Branch | `using-git-worktrees` (when isolation is warranted) |
| 5 Implement | exactly one of `systematic-debugging`, `subagent-driven-development`, `test-driven-development` |
| 6 Verify | `verification-before-completion` |
| 7 Review | `requesting-code-review` |
| 8 Push + PR | `finishing-a-development-branch` |
| 9 PR feedback | `receiving-code-review` |

## What you lose without it

Phases skip their skill invocations. The written phase instructions still run,
so the workflow and every user gate survive — but the enforcement weakens.

The sharpest loss is on bug fixes: without `systematic-debugging` there is **no
enforced red → green regression test**. You get a fix that appears to work
rather than one proven to have failed before and passed after.

## Keeping it current

If the upstream superpowers project renames a skill, the guide files fall out of
sync. Re-run the installer to pull updated guides:

```bash
npx slashforge
```

## Graphify is not a preflight

[Graphify](../graphify/) is the other optional integration, but
it works differently — it is a **one-time setup-time offer** inside
`/slashforge:setup`, not a per-command check. Once installed, its own hook surfaces
graph context automatically.
