---
title: Graphify for graph-aware exploration
description: Optional AST-level knowledge graph so agents query the call graph and blast radius instead of grepping files.
---

[Graphify](https://github.com/safishamsi/graphify) is a local, AST-level
knowledge graph engine. Indexed against your repo, agents query the call graph,
blast radius, and dependency surface directly instead of grepping raw files.

It is entirely optional.

## When it is offered

`/forge:setup` detects language fit while exploring. If **at least 70% of
non-trivial source files** are in a supported language, it offers to install and
index. On YAML, shell, or config-only repos it skips silently — no prompt.

Supported: Python, JS/TS, Go, Rust, Java, C/C++, Ruby, C#, Kotlin, Scala, PHP,
Swift, Lua, Zig, PowerShell, Elixir, Objective-C, Julia, Verilog, SystemVerilog,
Vue, Svelte, Dart.

This is a **setup-time offer, not a per-command check**. Once installed,
Graphify's own PreToolUse hook on Glob/Grep surfaces graph context automatically.

## Ask first, never auto-install

Every install step is a shell command Claude could run itself. It doesn't. You
are shown the exact four commands before anything is authorised:

```bash
uv tool install graphifyy        # or: pipx install graphifyy / pip install graphifyy
graphify install
graphify .                       # initial indexing — seconds to minutes
graphify claude install          # appends CLAUDE.md section + Glob/Grep PreToolUse hook
```

Say `n` and `/forge:setup` skips it silently. Re-run `/forge:setup` later and
the offer fires again.

## Token impact

| Command path | Graph used? | Typical saving |
| --- | --- | --- |
| `/forge:code` full flow | yes | **−10 to −25k** |
| `/forge:investigate` | yes | **−15 to −30k** |
| `/forge:code` trivial auto-detect | no | skipped — overhead exceeds value |
| `/forge:code -quick` | no | skipped — same reason |

`/forge:investigate` is the biggest single win: blast radius is exactly what the
graph is built to answer.

Read those absolutes in proportion. On `/forge:code`, 10–25k off a 100–250k
baseline is roughly **4–10%** — real, but it does not change the order of
magnitude of a run. On `/forge:investigate` the same kind of saving comes off a
much smaller total, so the proportional win is far larger. That is the reason to
install Graphify: sharper investigations, not dramatically cheaper features.

## SUMMARY.html

After the four commands succeed, `/forge:setup` synthesises
`graphify-out/SUMMARY.html` — a browser-readable interpretation of Graphify's
machine-formatted `GRAPH_REPORT.md` (~400 lines). It covers god nodes,
surprising connections marked real or false-positive, plain-language community
labels, and CLI query examples.

Self-contained HTML with embedded CSS — no external assets, opens offline. Costs
a one-time ~5–15k tokens, with no second prompt; your yes to Graphify covers it.

## Keeping the graph fresh

A stale graph is worse than none — it answers confidently and wrongly. Two
defences:

**Proactive.** Run `graphify watch .` in a separate terminal tab. The graph
updates incrementally as files change. Free, continuous, recommended.

**Reactive.** The kit checks graph freshness before each graph-consulting
command. If the graph is more than **7 days** behind your latest source commit,
or **50+ commits** behind, it warns and offers to re-run `graphify .` and
re-synthesise SUMMARY.html.

Decline and the command continues with the stale graph. Accept and both files
refresh — no second prompt.

The freshness check fires on `/forge:code` full flow, `/forge:investigate`, and
`/forge:setup` Update flow. It auto-skips on `/forge:code -quick`, `/forge:code`
trivial, and repos without Graphify — zero overhead there.

## Upstream notes

Graphify is pre-1.0 (v0.5.0 as of 2026-04-23). If install commands change
upstream, re-run `npx slashforge` to pull updated guide content.

The PyPI package is **`graphifyy`** — double `y`. Other `graphify*` packages are
unaffiliated.
