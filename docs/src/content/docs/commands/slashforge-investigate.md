---
title: /slashforge-investigate
description: Read-only research — reproduce and root-cause a bug, then produce a findings report.
---

```
/slashforge-investigate
/slashforge-investigate [symptom]
```

:::note
==Using Cursor or Codex? Pick your agent in the header== and every command on this page
changes with it. See [Hosts](/slashforge/reference/cli/#hosts) for what else differs.
:::

Read-only research. ==Reproduces a suspected bug, finds the root cause, and writes
a findings report.==

> **It changes no code. No branch, no commits, no PR.**

==That constraint is the feature== — you can point it at something suspicious
without worrying about what it might do to your working tree.

## When to use it

- You have a symptom but not a cause
- Something works locally and fails in CI
- You want a bug understood before deciding whether to fix it
- You need the reasoning written down for someone else

==If you already know the cause and want it fixed, use
[`/slashforge-code`](/slashforge/commands/slashforge-code/) instead== — its Phase 5 runs
systematic debugging as part of shipping the fix.

## What it produces

A findings report saved under `docs/slashforge/active/<issue-slug>/`, covering:

- the symptom, and how it was reproduced
- the root cause, with the evidence supporting it
- affected surface — what else the same cause touches
- recommended fix, with alternatives where they exist
- what was ruled out, and why

==The report is a document, not a patch. Deciding what to do with it is yours.==

It is a **Markdown** file — `docs/slashforge/active/<issue-slug>/investigation.md`, where
`<issue-slug>` is a short kebab name for the issue (never a timestamp). It lands in the same
`active/<issue-slug>/` folder a later `/slashforge-code` or `/slashforge-fix` on the issue reuses,
so one issue's investigation, plan and tasks live together — the spec-driven layout, in one place
and reviewable in a diff.

==Chat gets a short plain-text summary — the conclusion, the root cause, the path — never the full
report.== The file is the report; the transcript gets the gist.

## Handing off to the fix

The run ends with the report's path, ready to paste:

```
Investigation complete → docs/slashforge/active/fix-command-lists-stop-at-six/investigation.md
Want me to fix this? Run /slashforge-fix, or /slashforge-code fix-command-lists-stop-at-six
```

The two routes use different forms on purpose. The pointer after the arrow is the
full path — where the file lives, clickable in most terminals. `/slashforge-code`
takes the **bare issue slug**, which it resolves to
`docs/slashforge/active/<issue-slug>/investigation.md`, so there is less to type or paste.

That handover is the point. ==`/slashforge-code` reads the report as its
requirements document, so the root cause survives into a fresh session instead of
being retyped from memory== — see
[its Argument section](/slashforge/commands/slashforge-code/#argument).

==The handover skips the retyping, not the confirmation.== Every gate still applies,
and the report's recommended fix arrives as a proposal that Phase 3 still asks
you to approve.

## Reproduce first

The flow reproduces the problem before diagnosing it. ==An unreproduced bug gets
a stated hypothesis rather than a confident root cause== — a diagnosis that was
never observed failing is a guess, and it is labelled as one.

## What it costs

**~15–60k tokens per report.** The fixed part is small — the command and its
three guides come to roughly **4.8k tokens** — because investigating needs far
less instruction than building does.

Everything above that is reading. No code is written, so the cost is set by how
far the trail runs before the cause appears: a stack trace that names the file
lands near the bottom of the range, while a bug that only shows up across three
layers means reading all three. Reproduction adds command output on top, and a
failing build or test suite can be verbose.

==It is the cheapest command that produces a durable artefact==, which is the
argument for reaching for it before `/slashforge-code` on anything you do not
yet understand. Diagnosing at investigate prices and handing the report forward
costs less than diagnosing midway through a full run.

## Argument

The argument is optional and freeform — a symptom, an error message, a failing
test name, or a description:

```
/slashforge-investigate the auth middleware drops the session on refresh
/slashforge-investigate TypeError: cannot read property 'id' of undefined
```

Without one, it asks what you are seeing.
