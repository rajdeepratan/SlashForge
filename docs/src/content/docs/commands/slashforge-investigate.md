---
title: /slashforge:investigate
description: Read-only research — reproduce and root-cause a bug, then produce a findings report.
---

```
/slashforge:investigate
/slashforge:investigate [symptom]
```

Read-only research. Reproduces a suspected bug, finds the root cause, and writes
a findings report.

> **It changes no code. No branch, no commits, no PR.**

That constraint is the feature — you can point it at something suspicious
without worrying about what it might do to your working tree.

## When to use it

- You have a symptom but not a cause
- Something works locally and fails in CI
- You want a bug understood before deciding whether to fix it
- You need the reasoning written down for someone else

If you already know the cause and want it fixed, use
[`/slashforge:code`](/slashforge/commands/slashforge-code/) instead — its Phase 5 runs
systematic debugging as part of shipping the fix.

## What it produces

A findings report saved to `.claude/investigations/`, covering:

- the symptom, and how it was reproduced
- the root cause, with the evidence supporting it
- affected surface — what else the same cause touches
- recommended fix, with alternatives where they exist
- what was ruled out, and why

The report is a document, not a patch. Deciding what to do with it is yours.

## Reproduce first

The flow reproduces the problem before diagnosing it. An unreproduced bug gets
a stated hypothesis rather than a confident root cause — a diagnosis that was
never observed failing is a guess, and it is labelled as one.

## Argument

The argument is optional and freeform — a symptom, an error message, a failing
test name, or a description:

```
/slashforge:investigate the auth middleware drops the session on refresh
/slashforge:investigate TypeError: cannot read property 'id' of undefined
```

Without one, it asks what you are seeing.
