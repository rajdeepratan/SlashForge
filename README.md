<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/svg/slashforge-lockup-outlined-dark.svg">
    <img src="assets/svg/slashforge-lockup-outlined.svg" alt="SlashForge" height="60">
  </picture>
</p>

<p align="center"><strong>Workflow slash commands for AI coding agents.</strong></p>

<p align="center">
<a href="https://www.npmjs.com/package/slashforge"><img src="https://img.shields.io/npm/v/slashforge.svg?color=EC3013&labelColor=201E1D" alt="npm version"></a>
<a href="https://github.com/rajdeepratan/SlashForge/actions/workflows/ci.yml"><img src="https://github.com/rajdeepratan/SlashForge/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/npm/l/slashforge.svg?color=EC3013&labelColor=201E1D" alt="license"></a>
<a href="package.json"><img src="https://img.shields.io/node/v/slashforge.svg?color=EC3013&labelColor=201E1D" alt="node"></a>
<a href="https://buymeacoffee.com/rajdeepratan"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-EC3013.svg?labelColor=201E1D&logo=buymeacoffee&logoColor=white" alt="Buy Me A Coffee"></a>
</p>

Installs four commands on any machine — `/setup-claude` to scaffold a repo, `/code` for freeform development, `/quick` for lean small-change work, and `/investigate` for read-only research.

Currently supports **Claude Code**. Cursor and Codex targets are planned.

> **Renamed in v2.0.0.** This package was previously published as `claude-setup-kit`. The old package is deprecated — switch to `npx slashforge`. The `claude-setup-kit` binary and `CLAUDE_SETUP_KIT_YES` env var still work but will be removed in v3.

---

## What it does

Installs a collection of guide files plus four slash commands that cover the full lifecycle from repo setup through shipped PRs and bug investigations.

**Commands installed:**

- **`/setup-claude`** — one-time repo setup. Explores the repo, asks clarifying questions, then creates `CLAUDE.md`, agents, rules, skills, commands, and hooks tailored to the codebase. Handles both fresh repos and partial setups.
- **`/code`** — freeform end-to-end development workflow. Ten phases: plan → confirm → branch → implement → verify → review → push → PR → PR feedback → post-merge cleanup. ~100–250k tokens per feature.
- **`/quick`** — lean version of `/code` for small changes. Skips brainstorming, uses a minimal plan (Changes + Test strategy only), and replaces the agent-driven code review with an inline self-review checklist. Keeps every user gate (plan, branch, PR, cleanup) and Phase 6 lint/test/build verification. ~40–70k tokens per change. Use for typo fixes, copy changes, config tweaks, renames, single-file refactors.
- **`/investigate [symptom]`** — read-only research. Reproduces and root-causes a suspected bug, produces a findings report saved to `.claude/investigations/`.

---

## Installation

**One-time run (recommended):**
```bash
npx slashforge
```

**Or install globally:**
```bash
npm install -g slashforge
slashforge
```

Running it again on a machine that already has it installed will prompt you to update to the latest version.

### Installer flags and subcommands

```bash
slashforge --dry-run   # Print planned file writes without touching the filesystem
slashforge --yes       # Non-interactive — auto-confirm the update prompt
slashforge status      # Show installed version, guide count, and available update
slashforge --help      # Full usage
slashforge --project    # Install into ./.claude/ in the current repo (committable, no global install needed)
slashforge uninstall    # Remove the kit's guides + commands (add --project for ./.claude)
```

`--yes` / `-y` is also enabled by `SLASHFORGE_YES=1` (or the deprecated `CLAUDE_SETUP_KIT_YES=1`) or when stdin is not a TTY — safe to use in CI, devcontainers, or anywhere the install shouldn't block on an interactive prompt.

`--project` vendors both the guide files and the four command files into the repo's `./.claude/` with repo-relative paths — commit it and teammates get the commands with no global install. `uninstall` reverses either install (pass `--project` to target the repo copy).

Every template is frontmatter-validated before any write — a broken guide (missing fences, missing `name` / `description`) will fail the install cleanly rather than half-write it.

---

## What gets installed

| What | Where |
|---|---|
| Guide files | `~/.claude/setup/claude-setup/` |
| `/setup-claude` command | `~/.claude/commands/setup-claude.md` |
| `/code` command | `~/.claude/commands/code.md` |
| `/quick` command | `~/.claude/commands/quick.md` |
| `/investigate` command | `~/.claude/commands/investigate.md` |

