---
title: /slashforge:review-pr
description: Review a pull request against your repo's own rules and conventions, then post line-level comments or approve — only after you confirm.
---

```
/slashforge:review-pr              # PRs awaiting your review
/slashforge:review-pr 42           # that PR, whatever your relationship to it
/slashforge:review-pr --assigned   # PRs assigned to you
/slashforge:review-pr --mine       # your own PRs (comment only)
/slashforge:review-pr --all        # all three, grouped
```

Reviews a pull request against **your repo's** standards — `CLAUDE.md`, `.claude/rules/`, and the
conventions actually in the surrounding code — then posts line-level comments or an approval.

> **It never posts anything without your explicit yes.**

With no argument it finds the PRs waiting on you. With a number it goes straight to that PR. The
flags change which relationship it searches — see below.

## Which PRs it finds

It searches `review-requested:@me` first, because that is what "waiting on me" means on GitHub.
`assignee` is a different relationship and is usually empty on review-flow repos — if the first
search comes back empty, the command widens to assignee and tells you it widened.

Drafts are skipped. A draft is explicitly not ready.

### Choosing what it looks for

The three GitHub relationships are genuinely different, and the flags let you pick:

| Flag | Query | Why you would use it |
| --- | --- | --- |
| *(none)* | `review-requested:@me`, falling back to `assignee:@me` | The default. Someone asked you to review |
| `--assigned` | `assignee:@me` only | Your team routes reviews by assigning rather than requesting |
| `--mine` | `author:@me` | Self-review before you ask anyone else |
| `--all` | all three, in labelled groups | You want the full picture |

Under `--mine`, **approve is unavailable** — GitHub does not let anyone approve their own pull
request. The command says so when it lists them, not after you have spent time on a review.

Passing a **PR number** skips discovery entirely, so you can review any PR regardless of your
relationship to it.

These are SlashForge's flags, not `gh` flags. You never pass `gh` syntax to the command.

### How many it finds

| Situation | What happens |
| --- | --- |
| No PRs | Says so and stops. It does not invent work |
| One PR | Names it and reviews it — no menu of one |
| Several | Lists them with size and author, and asks which |

The list shows `+additions −deletions (files)` because size determines whether a review can be
meaningful at all.

## What it checks

The [Phase 7 checklist](/slashforge/commands/slashforge-code/) is the standard, plus whatever the
repo says about itself:

- Does it do what the description claims, and nothing else? Scope creep is a finding
- Duplicate code, dead code, debug leftovers, hardcoded secrets
- Breaking changes to public APIs, exports, or shared interfaces
- Error handling at boundaries; unsafe assumptions
- Tests that actually cover the change — for a bugfix, one that fails without the fix
- Conformance to `.claude/rules/` and existing style

Findings are sorted by severity. Three that would break production matter more than twenty style
nits, and the review says which are blocking.

Before reading the diff it also checks **CI status**, **existing review comments** (so it does not
repeat a point someone already made), and **whether the PR is yours** — GitHub does not allow
approving your own pull request, so that option is withdrawn when it applies.

**Large PRs.** Past roughly 1,500 changed lines a single pass produces generalities. The command
says so, then either asks which paths matter or reviews the highest-risk files and states plainly
what it did and did not cover.

## The gate

Nothing reaches GitHub before you see it. You get the verdict and findings in chat, the full
review opens in your browser, and then the **exact text that will be posted** — verbatim, not a
paraphrase, because it is public and attributed to you.

Then one question:

```
Post this review?  approve · comment · request-changes · edit · cancel
```

`request-changes` blocks the merge; `comment` does not. That difference is why the command never
picks for you. It will recommend — blocking findings make the suggestion obvious — but the choice
is yours.

## What it writes

A review document at `docs/slashforge/reviews/<date>-pr-<N>.html`, built from the same shell as
investigation reports, specs and plans, and opened in your browser. It stays as your local record
whether or not anything is posted.

On GitHub, line comments and the summary go up as **one review** through the reviews API, so the
PR gets a single notification rather than a stream of them.

:::note
A line comment can only be anchored to a line **inside the diff**. If one falls outside, GitHub
rejects the entire review with a 422 — the command detects this, moves those findings into the
summary body, tells you which moved, and posts again.
:::

## Requirements

`gh` installed and authenticated. The command checks first and stops with instructions rather than
failing halfway.
