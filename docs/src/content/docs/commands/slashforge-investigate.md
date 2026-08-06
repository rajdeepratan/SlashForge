---
title: /slashforge:investigate
description: Read-only research — reproduce and root-cause a bug, then produce a findings report.
---

```
/slashforge:investigate
/slashforge:investigate [symptom]
```

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
[`/slashforge:code`](/slashforge/commands/slashforge-code/) instead== — its Phase 5 runs
systematic debugging as part of shipping the fix.

## What it produces

A findings report saved to `docs/slashforge/investigations/`, covering:

- the symptom, and how it was reproduced
- the root cause, with the evidence supporting it
- affected surface — what else the same cause touches
- recommended fix, with alternatives where they exist
- what was ruled out, and why

==The report is a document, not a patch. Deciding what to do with it is yours.==

It is a self-contained HTML file — no external CSS, no JavaScript, no network —
written to `docs/slashforge/investigations/investigation-<timestamp>.html`. It sits under `docs/` rather than inside `.claude/` because dot-directories are
hidden in Finder and most file explorers; these reports are meant to be
double-clicked by a human, not just read by an agent.

==`docs/slashforge/investigations/` is the one directory worth considering for `.gitignore`== if you
would rather keep findings local. SlashForge will not edit `.gitignore` for you.

When the report is written it is **opened in your default browser** — `open` on
macOS, `xdg-open` on Linux, `wslview` on WSL, `start` on Windows. Over SSH or on
a headless machine that step is skipped silently and you just get the path. It is
best-effort throughout: failing to open a browser never fails the investigation.

==Chat gets a short plain-text summary — the conclusion, the root cause, the path —
never the raw HTML.== The file is the report; the transcript gets the gist.

## How the styling works

The report's shell — doctype, `<head>`, and the whole `<style>` block — ships
with SlashForge as `forge-report-shell.html` and is installed alongside the guide
files. Each investigation writes only its **body fragment**, which is spliced
into that shell.

==This is why every report looks identical==, and why restyling all of them is one
edit to the shell rather than a hope that the next run copies a new skeleton
faithfully. It also keeps ~800 tokens of boilerplate out of each run's output.

The finished file is still fully self-contained: the CSS is inlined into every
report, so it opens from disk, offline, years later, with no dependency on the
shell still existing.

## Handing off to the fix

The run ends with the report's path, ready to paste:

```
Investigation complete → docs/slashforge/investigations/investigation-2026-08-02-1432.html
Want me to fix this? Run /slashforge:code investigation-2026-08-02-1432.html
```

The two lines use different forms on purpose. The pointer after the arrow is the
full path — where the file lives, clickable in most terminals. The command takes
the **bare filename**, which `/slashforge:code` resolves against
`docs/slashforge/investigations/`, so there is less to type or paste.

That handover is the point. ==`/slashforge:code` reads the report as its
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
argument for reaching for it before `/slashforge:code` on anything you do not
yet understand. Diagnosing at investigate prices and handing the report forward
costs less than diagnosing midway through a full run.

## Argument

The argument is optional and freeform — a symptom, an error message, a failing
test name, or a description:

```
/slashforge:investigate the auth middleware drops the session on refresh
/slashforge:investigate TypeError: cannot read property 'id' of undefined
```

Without one, it asks what you are seeing.