The guide files cover:
- **Instructions** — golden rules, creation order, file structure, verification
- **Preflight** — superpowers dependency check that runs before every command does anything else
- **Graph** — optional Graphify integration: setup-time install offer, runtime freshness check, and the SUMMARY.html synthesis prompt
- **Workflow** — the ten-phase development loop used by `/code` and `/quick` (plan → confirm → branch → implement → verify → review → push → PR → PR feedback → post-merge cleanup), split across three focused files (base phases, investigation flow, agent selection)
- **Rules** — how to create rule files for a repo (including path-scoped rules)
- **Skills** — how to create skills using Anthropic's `SKILL.md` directory format
- **Agents** — how to create agent files, superpowers skill mappings, monorepo structure
- **Commands** — how to create slash commands (and the commands ↔ skills merger)
- **Hooks** — how to configure automated behaviors in `settings.json` (events, scopes, common patterns)
- **CLAUDE.md** — entry point file, `@path` imports, `AGENTS.md` interop
- **Memory** — when and how to use Claude Code's persistent memory system

---

## Preflight check — superpowers

Every command installed by the kit runs a **preflight check before doing any repo work** — before exploring the codebase, reading files, or starting a phase.

If the `superpowers` plugin is missing, the command **stops and explains why it matters, lists what you lose without it, and offers to install** before proceeding. You can decline and run in an explicitly-degraded mode — the command will never silently drop a skill call.

**Superpowers** — install with:
```
/plugin install superpowers@claude-plugins-official
```
Without it, phases skip their skill invocations (brainstorming, writing-plans, TDD, systematic-debugging, verification, receiving-code-review). For bug fixes this means no enforced red→green regression test.

If the upstream superpowers project renames a skill, re-run `npx slashforge` to pull updated guide files.

**Graphify is a second optional integration but is not a preflight check** — it's a one-time setup-time offer inside `/setup-claude`, not re-checked per command. See the Graphify section below.

---

## Optional: Graphify for graph-aware exploration

