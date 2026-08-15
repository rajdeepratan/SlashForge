---
name: /slashforge:review-pr
description: Review a pull request against this repo's own rules and conventions, then post line-level comments or approve — only after you confirm. Lists PRs awaiting your review; pass --assigned, --mine or --all to change what it looks for.
---

## Step 0 — Preflight (do this first)

`gh` must be installed and authenticated, or nothing here works:

```bash
gh auth status >/dev/null 2>&1 || echo "NOT_AUTHENTICATED"
```

If not authenticated, stop and tell the user to run `gh auth login`. Do not attempt a workaround.

## Step 0b — Argument

Inspect the argument this command was invoked with. It is one of five things:

| Argument | Meaning |
|---|---|
| a number, e.g. `42` | Review that PR. Skip discovery entirely, go to Phase R2 |
| `--assigned` | Discover by `assignee:@me` only |
| `--mine` | Discover your own PRs (`author:@me`) — comment only, GitHub blocks self-approval |
| `--all` | Discover all three relationships, grouped and labelled |
| nothing | Default discovery: review-requested first, widening to assignee once |

These are SlashForge's own flags. Do not pass them through to `gh` — they select which query Phase
R1 runs, and the queries in the workflow file are the only ones you run.

Strip a leading `@` or `#` before parsing — users paste those out of habit; neither is part of the
argument.

## Workflow files

Read the following in full — together they are your complete workflow guide:

- {{INSTALL_PATH}}/forge-workflow-review-pr.md
- {{INSTALL_PATH}}/forge-workflow-agents.md

You MUST follow every phase in order. Do not skip phases. Do not combine phases.

**Entry:** with a PR number, name the PR and begin at Phase R2. Otherwise begin Phase R1 — the
workflow guide handles discovery, the draft skip, and the zero / one / many cases.

## Read-only guarantee

This command is **read-only against your repo**. No branches, no commits, no edits to code. The
only writes are to GitHub, and only after the user approves the exact text at the Phase R5 gate.

## Phases

- **R1 — Find the PRs:** run the query the argument selected; list with author and size, ask which
- **R2 — Gather context:** `gh pr view` / `checks` / `diff`; own-PR check, prior reviews, CI state, size check
- **R3 — Review against *this* repo:** `CLAUDE.md`, `.claude/rules/`, surrounding conventions, then the Phase 7 checklist from `forge-workflow.md`
- **R4 — Write the review document:** `docs/slashforge/reviews/<YYYY-MM-DD>-pr-<N>.html`, body fragment only, spliced into the shipped shell
- **R5 — The gate:** show the exact GitHub text, then ask `approve` · `comment` · `request-changes` · `edit` · `cancel`
- **R6 — Post it:** one review through the reviews API, prose never touching JSON syntax
- **R7 — Confirm:** what was posted, where, which event, how many line comments

**Mandatory gates** — stop and wait for the user at these points:
1. **Phase R1** — which PR to review (skipped when a number was passed)
2. **Phase R5** — the exact review text and the event

Never infer the event from severity, and never post anything without an explicit yes.

Follow the workflow file as the source of truth for phase details and success criteria.
