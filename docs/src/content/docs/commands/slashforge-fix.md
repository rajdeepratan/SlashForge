---
title: /slashforge-fix
description: Patch a bug straight from a /slashforge-investigate finding — test-first, scoped to the implicated files, with no full feature-planning phase.
---

```
/slashforge-fix
/slashforge-fix --issue <url>
```

:::note
==Using Cursor or Codex? Pick your agent in the header== and every command on this page
changes with it. See [Hosts](/slashforge/reference/cli/#hosts) for what else differs.
:::

The bridge from read-only investigation to a shipped patch. ==It reads the structured
finding [`/slashforge-investigate`](/slashforge/commands/slashforge-investigate/) left behind,
writes a regression test, then fixes the root cause== — without paying for the full
feature-planning phases of [`/slashforge-code`](/slashforge/commands/slashforge-code/).

> **Use it when the bug is already understood.** For a change big enough to need planning,
> use `/slashforge-code` instead.

## The investigate → fix loop

`/slashforge-investigate` writes two artifacts: the HTML report for a human, and a
machine-readable contract at `.slashforge/latest_investigation.json` for this command. The
contract carries the `run_id`, the `reproduction_steps`, the `root_cause`, the
`implicated_files`, and a `suggested_approach`.

==`/slashforge-fix` with no argument reads that contract== — so the usual flow is just:

```
/slashforge-investigate the auth middleware drops the session on refresh
# …investigation completes…
/slashforge-fix
```

`.slashforge/` holds machine-local run state — ==gitignore it.== Only the most recent
investigation is kept, which is exactly what `/slashforge-fix` reads.

## What it changes about the standard flow

`/slashforge-fix` inherits the ten-phase workflow but mutates the front of it:

- **Ingestion** — the investigation contract *is* the requirements source. There is no
  freeform intake question. `--issue <url>` is reserved for future dynamic ingestion.
- **Discovery is skipped.** ==Context is locked to the contract's `implicated_files`== — it
  does not explore the wider codebase. A file the investigation did not list is a file the
  fix will not touch; if the real fix needs one, it stops and tells you rather than widening
  scope silently.
- **Plan enforces TDD.** ==The first task is always a regression test that reproduces the bug
  and fails against the current code==, before any production change.
- **Implement** always runs systematic debugging — reproduce, watch the test fail, patch the
  root cause, watch it pass.
- **Verify adds a hard test check.** ==If the diff added or modified no test file, the run
  fails immediately== (`FIX FAILED: no regression test was added or modified.`). A fix with
  no test is not a fix.

Everything after that — review (with the security audit), push, PR, PR feedback, and
post-merge cleanup — runs exactly as [`/slashforge-code`](/slashforge/commands/slashforge-code/).

## Gates

The same four user gates as `/slashforge-code` still apply: ==plan confirmation, branch
decision, PR target + reviewers, and branch cleanup.== The investigation's suggested approach
is a proposal, not an approved plan — Phase 3 still asks you to confirm.

## Argument

`/slashforge-fix` normally takes no argument and reads the latest investigation. If there is
no `.slashforge/latest_investigation.json`, it stops and asks you to run
`/slashforge-investigate` first rather than guessing.