[Graphify](https://github.com/safishamsi/graphify) is a local AST-level knowledge graph engine. Once indexed against your repo, agents can query the call graph, blast radius, and dependency surface directly instead of grepping raw files.

**When it's offered:** `/setup-claude` detects language fit during exploration — if ≥ 70% of non-trivial source files are in Graphify-supported languages (Python, JS/TS, Go, Rust, Java, C/C++, Ruby, C#, Kotlin, Scala, PHP, Swift, Lua, Zig, PowerShell, Elixir, Objective-C, Julia, Verilog, SystemVerilog, Vue, Svelte, Dart), the command offers to install and index. On YAML / shell / config-only repos it skips silently — no prompt. This is a **setup-time offer, not a per-command preflight** — once installed, Graphify's own PreToolUse hook on Glob/Grep surfaces graph context automatically on every command.

**Ask-first, never auto-install.** Even though every install step is a shell command Claude could run via Bash, the integration shows you the exact four commands before asking — you see what's going onto your machine before authorising anything:

```bash
uv tool install graphifyy        # or: pipx install graphifyy / pip install graphifyy
graphify install
graphify .                       # initial indexing — seconds to minutes depending on repo size
graphify claude install          # appends CLAUDE.md section + installs the Glob/Grep PreToolUse hook
```

Say `n` and `/setup-claude` skips it silently. Re-run `/setup-claude` later and the offer fires again.

**SUMMARY.html auto-synthesis.** After the four commands succeed, `/setup-claude` synthesises `graphify-out/SUMMARY.html` automatically — a human-readable, browser-renderable interpretation of Graphify's machine-formatted `GRAPH_REPORT.md` (~400 lines), with god nodes, surprising connections marked real or false-positive, plain-language community labels, and CLI query examples. Self-contained HTML with embedded CSS — no external assets, opens cleanly offline. Costs a one-time ~5–15k tokens, no second prompt — your yes to Graphify covers it.

**Auto-freshness on subsequent runs.** Once Graphify is installed, the kit checks whether the graph is in sync with your recent code changes before each graph-consulting command. The check fires on `/code` full flow, `/investigate`, and `/setup-claude` Update flow.

If the graph is more than 7 days behind your latest source-file commit (or 50+ commits behind), the kit prints a one-line warning and offers to re-run `graphify .` and re-synthesise SUMMARY.html. Decline and the command continues with the stale graph; accept and the kit refreshes both files (no second prompt — your accept covers both).

The check auto-skips on `/quick`, `/code` trivial, and repos without Graphify installed — zero overhead in those cases.

**Token impact when installed:**

| Command path | Graph used? | Tokens saved per run (typical) |
|---|---|---|
| `/code` full flow (real feature, real bug — the default for non-trivial work) | yes | **−10 to −25k** |
| `/investigate` | yes | **−15 to −30k** (biggest single win — blast radius is exactly what the graph is built for) |
| `/code` trivial auto-detect (typo, one-line tweak — Claude classifies this automatically) | no | graph skipped — load overhead exceeds value on typo-sized work |
| `/quick` (you opted into lean mode) | no | graph skipped — same reason |

**Keeping the graph fresh.** Two ways:

- **Proactive:** run `graphify watch .` in a separate terminal tab — the graph updates incrementally as files change. Free, continuous, recommended.
- **Reactive (safety net):** the kit's auto-freshness check above catches stale graphs at the start of any graph-consulting command and offers to refresh. Bounds your staleness window to 7 days / 50 commits if you forget watch.

**Upstream notes.** Graphify is pre-1.0 (v0.5.0 as of 2026-04-23). If install commands change upstream, re-run `npx slashforge` to pull updated guide content. The PyPI package is named `graphifyy` (double-y) — other `graphify*` packages are unaffiliated.

---

## Auto-coverage check (`.claude/` + `CLAUDE.md`)

When `/code` runs on a non-trivial feature, the kit checks whether the feature introduces a new domain (framework, layer, language, pattern) that `.claude/` doesn't yet cover. If gaps exist — no specialist agent, no scoped rule, no mention in `CLAUDE.md`'s tech stack — the check fires twice:

1. **Phase 2 (proactive)** — before the plan is written, the kit asks: *"This feature introduces [domain X]. `.claude/` is missing [agent / rule / CLAUDE.md update]. Add these to the plan as Phase 2.5 updates so they ship in this PR? (y/n)"* If you accept, the new `.claude/` files are drafted in Phase 5 alongside the feature code.
2. **Phase 7 (safety net)** — the `code-reviewer` agent re-checks the diff. If gaps remain (you said no at Phase 2, or a new gap surfaced during implementation), it raises a review **note** suggesting an addition before merge or as a follow-up `/setup-claude` run. Note, not a block — the PR can still merge.

**Auto-skipped on:**
- `/quick` (lean mode — small changes don't introduce new domains by definition)
- `/code` trivial auto-detect (typos, single-line tweaks)
- `/investigate` (read-only, no code changes)

**Cost:** ~100–300 tokens per run when no gaps detected; ~300–600 when gaps surface and you decline; ~3–8k extra when you accept and new files are generated as part of the feature. See `claude-setup-coverage.md` for the detection matrix and heuristic.

**Why it matters:** without this, every new domain silently widens the gap between what's in the repo and what `.claude/` knows about. Specialist agents stay generic, rules don't enforce domain conventions, `CLAUDE.md` drifts from reality. Coverage check closes the loop incrementally instead of relying on the user to remember to re-run `/setup-claude`.

---

## Usage

Once installed, open Claude Code in any repo.

**One-time repo setup:**
```
/setup-claude
```
Detects whether the repo is fresh or already has a setup, and acts accordingly.

**Day-to-day development:**

```
/code
```
Freeform workflow. Starts with *"What do you want to build, fix, or change?"* and walks through ten phases, pausing at four user gates: plan confirmation, branch decision, PR target + reviewers, and branch cleanup after merge.

Phase 1 **auto-classifies** the task as trivial or full based on an explicit checklist (≤ 2 files, no new abstraction / dependency / public API, no force-full keywords like `refactor` or `migrate`). Claude announces the decision (*"Treating this as trivial: single-file string change. Say 'full flow' to override."*) and proceeds — trivial tasks skip brainstorming and use a lean plan (Changes + Test strategy only), full tasks run the whole flow. You can override with `full flow` or `quick` in your reply. Phases 3–10 run normally in both paths, so every gate and the Phase 6 verification stay in place.

```
/quick
```
Lean workflow for small changes where the full `/code` ceremony is overkill but you still want safety rails on what leaves your machine. Same ten phases as `/code`, with three overrides:

- **Phase 1** — skip brainstorming entirely; go straight to Phase 2 with the user's description as-is
- **Phase 2** — lean plan: **Changes** and **Test strategy** only (other sections included only when they genuinely apply)
- **Phase 7** — replace the `code-reviewer` agent pass with an inline self-review checklist (plan match, no debug leftovers, no hardcoded values, repo conventions, no unintended public-API change)

All four user gates stay (plan confirmation, branch, PR, cleanup). Phase 6 lint/test/build verification stays. Phase 5 runs TDD when the change is testable, straight implementation otherwise. No `systematic-debugging`, no `subagent-driven-development`.

`/quick` does **not auto-escalate** — if the plan reveals more than 2 files or a new abstraction, it stops and tells you to restart with `/code`. Typical footprint: **40–70k tokens** (vs `/code`'s 100–250k).

Use for: typos, copy changes, config tweaks, renames, minor refactors touching ≤ 2 files.
Don't use for: bug fixes where the root cause isn't already understood (use `/code`), anything multi-file with new abstractions.

```
/investigate "users see 500 when uploading >10MB files"
```
Read-only research. No branches, no PRs, no code changes. Produces a findings report (summary, reproduction, root cause, affected scope, suggested next step) written as a self-contained HTML file to `.claude/investigations/investigation-<timestamp>.html` and printed in chat.

---

## `/setup-claude` vs Anthropic's `/init`

Claude Code ships with a built-in `/init` command. The two are complementary, not competitors:

| | `/init` (built-in) | `/setup-claude` (this kit) |
|---|---|---|
| Creates | `CLAUDE.md` only (or + skills/hooks with `CLAUDE_CODE_NEW_INIT=1`) | Full `.claude/` — rules, skills, agents, commands, hooks, plus `CLAUDE.md` |
| Approach | Discovers and suggests — opinion-light | Opinionated — enforces multi-agent layout, 200-line cap, global vs specialist split |
| Agents | None | Mandatory: `developer`, `code-reviewer`, `git`, plus specialists |
| Workflow | None | Four commands: `/setup-claude` (setup), `/code` (full flow), `/quick` (lean flow), `/investigate` (read-only research) |
| Monorepo | Single-repo focused | Root + per-app `CLAUDE.md` flow |
| Existing setup | Suggests improvements to `CLAUDE.md` | Full Update flow — reads everything in `.claude/` and fills gaps |

**Use `/init`** for a lightweight starter `CLAUDE.md` on a personal project. **Use `/setup-claude`** when the repo needs a disciplined `.claude/` layout, specialist agents, or a defined team workflow. You can also run `/init` first for a starter, then `/setup-claude` in Update mode to enrich it.

---

## Monorepo support

`/setup-claude` handles monorepos — it creates a root `CLAUDE.md` with shared global agents, and a separate `CLAUDE.md` with app-specific rules, skills, and agents for each app.

---

## Updating

Re-run the install command to update your guide files to the latest version:

```bash
npx slashforge
# → "slashforge is already installed. Update to v1.0.x? (y/n)"
```

**Safe re-runs of `/setup-claude`.** Every file `/setup-claude` creates in a repo's `.claude/` and the root `CLAUDE.md` now carries a `generated_by` marker (YAML frontmatter for `.claude/` files, an HTML comment for `CLAUDE.md`). On re-run, the Update flow uses the marker to tell kit-generated files from files you've edited:

- Marker present, version current → safe to refresh
- Marker present, version older → stale; proposes a refresh and asks before overwriting
- Marker missing or edited → treated as user-owned; edits to fill gaps only, never overwritten

Remove or edit the marker on any file you want the kit to leave alone.

---

## Author

<img src="assets/png/rajdeepratan.png" width="72" alt="Rajdeep Ratan">

**Rajdeep Ratan** — [GitHub](https://github.com/rajdeepratan) · [npm](https://www.npmjs.com/~rajdeepratan)

---

## Support

If this kit saves you time, consider supporting the work:

<a href="https://buymeacoffee.com/rajdeepratan"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg?logo=buymeacoffee&logoColor=black" alt="Buy Me A Coffee"></a>

☕ [buymeacoffee.com/rajdeepratan](https://buymeacoffee.com/rajdeepratan)

---

## License

[MIT](LICENSE) © Rajdeep Ratan
