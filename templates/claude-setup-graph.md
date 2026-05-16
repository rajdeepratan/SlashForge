---
name: Claude Setup — Graphify Integration
description: Setup-time offer that builds a queryable code graph for the repo, so agents can query the call graph instead of exploring raw files. Saves ~10–30k tokens per non-trivial command run. Runs only inside /setup-claude. Follows show-commands-then-ask pattern — never auto-installs.
---

# Graphify Integration (Setup-Time Offer)

Graphify builds an AST-level knowledge graph of a repo — nodes for functions/classes, edges for call graphs and relationships, blast-radius queries, god-node detection. When present in a repo, agents read a pre-built graph summary and/or query the graph directly instead of grepping raw files for scope, dependency, and affected-surface questions.

**This is not a preflight check.** Do not check for Graphify on every command — it is a repo-level dependency, offered once during `/setup-claude`. Once installed, its own `graphify claude install` wires a PreToolUse hook on Glob/Grep that auto-surfaces graph context for every subsequent command, with no extra guide-side enforcement needed.

---

## Ask-First — NEVER Auto-Install

Even though every install step is a pure shell command Claude could run via Bash without further prompts, the integration **must not install silently or by default**. Show the user the exact commands, then ask. Capability is not consent.

This applies even when the user said "sure" to the offer in principle — the y/n prompt is for the final commands, not the intent.

---

## When to Offer (language-fit gate, then branch on state)

**Hard preconditions** — skip silently if either fails:

- The repo is being set up via `/setup-claude` (fresh or Update flow)
- **≥ 70% of non-trivial source files** are in Graphify-supported languages: Python, JavaScript, TypeScript, Go, Rust, Java, C, C++, Ruby, C#, Kotlin, Scala, PHP, Swift, Lua, Zig, PowerShell, Elixir, Objective-C, Julia, Verilog, SystemVerilog, Vue, Svelte, Dart

If the repo is mostly YAML / shell / config / templates / a language not in the list above, **skip silently** — no offer, no prompt. Graphify adds no value where it can't parse.

**Once preconditions pass, branch on machine + repo state:**

| `graphify` on `PATH`? (`command -v graphify`) | `graphify-out/graph.json` in this repo? | Action |
|---|---|---|
| No | — | **Branch A — Full install + index** (CLI install, then index this repo) |
| Yes | No | **Branch B — Index this repo only** (CLI already installed globally; this repo just needs indexing) |
| Yes | Yes | **Branch C — Freshness check** (see Runtime section below) |

> **Critical:** never short-circuit when the CLI is on `PATH` but the repo has no graph yet. That is Branch B, not "skip." A fresh repo on a Graphify-installed machine still needs `graphify .` + `graphify claude install` + `SUMMARY.md` synthesis — only the CLI-install step is unnecessary.

---

## Why It Matters (show verbatim to the user when offering)

Use this block for both Branch A and Branch B. Drop the `uv`/Python cost bullet from Branch B since the CLI is already installed.

> **Why Graphify saves tokens on this workflow:**
>
> - Today, `/code` on a non-trivial change spends ~10–30k tokens on raw file exploration (grep/glob to figure out call graphs, affected surface, dependencies). With Graphify indexed, agents read a summary + do targeted graph queries instead.
> - `/investigate` is the biggest single win — blast-radius analysis is exactly what the graph is built for. Expect ~15–30k tokens saved per investigation.
> - Phase 2 *Affected surface* stops being a guess and becomes a graph query.
>
> **Costs:**
>
> - **Python 3.10+ and `uv` (or `pipx`/`pip`)** installed on your machine *(Branch A only — skip this line on Branch B)*
> - Initial indexing takes a few seconds on small repos, several minutes on large monorepos
> - One-time **~5–15k tokens** to synthesise `graphify-out/SUMMARY.md` (the human-readable version of the graph report) right after indexing
> - The graph must be kept fresh — run `graphify watch .` in a terminal tab, or re-run `graphify .` after major refactors, to avoid Claude citing relationships that no longer exist

---

## Branch A — Full install + index (CLI not on `PATH`)

