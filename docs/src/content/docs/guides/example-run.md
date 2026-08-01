---
title: What a run looks like
description: One pass through /slashforge:code, from prompt to gate, so you can judge the shape of the output before installing anything.
---

Everything below is shaped like output rather than description. This is the
whole reason to read the docs before installing: you can decide whether the
process suits you without running it once.

## The prompt

You invoke the command and say what you want in plain language. There is no
argument syntax to learn.

```
> /slashforge:code

  Add rate limiting to the public API — 100 req/min per key,
  429 with a Retry-After header.
```

Phase 1 gathers requirements and classifies the task. A change this size gets
the full path; something trivial would skip brainstorming automatically without
asking.

## Phase 2 — the plan

It does not touch a file yet. It writes a structured plan and stops.

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

This is the point of the whole command. It asks, and then it waits.

```
  Do you want to proceed with this plan? If not, what should change?

> fail closed, not open — a Redis outage should reject
```

Note what happens next: a revision does **not** get patched into the plan in
place. It returns to Phase 1 with the new information and re-plans, because new
information can change the scope — and a plan edited in isolation quietly stops
matching the requirements it came from.

Nothing is implemented until you approve. Phase 4 then asks a second question of
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
Phase 6 is not advisory. A failing test stops the run before a PR exists — so
"it's done" means it was verified, not asserted.
:::

The full phase-by-phase reference lives on
[`/slashforge:code`](/slashforge/commands/slashforge-code/), including what each
of the four gates asks and what `-quick` changes.
