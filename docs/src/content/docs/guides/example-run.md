---
title: What a run looks like
description: One pass through /slashforge:code and one through /slashforge:review-pr, from prompt to gate, so you can judge the shape of the output before installing anything.
---

==Everything below is shaped like output rather than description.== This is the
whole reason to read the docs before installing: you can decide whether the
process suits you without running it once.

Two runs: shipping a change of your own with
[`/slashforge:code`](/slashforge/commands/slashforge-code/), then reviewing
someone else's with
[`/slashforge:review-pr`](/slashforge/commands/slashforge-review-pr/).

## The prompt

You invoke the command and say what you want in plain language. There is no
argument syntax to learn.

```
> /slashforge:code

  Add rate limiting to the public API — 100 req/min per key,
  429 with a Retry-After header.
```

==Phase 1 gathers requirements and classifies the task.== A change this size gets
the full path; something trivial would skip brainstorming automatically without
asking.

## Phase 2 — the plan

==It does not touch a file yet. It writes a structured plan and stops.==

The section headings are fixed — the command is told to cover every one of
them, omitting only those that genuinely do not apply:

```
CHANGES
  src/middleware/rateLimit.ts   new — token bucket, Redis-backed
  src/server.ts                 mount before route handlers
  src/config.ts                 RATE_LIMIT_RPM, RATE_LIMIT_REDIS_URL

AFFECTED SURFACE
  Every /api/* route. No change to /health or /internal/*.

ENV VARS
  RATE_LIMIT_RPM, RATE_LIMIT_REDIS_URL — both added to .env.example

BREAKING CHANGES
  None. The limit is inert until RATE_LIMIT_RPM is set.

RISKS & EDGE CASES
  A Redis outage would fail open, silently disabling the limit.

TEST STRATEGY
  unit    bucket refill, boundary at exactly 100
  integ   429 shape, Retry-After value, per-key isolation
```

On `-quick`, or on a task Phase 1 classified as trivial, this shrinks to
**Changes** and **Test strategy** only. A missing section is the "not
applicable" — it never pads the plan with `N/A`.

## Phase 3 — the gate

> **It will not proceed without your answer.**

==This is the point of the whole command. It asks, and then it waits.==

```
  Do you want to proceed with this plan? If not, what should change?

> fail closed, not open — a Redis outage should reject
```

Note what happens next: a revision does **not** get patched into the plan in
place. It returns to Phase 1 with the new information and re-plans, because new
information can change the scope — and a plan edited in isolation quietly stops
matching the requirements it came from.

==Nothing is implemented until you approve.== Phase 4 then asks a second question of
its own — whether to work on the current branch or cut a new one, and from what
base.

## What lands in the repo

| Phase | Artifact |
| --- | --- |
| 4 Branch | `feat/rate-limiting`, based on a branch you named |
| 5 Implement | The planned files, tests written first |
| 6 Verify | lint, tests, and build — all three must pass |
| 7 Review | A `code-reviewer` agent pass, findings addressed |
| 8 Push + PR | PR opened against the target and reviewers you confirmed |
| 10 Cleanup | Branch deleted, after you approve |

:::note
==Phase 6 is not advisory. A failing test stops the run before a PR exists== — so
"it's done" means it was verified, not asserted.
:::

The full phase-by-phase reference lives on
[`/slashforge:code`](/slashforge/commands/slashforge-code/), including what each
of the four gates asks and what `-quick` changes.

## Reviewing someone else's work

The other direction: a pull request that is not yours, judged against the
standards this repo already writes down.

## Finding the PR

With no argument it looks for what is actually waiting on you — GitHub's
*review-requested*, not *assignee*. Those are different relationships, and most
teams never set the second one on a PR.

```
> /slashforge:review-pr

  AWAITING YOUR REVIEW
    1. #42  Add retry to upload queue     +180 −24  (6 files)
    2. #47  Bump astro to 7.2              +12 −12  (2 files)

  Which one?

> 1
```

==Drafts are skipped.== One waiting PR is reviewed without a menu, and none at all
says so rather than inventing work. The sizes are in the list on purpose —
past roughly 1,500 changed lines a single pass produces generalities, and it
will say so instead of pretending otherwise.

## Before the diff

Three things get established before a line of code is read, because each one
can change what the review is allowed to conclude:

```
  CI            green — 4 checks
  Existing      2 review comments, one on retry.ts:38
  Authorship    not yours — approval is available
```

==Repeating a point someone already made is noise.== Approving over red checks is
worse. And if the PR *were* yours, GitHub would refuse the approval outright —
so the option is withdrawn up front rather than after the work is done.

## The findings

Judged against `CLAUDE.md`, any `.claude/rules/` whose scope matches the changed
files, and the conventions actually in the surrounding code — not a generic
notion of good code.

```
FINDINGS

  blocking     src/retry.ts:38   no ceiling — retries forever on a 500
  should fix   src/retry.ts:52   swallows the abort signal
  nit          src/retry.ts:12   delayMs holds seconds

CHECKS
  Tests cover the change     partly — no test for the abort path
  Repo conventions           follows .claude/rules/errors.md
  Reviewed                   all 6 files
```

==Sorted by severity, not by file order.== Three findings that would break
production matter more than twenty style nits, and the review says which are
blocking. It also states what it actually read — a review that skipped two files
should say so.

## The review gate

> **Nothing has reached GitHub yet.**

You get the verdict, the review opens in your browser, and then the exact text
that will be posted — verbatim, not a paraphrase, because it is public and
attributed to you.

```
  Post this review?

  approve · comment · request-changes · edit · cancel

> request-changes
```

`request-changes` blocks the merge; `comment` does not. That difference is why
the command never picks for you. It will recommend — blocking findings make the
suggestion obvious — but choosing to block someone else's work is yours.

## What the review leaves behind

| Where | What |
| --- | --- |
| The PR | One review: the summary and every line comment, in a single notification |
| `docs/slashforge/reviews/` | The review as HTML, opened in your browser |

==The local copy stays whether or not you posted==, so a review you cancelled is
still a review you can read.

:::note
A line comment can only anchor to a line inside the diff. One outside makes
GitHub reject the whole review with a 422 — so those findings move into the
summary body, and the command tells you which moved rather than dropping them.
:::

The full reference, including `--assigned`, `--mine` and `--all`, lives on
[`/slashforge:review-pr`](/slashforge/commands/slashforge-review-pr/).