1. **Print the "Why it matters" block** above (full version).
2. **Show the exact four commands** that will run, so the user sees what they're authorising:
   ```bash
   uv tool install graphifyy        # installs the CLI (note: double-y package name)
   graphify install                 # Graphify's own first-run setup
   graphify .                       # indexes this repo — seconds to minutes
   graphify claude install          # appends CLAUDE.md section + installs Glob/Grep PreToolUse hook
   ```
   If `uv` is not available on the user's system, fall back to `pipx install graphifyy` or `pip install graphifyy` — mention both alternatives before asking.
3. **Ask explicitly:** *"Install and index with these commands? (y/n)"* — no default-to-yes, no shortcut flag.
4. **On yes:** run the four commands in order via Bash, stopping on any failure and surfacing the error verbatim. The user still sees each Bash call through the normal permission-prompt flow unless they've pre-allowed shell commands.
5. **On yes — after step 4 succeeds:** synthesise `graphify-out/SUMMARY.md` from `graphify-out/GRAPH_REPORT.md` per `claude-setup-graph-summary.md`. **No second prompt** — the user's yes to Graphify covers this. ~5–15k tokens, one-time.
6. **On no:** skip silently. Do not re-ask during this session. On the next `/setup-claude` re-run, the offer fires again.

---

## Branch B — Index this repo only (CLI on `PATH`, no graph in this repo)

Common case for users who already have `graphify` installed globally and are setting up a new repo for the first time. **Do not skip — the per-repo index and SUMMARY.md are still missing.**

1. **Print the "Why it matters" block** above, dropping the `uv`/Python cost bullet (the CLI is already installed). You can prepend one short line: *"`graphify` is already on your `PATH`, so this is index-only — no CLI install needed."*
2. **Show the exact two commands** that will run:
   ```bash
   graphify .                       # indexes this repo — seconds to minutes
   graphify claude install          # appends CLAUDE.md section + installs Glob/Grep PreToolUse hook
   ```
3. **Ask explicitly:** *"Index this repo with these commands? (y/n)"* — no default-to-yes, no shortcut flag.
4. **On yes:** run the two commands in order via Bash, stopping on any failure and surfacing the error verbatim.
5. **On yes — after step 4 succeeds:** synthesise `graphify-out/SUMMARY.md` from `graphify-out/GRAPH_REPORT.md` per `claude-setup-graph-summary.md`. **No second prompt.** ~5–15k tokens, one-time.
6. **On no:** skip silently. Do not re-ask during this session. On the next `/setup-claude` re-run, the offer fires again.

---

## Branch C — Freshness check (CLI on `PATH`, graph already in this repo)

The graph exists; just verify it's not stale. Follow the **Runtime: Freshness Check** section below — same logic that runs on every non-trivial command. On stale, offer to re-index; on fresh, pass silently.

---

## Critical Ordering — kit's CLAUDE.md FIRST

`graphify claude install` appends a section to `CLAUDE.md` and writes a PreToolUse hook to `.claude/settings.json` — both files `/setup-claude` itself manages. The rule:

> **`/setup-claude` writes its own `CLAUDE.md` and `settings.json` FIRST, then `graphify claude install` runs LAST.**

If Graphify runs first, the kit's subsequent `CLAUDE.md` write overwrites Graphify's appended section. By running Graphify last, Graphify's additions sit in a marker-less section that the kit's `generated_by` marker system treats as user-edited — safe from future kit re-runs.

---

## After a Successful Install / Index

Tell the user, verbatim (drop "installed and" on Branch B since the CLI was already there):

> *"Graphify is installed and this repo is indexed. I've also synthesised `graphify-out/SUMMARY.md` — the human-readable version of the graph report (read it once to anchor your mental model). Open a separate terminal tab and run `graphify watch .` to keep the graph in sync with file changes — without it, the graph goes stale and agents may cite relationships that no longer exist. The Claude Code Glob/Grep hook is now active; agents will see graph context automatically on the next command."*

Branch B variant: *"This repo is now indexed. I've also synthesised `graphify-out/SUMMARY.md`..."* (rest identical).

---

## When a Graph is Present (runtime usage)

