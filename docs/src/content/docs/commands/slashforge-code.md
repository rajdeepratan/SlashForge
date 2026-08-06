---
title: /slashforge:code
description: End-to-end development workflow — plan, confirm, branch, implement, verify, review, PR. Add -quick for lean mode.
---

```
/slashforge:code
/slashforge:code -quick
/slashforge:code [file]
```

The full development workflow, from an idea to a merged PR. ==Ten phases, run in
order, with four points where it stops and waits for you.==

## Argument

The argument is optional. Pass a description, a file, or nothing:

```
/slashforge:code
/slashforge:code investigation-2026-08-02-1432.html
/slashforge:code docs/spec.md
```

==If the argument resolves to a **file**, it is read as the requirements document==
and the usual "what do you want to build?" question is skipped — the document
already answered it. Anything else is treated as a free-form description, and
no argument at all means it asks.

The main source of those files is
[`/slashforge:investigate`](/slashforge/commands/slashforge-investigate/), which
ends by printing exactly this command with its report filename filled in.
Pasting it carries the root cause into a fresh session rather than making you
restate the bug from memory.

==Resolution is deliberately forgiving.== A **bare filename** resolves against
`docs/slashforge/investigations/`, which is the short form the investigate hand-off prints. A
**full path** works as given, so `docs/spec.md` or any other requirements
document is equally valid. A leading `@` or `#` is stripped first, so a pasted
mention still works.

:::note
==A requirements document is an input, not an approval.== Phase 1 still classifies
the task, Phase 2 still writes a plan, and the Phase 3 gate still waits for your
yes. A report's "suggested next step" is a proposal.
:::

## The gates

==These are the point of the command. It will not proceed past any of them
without your answer:==

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

**Typical cost**

| Setup | Per feature |
| --- | --- |
| Without Graphify | **100–250k tokens** |
| With Graphify indexed | **~75–225k tokens** (−10 to −25k) |

==The range is driven by the size of the feature, not by Graphify== — a single-module
change lands near the bottom, a multi-layer feature near the top. Graphify shaves
roughly 4–10% off; it does not change the order of magnitude.

If you want a materially cheaper run, that lever is
[`-quick`](#lean-mode), not the graph.

## Lean mode

```
/slashforge:code -quick
```

==For small, well-scoped changes where the full ceremony is overkill==: single-file
fixes, copy changes, config tweaks, renames, refactors touching two files or
fewer.

Typical cost: **40–70k tokens** — a far bigger saving than Graphify offers,
because it removes whole phases rather than making exploration cheaper. Lean
mode skips the graph entirely, so this figure is the same either way.

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

==Every user gate survives. So does Phase 6 verification== — that is where most of
the safety lives, and it is cheap.

### Lean mode is never inferred

==Only an explicit `-quick` selects it.== Describing a tiny change without the flag
runs full mode, whose Phase 1 auto-classification already handles trivial work
without the ceremony.

### When it bails out

Lean mode stops and recommends restarting in full mode if:

- the plan reveals more than two files, or a new module, abstraction, or dependency
- Phase 6 verification fails three times in a row on the same issue
- the self-review checklist fails on two or more items

==It will not quietly do full-sized work under the lean header.==

### Not for

New abstractions, work spanning multiple layers, ambiguous requirements, or bug
fixes where the root cause is not already understood — use full mode so
systematic debugging runs in Phase 5.

## Auto-classification

Phase 1 classifies the task as **trivial** or **full** against an explicit
checklist: two files or fewer, no new abstraction, dependency, or public API,
and no force-full keywords like `refactor` or `migrate`.

It announces the call — *"Treating this as trivial: single-file string change.
Say 'full flow' to override."* — and proceeds. Trivial tasks skip brainstorming
and use a lean plan; full tasks run everything.

Override in your reply with `full flow` or `quick`. ==Phases 3–10 run normally on
both paths, so every gate and the Phase 6 verification stay in place.==

## Auto-coverage check

On non-trivial features, the workflow checks whether the change introduces a new
domain — framework, layer, language, pattern — that `.claude/` does not yet
cover. If there is no specialist agent, no scoped rule, and no mention in
`CLAUDE.md`'s tech stack, it fires twice:

1. **Phase 2 (proactive)** — before the plan is written: *"This feature
   introduces [domain X]. `.claude/` is missing [agent / rule / CLAUDE.md
   update]. Add these to the plan so they ship in this PR?"* Accept and the new
   files are drafted in Phase 5 alongside the feature code.
2. **Phase 7 (safety net)** — the `code-reviewer` agent re-checks the diff. If
   gaps remain, ==it raises a **note**, not a block. The PR can still merge==.

Skipped on `-quick`, on trivial auto-detect, and on `/slashforge:investigate`.

**Cost:** ~100–300 tokens when no gaps are found; ~300–600 when gaps surface and
you decline; ~3–8k when you accept and files are generated.

**Why it exists:** ==without it, every new domain silently widens the gap between
what the repo does and what `.claude/` knows.== Agents stay generic, rules stop
matching, `CLAUDE.md` drifts. This closes the loop incrementally instead of
relying on you to remember to re-run `/slashforge:setup`.

## Skills per phase

These ship with SlashForge and are always available:

| Phase | Skill |
| --- | --- |
| 1 | `slashforge:brainstorm` (full mode only) |
| 2 | `slashforge:plan` |
| 4 | `slashforge:worktree` (only when isolation is warranted) |
| 5 | `slashforge:debug` (bugs) · `slashforge:parallel` (independent units) · `slashforge:tdd` (everything else) |
| 6 | `slashforge:verify` |
| 7 | `slashforge:request-review` |
| 9 | `slashforge:review-feedback` |

Phases 3, 8 and 10 use no skill — they are user gates and git operations the
workflow handles directly.

==Every one of these ships with SlashForge. No plugin is required, and none is
checked for.== See [Skills](/slashforge/guides/skills/).
