---
title: /forge:code
description: End-to-end development workflow — plan, confirm, branch, implement, verify, review, PR. Add -quick for lean mode.
---

```
/forge:code
/forge:code -quick
```

The full development workflow, from an idea to a merged PR. Ten phases, run in
order, with four points where it stops and waits for you.

## The gates

These are the point of the command. It will not proceed past any of them
without your answer:

| Phase | Gate |
| --- | --- |
| 3 | Plan confirmation |
| 4 | Branch decision — same branch, or new one plus base and name |
| 8 | PR target branch and reviewers |
| 10 | Branch cleanup after merge |

## The phases

| # | Phase | What happens |
| --- | --- | --- |
| 1 | Intake | Requirements gathering; auto-classifies trivial vs full |
| 2 | Plan | Structured plan — changes, surface, env vars, breaking changes, risks, tests |
| 3 | **Confirm** | You approve the plan |
| 4 | **Branch** | You choose the branch strategy |
| 5 | Implement | TDD, systematic debugging, or subagent-driven as appropriate |
| 6 | Verify | Lint, tests, build — all must pass |
| 7 | Review | `code-reviewer` agent pass |
| 8 | **Push + PR** | You confirm target and reviewers |
| 9 | PR feedback | Handles reviewer comments |
| 10 | **Cleanup** | You approve branch deletion |

Typical cost: **100–250k tokens** per feature.

## Lean mode

```
/forge:code -quick
```

For small, well-scoped changes where the full ceremony is overkill: single-file
fixes, copy changes, config tweaks, renames, refactors touching two files or
fewer.

Typical cost: **40–70k tokens**.

### What changes

| Phase | Full | Lean |
| --- | --- | --- |
| 1 Intake | Brainstorming | **Skipped** |
| 2 Plan | Six sections | **Changes + Test strategy only** |
| 3 Confirm | Gate | Kept |
| 4 Branch | Gate | Kept |
| 5 Implement | TDD / debugging / subagents | **One skill only** |
| 6 Verify | Lint, test, build | Kept |
| 7 Review | `code-reviewer` agent | **Inline self-review checklist** |
| 8–10 | Gates | Kept |

Every user gate survives. So does Phase 6 verification — that is where most of
the safety lives, and it is cheap.

### Lean mode is never inferred

Only an explicit `-quick` selects it. Describing a tiny change without the flag
runs full mode, whose Phase 1 auto-classification already handles trivial work
without the ceremony.

### When it bails out

Lean mode stops and recommends restarting in full mode if:

- the plan reveals more than two files, or a new module, abstraction, or dependency
- Phase 6 verification fails three times in a row on the same issue
- the self-review checklist fails on two or more items

It will not quietly do full-sized work under the lean header.

### Not for

New abstractions, work spanning multiple layers, ambiguous requirements, or bug
fixes where the root cause is not already understood — use full mode so
systematic debugging runs in Phase 5.

## Superpowers skills per phase

When [superpowers](https://github.com/obra/superpowers) is installed:

| Phase | Skill |
| --- | --- |
| 1 | `brainstorming` (full mode only) |
| 2 | `writing-plans` |
| 4 | `using-git-worktrees` (when isolation is warranted) |
| 5 | exactly one of `systematic-debugging`, `subagent-driven-development`, `test-driven-development` |
| 6 | `verification-before-completion` |
| 7 | `requesting-code-review` |
| 8 | `finishing-a-development-branch` |
| 9 | `receiving-code-review` |

Without superpowers the workflow still runs — these steps degrade to the written
phase instructions.
