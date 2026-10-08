---
title: What it does to your machine
description: Every file SlashForge writes, every command it runs, and the things it will never do without asking.
---

You are about to let a tool write configuration into your home directory and run
git operations in your repo. That deserves a page, not a footnote.

## What it writes

Where install and setup put files depends on the agent you run them in. Pick
yours in the header:

:::agent[claude]
| Path | When |
| --- | --- |
| `~/.claude/setup/slashforge/` | On install — the guide files that carry the workflow, plus `slashforge-report-shell.html` (shared document styling), `slashforge-open.sh` (opens a document in your browser), and `slashforge-splice.js`, `slashforge-review-payload.js` and `slashforge-audit.js` (build documents, review payloads and the dependency-audit parse; files rather than inline scripts, so a permission rule can allow each by its path) |
| `~/.claude/commands/` | On install — the six commands, plus SlashForge's nine discipline skills, each named `slashforge-<name>` (`brainstorm`, `plan`, `worktree`, `debug`, `parallel`, `tdd`, `verify`, `request-review`, `review-feedback`) |
| `<repo>/CLAUDE.md` | On `/slashforge-setup`, after you answer its questions |
| `<repo>/.claude/` | On `/slashforge-setup` — rules, skills, agents, commands, hooks |
:::

:::agent[cursor]
| Path | When |
| --- | --- |
| `~/.agents/setup/slashforge/cursor/` | On install — the guide files that carry the workflow, plus the shared document shell and helpers (`slashforge-report-shell.html`, `slashforge-open.sh`, `slashforge-splice.js`, `slashforge-review-payload.js`, `slashforge-audit.js`; files rather than inline scripts, so a permission rule can allow each by its path) |
| `~/.agents/skills/` | On install — the six commands, plus SlashForge's nine discipline skills, each named `slashforge-<name>` (`brainstorm`, `plan`, `worktree`, `debug`, `parallel`, `tdd`, `verify`, `request-review`, `review-feedback`). Shared with Codex |
| `<repo>/AGENTS.md` | On `/slashforge-setup`, after you answer its questions |
| `<repo>/.cursor/` | On `/slashforge-setup` — rules, skills, agents, commands, hooks |
:::

:::agent[codex]
| Path | When |
| --- | --- |
| `~/.agents/setup/slashforge/codex/` | On install — the guide files that carry the workflow, plus the shared document shell and helpers (`slashforge-report-shell.html`, `slashforge-open.sh`, `slashforge-splice.js`, `slashforge-review-payload.js`, `slashforge-audit.js`; files rather than inline scripts, so a permission rule can allow each by its path) |
| `~/.agents/skills/` | On install — the six commands, plus SlashForge's nine discipline skills, each named `slashforge-<name>` (`brainstorm`, `plan`, `worktree`, `debug`, `parallel`, `tdd`, `verify`, `request-review`, `review-feedback`). Shared with Cursor |
| `<repo>/AGENTS.md` | On `/slashforge-setup`, after you answer its questions |
| `<repo>/.codex/` | On `/slashforge-setup` — rules, skills, agents, commands, hooks |
:::

And, whichever agent you use, these are the same:

| Path | When |
| --- | --- |
| `~/.agents/setup/slashforge/meta.json` | On install — the record of what was installed, which `status`, the update prompt and `uninstall` read |
| `<repo>/` your agent's own dir | Only with `npx slashforge --project` — the same files as above, vendored into the repo so teammates get them from git |
| `<repo>/docs/slashforge/investigations/` | On `/slashforge-investigate` — the findings report |
| `<repo>/docs/slashforge/` | On `/slashforge-setup` and `/slashforge-code` — the Markdown spec home: `constitution.md`, `architecture.md`, `status.md`, and `active/<change>/` (`requirements.md`, `plan.md`, `tasks.md`), moved to `archive/` on merge |
| `<repo>/docs/slashforge/reviews/` | On `/slashforge-review-pr` — the review document |

==Nothing is written outside those paths.== Every generated file carries a
`generated_by` marker; ==remove or edit it and that file is treated as yours
permanently==. See [`/slashforge-setup`](/slashforge/commands/slashforge-setup/)
for how the markers decide what may be refreshed.

## What it runs

Inside the workflow it runs **your own project commands** — lint, tests, build —
and git operations for the branch and PR phases. It uses the tooling already
configured in your repo. ==It does not install a test runner, a linter, or a
formatter of its own.==

One exception worth naming, because it is the only thing that reaches outside
your repo: whenever a command writes an HTML document — an investigation report
or a PR review — it asks your OS to open it in your
default browser. `open` on macOS, `xdg-open` on Linux, `wslview` on WSL, `start`
on Windows. ==Your agent asks before running that command, unless you have already
allowed it, so nothing launches without your say-so.==

It is best-effort and deliberately timid. Over SSH, or on a headless Linux box
with no `$DISPLAY`, it skips the step silently and just tells you the path. ==A
failure to open never fails the run== — the document is written first, and opening
it is the last thing that happens.

## What it never does

> **It never installs anything, force-pushes, or merges without asking.**

| Never | Detail |
| --- | --- |
| **Auto-install** | [Graphify](/slashforge/guides/graphify/) is a one-time offer during setup. You see the exact shell command before anything runs |
| **Force-push** | Not at any phase |
| **Merge for you** | Phase 8 opens the PR. Merging is yours |
| **Post a review unasked** | `/slashforge-review-pr` shows the exact text first and never picks approve vs request-changes for you |
| **Delete a branch silently** | Phase 10 asks before cleanup |
| **Touch code in `investigate`** | No branch, no commits, no edits — the constraint is the feature |
| **Phone home** | No telemetry. Graphify, if you accept it, indexes entirely locally |

## Committing the config

==Commit it.==

The entry file and your agent's folder (`.claude/`, `.cursor/` or `.codex/`) are the point — ==they are what makes the next session,
and everyone else on the team, start informed rather than cold.== Generated
configuration that lives only on one machine buys you nothing on the second run.

Phase 1 and Phase 2 write `requirements.md`, `plan.md` and `tasks.md` as Markdown
into `docs/slashforge/active/<change>/` — living specs that diff and review in a
pull request. Those paths are baked into SlashForge's own
[skills](/slashforge/guides/skills/), so nothing writes specs anywhere else in
your repo.

The one directory worth considering for `.gitignore` is `docs/slashforge/investigations/`, if
you would rather keep findings reports local. It sits under `docs/` rather
than inside your agent's folder so the reports are visible in Finder and open in a
browser without a code editor — the trade-off is that it shows up in `git
status`. ==SlashForge will not edit your `.gitignore`==; adding that line is yours.

:::note
`npx slashforge uninstall` removes only what it put in `~/.claude/` and `~/.agents/`.
==A repo's own `.claude/`, `.cursor/` or `.codex/` directory is yours and is never touched.== See the
[CLI reference](/slashforge/reference/cli/).
:::