The PreToolUse hook Graphify installs handles the default case — agents see graph context before any Glob or Grep call. Two phase-specific reinforcements in case the hook misses:

- **`claude-setup-workflow.md` Phase 2 — Affected surface:** *"If `GRAPH_REPORT.md` exists at repo root, consult it for blast-radius of the entry-point symbols rather than guessing from filename proximity."*
- **`claude-setup-workflow-investigation.md` Phase I2:** *"If a graph is available, consult it first. Investigation is the scenario the graph is built for — blast radius, call paths, god-node identification."*

**Skip the graph on trivial / lean paths:** `/code` auto-detected trivial, and `/quick`. The graph-load overhead (~2–5k tokens) exceeds the value on typo-sized work, and the trivial path shouldn't be greping much anyway.

---

## Runtime: Freshness Check (auto)

When a command is about to consult the graph, first verify the graph isn't stale relative to recent code changes. This runs in `/code` full flow, `/investigate`, and `/setup-claude` Update flow. **Skip on `/quick` and `/code` trivial auto-detect** — those paths don't consult the graph anyway.

### Early-exit if no graph

```bash
[ -f graphify-out/graph.json ] || exit 0
```

If `graphify-out/graph.json` doesn't exist, Graphify isn't installed in this repo. Exit silently — zero overhead for non-Graphify users.

### Detection (script-level, ~50 tokens)

```bash
graph_mtime=$(stat -c %Y graphify-out/graph.json 2>/dev/null || stat -f %m graphify-out/graph.json)
last_src_commit=$(git log -1 --format=%ct -- '*.py' '*.js' '*.ts' '*.tsx' '*.jsx' '*.go' '*.rs' '*.java' '*.rb' '*.cs' '*.kt' '*.scala' '*.php' '*.swift' '*.cpp' '*.c' '*.h')
commits_since_index=$(git log --oneline --since="@${graph_mtime}" -- '*.py' '*.js' '*.ts' '*.tsx' '*.jsx' '*.go' '*.rs' '*.java' '*.rb' '*.cs' '*.kt' '*.scala' '*.php' '*.swift' '*.cpp' '*.c' '*.h' | wc -l)
```

**Stale criteria** (any one triggers):

- `last_src_commit > graph_mtime + 7 days` (7 * 86400 seconds)
- `commits_since_index >= 50`

If neither condition holds, the graph is fresh — pass silently.

### On stale: warn + offer (does not auto-run)

Print exactly:

> *"Graph is N days behind the latest source commit (M commits since last index). Re-run `graphify .` to refresh? (y/n) — declining is fine; the graph will still answer questions but may cite relationships that have changed."*

- **On yes:** run `graphify .` via Bash. Same "show command then run" discipline — the user has already seen what runs because the command is in the prompt. After it succeeds, **re-synthesise SUMMARY.md** by re-following `claude-setup-graph-summary.md` (no second prompt — same authorisation as the install-time SUMMARY.md write).
- **On no:** proceed with the stale graph. Do not warn again in this command — the user has seen and decided.

### Cost summary

| State | Tokens added per command |
|---|---|
| No graph installed | 0 (early exit) |
| Graph fresh | ~50 (silent stat + git log + comparison) |
| Graph stale, declined | ~200–500 (warning + y/n flow) |
| Graph stale, accepted | ~50 + wall-clock for `graphify .` + ~5–15k SUMMARY.md re-synthesis |

Steady-state cost on a healthy repo (graph fresh, watch running): negligible. Big costs only fire when an actual refresh is needed.

---

## Caveats

- **Stale-graph correctness risk.** A graph that's 2 weeks old in an actively-refactored repo will make Claude cite relationships that no longer exist. `graphify watch` is not optional — it's the mitigation. Tell the user this explicitly.
- **Language coverage is partial.** Non-supported files (YAML, shell, config) are not in the graph. Claude still greps those; the graph just covers the code surface it supports.
- **Graphify is pre-1.0 (v0.5.0).** Interfaces may shift upstream. If `graphify` commands change, re-run `npx claude-setup-kit` to pull updated guide content.
- **Never add a `--yes` / auto-install flag to this offer.** Principle: the user sees what's being installed on their machine.
