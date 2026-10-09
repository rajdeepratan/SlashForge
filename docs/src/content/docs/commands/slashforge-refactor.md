---
title: /slashforge-refactor
description: Refactor with a zero-functional-change guarantee — gated by your existing test suite passing with identical results before and after. Structure only, no behaviour, API, or feature changes.
---

```
/slashforge-refactor <file|glob>
```

:::note
==Using Cursor or Codex? Pick your agent in the header== and every command on this page
changes with it. See [Hosts](/slashforge/reference/cli/#hosts) for what else differs.
:::

Reshape existing code while ==proving its behaviour does not move.== It inherits the
ten-phase workflow of [`/slashforge-code`](/slashforge/commands/slashforge-code/) but adds a
**zero-functional-change** rule, enforced by a test-suite baseline gate: the suite must pass
with **identical** results before and after.

> **Structure only.** No behaviour, public-API, or feature changes. For a change that should
> alter behaviour, use `/slashforge-code`.

## The baseline gate

Before touching anything, `/slashforge-refactor` establishes a green baseline over the target:

- ==If the suite is already red, it refuses== — a zero-change guarantee is meaningless without
  a green starting point. Fix the failures first.
- ==If coverage over the target is absent== (or has no clear happy-path and edge-case
  assertions), it auto-runs the [`/slashforge-test`](/slashforge/commands/slashforge-test/)
  flow to build the net first. If that surfaces a pre-existing bug, it halts and routes you to
  [`/slashforge-fix`](/slashforge/commands/slashforge-fix/) rather than refactor on red.

## What it changes about the standard flow

- **No brainstorm.** A refactor adds no behaviour to design; the plan is structure-only.
- **Implement is structure-only.** ==It never adds or modifies test files== — the tests are
  the invariant that proves behaviour held. A test that must change means behaviour changed,
  which is not a refactor.
- **Verify requires identical results.** It re-runs the same suite; ==any new failure or
  behavioural diff fails the gate.==
- **Review rejects functional change.** The reviewer is prompted specifically to reject any
  feature, behaviour, or public-API change.
- **Docs skip the changelog.** A zero-functional-change refactor has nothing to announce in
  user-facing release notes.

## Gates

The same four user gates as `/slashforge-code`: ==plan confirmation, branch decision, PR
target + reviewers, and branch cleanup.==

## Argument

`/slashforge-refactor` takes the file(s)/glob to refactor, optionally with a description of
the structural goal. With no argument, it asks what to refactor and why.
