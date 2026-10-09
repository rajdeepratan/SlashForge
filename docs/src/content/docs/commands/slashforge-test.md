---
title: /slashforge-test
description: Generate spec-based test coverage for existing files — a light, standalone flow that discovers your test framework, writes tests, runs them, and reports, surfacing bugs without touching production code.
---

```
/slashforge-test <file|glob>
```

:::note
==Using Cursor or Codex? Pick your agent in the header== and every command on this page
changes with it. See [Hosts](/slashforge/reference/cli/#hosts) for what else differs.
:::

A light "gear" for one bounded job: ==raise test coverage for code that already exists==,
without the ten-phase machinery of
[`/slashforge-code`](/slashforge/commands/slashforge-code/). It discovers how your repo
tests, derives each target's *intended* behaviour, writes **spec-based** tests, runs them,
and reports.

> **Spec-based, not characterization.** The tests assert what the code *should* do, so a
> failure means a bug is surfaced — not that the test should bend to match the code.

## The flow

1. **Framework discovery.** It reads your `CLAUDE.md` (or `AGENTS.md`) to find the prescribed
   test framework, file-naming convention, and run command — falling back to your manifest's
   `test` script and existing test files. ==It never guesses the framework blind.==
2. **Derive intended behaviour** from signatures, docstrings, types, naming, and adjacent
   docs. Where the intent is genuinely ambiguous, it asks rather than guessing.
3. **Write spec-based tests** in that framework and location.
4. **Run and report** — green means the behaviour is now covered.

## When a test goes red

A failing spec test means the code does not meet its intended behaviour. ==`/slashforge-test`
never modifies production code== to make a test pass. Instead it reports the mismatch and
writes a complete investigation contract to `.slashforge/latest_investigation.json` — the
same contract [`/slashforge-fix`](/slashforge/commands/slashforge-fix/) reads — so you can go
straight to a fix:

```
/slashforge-test src/auth/session.ts
# …a spec test fails, bug surfaced, contract written…
/slashforge-fix
```

## What it does not do

==No branch, no PR, no edits to production code.== The new tests are left in your working
tree to commit or route onward. For a change that should alter behaviour, use
[`/slashforge-code`](/slashforge/commands/slashforge-code/); for a bug you already understand,
use [`/slashforge-fix`](/slashforge/commands/slashforge-fix/).

## Argument

`/slashforge-test` takes the file(s) or glob to cover. With no argument, it asks which files
to test.
