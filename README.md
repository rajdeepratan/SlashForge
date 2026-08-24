<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/svg/slashforge-lockup-outlined-dark.svg">
    <img src="assets/svg/slashforge-lockup-outlined.svg" alt="SlashForge" height="60">
  </picture>
</p>

<p align="center"><strong>Workflow slash commands for AI coding agents.</strong></p>

<p align="center"><em>Guardrails, not autocomplete.</em></p>

<p align="center">
<a href="https://www.npmjs.com/package/slashforge"><img src="https://img.shields.io/npm/v/slashforge.svg?color=EC3013&labelColor=201E1D" alt="npm version"></a>
<a href="https://github.com/rajdeepratan/SlashForge/actions/workflows/ci.yml"><img src="https://github.com/rajdeepratan/SlashForge/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
<a href="LICENSE"><img src="https://img.shields.io/npm/l/slashforge.svg?color=EC3013&labelColor=201E1D" alt="license"></a>
<a href="package.json"><img src="https://img.shields.io/node/v/slashforge.svg?color=EC3013&labelColor=201E1D" alt="node"></a>
<a href="https://github.com/sponsors/rajdeepratan"><img src="https://img.shields.io/badge/Sponsor-EC3013.svg?labelColor=201E1D&logo=githubsponsors&logoColor=white" alt="Sponsor"></a>
<a href="https://buymeacoffee.com/rajdeepratan"><img src="https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-EC3013.svg?labelColor=201E1D&logo=buymeacoffee&logoColor=white" alt="Buy Me A Coffee"></a>
</p>

<p align="center">
  <strong><a href="https://www.rajdeepratan.com/slashforge/">📖 Documentation</a></strong>
</p>

Installs four commands on any machine — `/slashforge:setup` to scaffold a repo, `/slashforge:code` for freeform development (add `-quick` for lean small-change work), `/slashforge:investigate` for read-only research, and `/slashforge:review-pr` to review someone else's PR against your repo's rules.

Supports **Claude Code**, and **Cursor** via `npx slashforge --target cursor`.
**Codex** reads the same `.agents/skills/` directory and invokes the commands as
`$slashforge-code`, though that path is not yet verified.

On Cursor and Codex the commands are hyphenated — `/slashforge-code`, not
`/slashforge:code` — because neither supports the `:` namespace. `/slashforge:setup`
is Claude Code only for now; it provisions `.claude/` structure that has no equivalent
on the other targets.

> ### ⚠️ Breaking changes in v4.0.0
>
> **The command namespace moved from `/forge:` to `/slashforge:`.** `forge` is a
> common word and was liable to collide with other tools' commands.
>
> | v3 | v4 |
> |---|---|
> | `/forge:setup` | `/slashforge:setup` |
> | `/forge:code` | `/slashforge:code` |
> | `/forge:investigate` | `/slashforge:investigate` |
>
> **Coming from v2?** Commands were `/setup-claude`, `/code`, `/quick` and
> `/investigate`; `/quick` is now a mode — `/slashforge:code -quick`. See
> [Migrating to v3](https://www.rajdeepratan.com/slashforge/guides/migrating-to-v3/),
> then this table.
>
> **Upgrading:** run `npx slashforge`. It installs the new layout and lists any
> older files still on disk — it will not delete them for you. Remove them
> yourself, or run `npx slashforge uninstall` to clear every layout and
> reinstall clean.

---

## What it does

Installs a collection of guide files plus four slash commands that cover the full lifecycle from repo setup through shipped PRs, code review, and bug investigations.

**Commands installed:**

- **`/slashforge:setup`** — one-time repo setup. Explores the repo, asks clarifying questions, then creates `CLAUDE.md`, agents, rules, skills, commands, and hooks tailored to the codebase. Handles both fresh repos and partial setups. ~50–120k tokens, paid once — it has the largest fixed instruction load of any command (~20k before it reads a line of your code) and writes a dozen or more files.
- **`/slashforge:code`** — freeform end-to-end development workflow. Ten phases: plan → confirm → branch → implement → verify → review → push → PR → PR feedback → post-merge cleanup. ~100–250k tokens per feature without Graphify; ~75–225k with it indexed.
- **`/slashforge:code -quick`** — lean version of `/slashforge:code` for small changes. Skips brainstorming, uses a minimal plan (Changes + Test strategy only), and replaces the agent-driven code review with an inline self-review checklist. Keeps every user gate (plan, branch, PR, cleanup) and Phase 6 lint/test/build verification. ~40–70k tokens per change. Use for typo fixes, copy changes, config tweaks, renames, single-file refactors.
- **`/slashforge:investigate [symptom]`** — read-only research. Reproduces and root-causes a suspected bug, produces a findings report saved to `docs/slashforge/investigations/`, then hands the report path to `/slashforge:code` so the fix starts with the diagnosis already loaded. ~15–60k tokens, set by how far the trail runs — it writes one report, not code.
- **`/slashforge:review-pr [number]`** — reviews a PR against this repo's `CLAUDE.md`, `.claude/rules/` and existing conventions, then posts line-level comments or an approval. Lists the PRs awaiting your review when there is more than one. Never posts without showing you the exact text and asking. ~15–70k tokens per review, set almost entirely by the size of the diff.

---

## Is SlashForge right for you?

**It is deliberately heavy.** If you want a prompt turned into a patch as fast as possible, this is the wrong tool — the cost below is the point, not an inefficiency to be tuned away.

| | |
| --- | --- |
| **Full run** | 100–250k tokens per feature |
| **With Graphify indexed** | 75–225k — the graph replaces exploratory grep, roughly 4–10% off |
| **`-quick` mode** | 40–70k per change. Skips brainstorming and the agent review; keeps every gate and the lint/test/build verification |
| **`/slashforge:review-pr`** | 15–70k per review, driven almost entirely by diff size |
| **`/slashforge:investigate`** | 15–60k per report. No code is written, so the cost is reading — how far the trail runs |
| **`/slashforge:setup`** | 50–120k, **once per repo.** Reads ~20k of its own instructions, then explores and writes your `.claude/` |
| **What you get for it** | Nothing ships that was not planned, gated, verified and reviewed |

The range is driven by the size of the work, not the tooling. A single-file copy change lands near the bottom; a multi-layer feature near the top.

For a review, the diff *is* the cost: a three-file PR is around 2k tokens of diff, a fourteen-file one around 42k — a twentyfold spread before anything else is read. Past roughly 1,500 changed lines the command says so rather than pretending a single pass was thorough.

**Use it when** the cost of shipping something wrong exceeds the cost of the ceremony — shared codebases, production services, work you will have to explain later.

**Skip it when** you are prototyping, spiking, or working somewhere a mistake is cheap to undo.

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
slashforge --target cursor   # Install for Cursor and Codex instead (see Targets below)
```

`--yes` / `-y` is also enabled by `SLASHFORGE_YES=1` (or the deprecated `CLAUDE_SETUP_KIT_YES=1`) or when stdin is not a TTY — safe to use in CI, devcontainers, or anywhere the install shouldn't block on an interactive prompt.

`--project` vendors both the guide files and the four command files into the repo's `./.claude/` with repo-relative paths — commit it and teammates get the commands with no global install. `uninstall` reverses either install (pass `--project` to target the repo copy).

### Targets

`--target` picks which agent to install for. It defaults to `claude`, and the Claude Code install is unchanged.

| Target | Installs to | Commands look like |
|---|---|---|
| `claude` (default) | `~/.claude/commands/slashforge/` | `/slashforge:code` |
| `cursor`, `codex`, `agents` | `~/.agents/skills/slashforge-code/SKILL.md` | `/slashforge-code` |

`cursor` and `codex` are aliases for `agents` — one install serves both, since Cursor and Codex each read `.agents/skills/`.

The names differ because neither Cursor nor Codex supports a `:` namespace: a skill is named by the folder holding its `SKILL.md`. The prefix has to live in the name, otherwise the commands would install as bare `/code` and `/plan` and collide with everything else in your skills directory. Cross-references inside the installed files are rewritten to match.

`/slashforge-setup` is **not** installed on those targets — it provisions `.claude/` rules, agents and hooks plus `CLAUDE.md`, which have no equivalent there. Codex invokes the skills as `$slashforge-code`; that path is not yet verified end to end.

Uninstall is careful with `.agents/skills/`, which you likely share with other tools: it removes only the `slashforge-*` directories it created, and removes `skills/` itself only if nothing else remains.

Every template is frontmatter-validated before any write — a broken guide (missing fences, missing `name` / `description`) will fail the install cleanly rather than half-write it.

---

## What gets installed

| What | Where (default `claude` target) |
|---|---|
| Guide files | `~/.claude/setup/slashforge/` |
| `/slashforge:setup` command | `~/.claude/commands/slashforge/setup.md` |
| `/slashforge:code` command | `~/.claude/commands/slashforge/code.md` |
| `/slashforge:investigate` command | `~/.claude/commands/slashforge/investigate.md` |
| `/slashforge:review-pr` command | `~/.claude/commands/slashforge/review-pr.md` |

On the `cursor` / `codex` target the guides land in `~/.agents/setup/slashforge/` and each command becomes `~/.agents/skills/slashforge-<name>/SKILL.md`, minus `setup`.

Commands live in a `slashforge/` subdirectory — that is what produces the `/slashforge:` namespace and keeps them from colliding with your own commands. `-quick` is a mode of `/slashforge:code`, not a separate command; it loads one extra guide file.

The guide files cover:
- **Instructions** — golden rules, creation order, file structure, verification
- **Graph** — optional Graphify integration: setup-time install offer, runtime freshness check, and the SUMMARY.html synthesis prompt
- **Workflow** — the ten-phase development loop used by `/slashforge:code` and `/slashforge:code -quick` (plan → confirm → branch → implement → verify → review → push → PR → PR feedback → post-merge cleanup), split across four focused files (base phases, investigation flow, PR review flow, agent selection)
- **Rules** — how to create rule files for a repo (including path-scoped rules)
- **Skills** — how to create skills using Anthropic's `SKILL.md` directory format
- **Agents** — how to create agent files, per-agent skill mappings, monorepo structure
- **Commands** — how to create slash commands (and the commands ↔ skills merger)
- **Hooks** — how to configure automated behaviors in `settings.json` (events, scopes, common patterns)
- **CLAUDE.md** — entry point file, `@path` imports, `AGENTS.md` interop
- **Memory** — when and how to use Claude Code's persistent memory system

---

## Skills — SlashForge ships its own

Nine skills install with the package, under the `slashforge:` namespace:

| Phase | Skill |
| --- | --- |
| 1 Intake | `slashforge:brainstorm` (full mode only) |
| 2 Plan | `slashforge:plan` |
| 4 Branch | `slashforge:worktree` (only when isolation is warranted) |
| 5 Implement | `slashforge:debug` (bugs) · `slashforge:parallel` (independent units) · `slashforge:tdd` (everything else) |
| 6 Verify | `slashforge:verify` |
| 7 Review | `slashforge:request-review` |
| 9 PR feedback | `slashforge:review-feedback` |

No plugin and no marketplace — the `slashforge:` namespace comes from the commands directory SlashForge already owns.

Three names are deliberately distinct: `slashforge:request-review` reviews **your own** work before it ships, `slashforge:review-feedback` handles comments **you received**, and `/slashforge:review-pr` reviews **someone else's** pull request.

They are adapted from [superpowers](https://github.com/obra/superpowers) under the MIT licence, © 2025 Jesse Vincent, with the notice carried in each skill file.

**The superpowers plugin is not required at all.** Nothing invokes it, checks for it, or behaves differently when it is present. There is no preflight, no prompt, and no degraded mode.

**Superpowers** — not required; install only if you want its own library:
```
/plugin install superpowers@claude-plugins-official
```
It is a good library in its own right and covers ground SlashForge does not. Install it for that, not for SlashForge.

**Graphify is the other optional integration**, and works differently — a one-time setup-time offer inside `/slashforge:setup`, not re-checked per command. See the Graphify section below.

---

## Optional: Graphify for graph-aware exploration

[Graphify](https://github.com/safishamsi/graphify) is a local AST-level knowledge graph engine. Once indexed against your repo, agents can query the call graph, blast radius, and dependency surface directly instead of grepping raw files.

**When it's offered:** `/slashforge:setup` detects language fit during exploration — if ≥ 70% of non-trivial source files are in Graphify-supported languages (Python, JS/TS, Go, Rust, Java, C/C++, Ruby, C#, Kotlin, Scala, PHP, Swift, Lua, Zig, PowerShell, Elixir, Objective-C, Julia, Verilog, SystemVerilog, Vue, Svelte, Dart), the command offers to install and index. On YAML / shell / config-only repos it skips silently — no prompt. This is a **setup-time offer, not a per-command preflight** — once installed, Graphify's own PreToolUse hook on Glob/Grep surfaces graph context automatically on every command.

**Ask-first, never auto-install.** Even though every install step is a shell command Claude could run via Bash, the integration shows you the exact four commands before asking — you see what's going onto your machine before authorising anything:

```bash
uv tool install graphifyy        # or: pipx install graphifyy / pip install graphifyy
graphify install
graphify .                       # initial indexing — seconds to minutes depending on repo size
graphify claude install          # appends CLAUDE.md section + installs the Glob/Grep PreToolUse hook
```

Say `n` and `/slashforge:setup` skips it silently. Re-run `/slashforge:setup` later and the offer fires again.

**SUMMARY.html auto-synthesis.** After the four commands succeed, `/slashforge:setup` synthesises `graphify-out/SUMMARY.html` automatically — a human-readable, browser-renderable interpretation of Graphify's machine-formatted `GRAPH_REPORT.md` (~400 lines), with god nodes, surprising connections marked real or false-positive, plain-language community labels, and CLI query examples. Self-contained HTML with embedded CSS — no external assets, opens cleanly offline. Costs a one-time ~5–15k tokens, no second prompt — your yes to Graphify covers it.

**Auto-freshness on subsequent runs.** Once Graphify is installed, the kit checks whether the graph is in sync with your recent code changes before each graph-consulting command. The check fires on `/slashforge:code` full flow, `/slashforge:investigate`, and `/slashforge:setup` Update flow.

If the graph is more than 7 days behind your latest source-file commit (or 50+ commits behind), the kit prints a one-line warning and offers to re-run `graphify .` and re-synthesise SUMMARY.html. Decline and the command continues with the stale graph; accept and the kit refreshes both files (no second prompt — your accept covers both).

The check auto-skips on `/slashforge:code -quick`, `/slashforge:code` trivial, and repos without Graphify installed — zero overhead in those cases.

**Token impact when installed:**

| Command path | Graph used? | Tokens saved per run (typical) |
|---|---|---|
| `/slashforge:code` full flow (real feature, real bug — the default for non-trivial work) | yes | **−10 to −25k** |
| `/slashforge:investigate` | yes | **−15 to −30k** (biggest single win — blast radius is exactly what the graph is built for) |
| `/slashforge:code` trivial auto-detect (typo, one-line tweak — Claude classifies this automatically) | no | graph skipped — load overhead exceeds value on typo-sized work |
| `/slashforge:code -quick` (you opted into lean mode) | no | graph skipped — same reason |

**Keeping the graph fresh.** Two ways:

- **Proactive:** run `graphify watch .` in a separate terminal tab — the graph updates incrementally as files change. Free, continuous, recommended.
- **Reactive (safety net):** the kit's auto-freshness check above catches stale graphs at the start of any graph-consulting command and offers to refresh. Bounds your staleness window to 7 days / 50 commits if you forget watch.

**Upstream notes.** Graphify is pre-1.0 (v0.5.0 as of 2026-04-23). If install commands change upstream, re-run `npx slashforge` to pull updated guide content. The PyPI package is named `graphifyy` (double-y) — other `graphify*` packages are unaffiliated.

---

## Auto-coverage check (`.claude/` + `CLAUDE.md`)

When `/slashforge:code` runs on a non-trivial feature, the kit checks whether the feature introduces a new domain (framework, layer, language, pattern) that `.claude/` doesn't yet cover. If gaps exist — no specialist agent, no scoped rule, no mention in `CLAUDE.md`'s tech stack — the check fires twice:

1. **Phase 2 (proactive)** — before the plan is written, the kit asks: *"This feature introduces [domain X]. `.claude/` is missing [agent / rule / CLAUDE.md update]. Add these to the plan as Phase 2.5 updates so they ship in this PR? (y/n)"* If you accept, the new `.claude/` files are drafted in Phase 5 alongside the feature code.
2. **Phase 7 (safety net)** — the `code-reviewer` agent re-checks the diff. If gaps remain (you said no at Phase 2, or a new gap surfaced during implementation), it raises a review **note** suggesting an addition before merge or as a follow-up `/slashforge:setup` run. Note, not a block — the PR can still merge.

**Auto-skipped on:**
- `/slashforge:code -quick` (lean mode — small changes don't introduce new domains by definition)
- `/slashforge:code` trivial auto-detect (typos, single-line tweaks)
- `/slashforge:investigate` (read-only, no code changes)

**Cost:** ~100–300 tokens per run when no gaps detected; ~300–600 when gaps surface and you decline; ~3–8k extra when you accept and new files are generated as part of the feature. See `forge-coverage.md` for the detection matrix and heuristic.

**Why it matters:** without this, every new domain silently widens the gap between what's in the repo and what `.claude/` knows about. Specialist agents stay generic, rules don't enforce domain conventions, `CLAUDE.md` drifts from reality. Coverage check closes the loop incrementally instead of relying on the user to remember to re-run `/slashforge:setup`.

---

## Usage

Once installed, open Claude Code in any repo.

**One-time repo setup:**
```
/slashforge:setup
```
Detects whether the repo is fresh or already has a setup, and acts accordingly.

**Day-to-day development:**

```
/slashforge:code
```
Freeform workflow. Starts with *"What do you want to build, fix, or change?"* and walks through ten phases, pausing at four gates where it stops and waits for you.

| # | Phase | What happens |
| --- | --- | --- |
| 1 | Intake | Requirements gathering. Auto-classifies trivial vs full; brainstorming runs here on the full path |
| 2 | Plan | A structured plan — changes, affected surface, env vars, breaking changes, risks, test strategy |
| 3 | **Confirm** 🛑 | *"Proceed with this plan?"* Nothing is implemented until you say so |
| 4 | **Branch** 🛑 | Current branch or a new one, and from what base. Refuses to work on `main` without an override |
| 5 | Implement | Test-first where the change is testable; root-cause-first when it is a bug |
| 6 | Verify | Lint, tests, build. A failure returns to Phase 5 rather than proceeding |
| 7 | Review | A `code-reviewer` agent pass against the repo's own rules |
| 8 | **Push & PR** 🛑 | Asks for the target branch and reviewers — it does not guess either |
| 9 | PR feedback | Applies reviewer comments, re-verifies, pushes again |
| 10 | **Cleanup** 🛑 | Deletes the branch after you confirm the PR merged |

The gates are the product. Everything between them runs without interruption.

Phase 1 **auto-classifies** the task as trivial or full based on an explicit checklist (≤ 2 files, no new abstraction / dependency / public API, no force-full keywords like `refactor` or `migrate`). Claude announces the decision (*"Treating this as trivial: single-file string change. Say 'full flow' to override."*) and proceeds — trivial tasks skip brainstorming and use a lean plan (Changes + Test strategy only), full tasks run the whole flow. You can override with `full flow` or `quick` in your reply. Phases 3–10 run normally in both paths, so every gate and the Phase 6 verification stay in place.

```
/slashforge:code -quick
```
Lean workflow for small changes where the full `/slashforge:code` ceremony is overkill but you still want safety rails on what leaves your machine. Same ten phases as `/slashforge:code`, with three overrides:

- **Phase 1** — skip brainstorming entirely; go straight to Phase 2 with the user's description as-is
- **Phase 2** — lean plan: **Changes** and **Test strategy** only (other sections included only when they genuinely apply)
- **Phase 7** — replace the `code-reviewer` agent pass with an inline self-review checklist (plan match, no debug leftovers, no hardcoded values, repo conventions, no unintended public-API change)

All four user gates stay (plan confirmation, branch, PR, cleanup). Phase 6 lint/test/build verification stays. Phase 5 runs TDD when the change is testable, straight implementation otherwise. No `systematic-debugging`, no `subagent-driven-development`.

`/slashforge:code -quick` does **not auto-escalate** — if the plan reveals more than 2 files or a new abstraction, it stops and tells you to restart with `/slashforge:code`. Typical footprint: **40–70k tokens** (vs `/slashforge:code`'s 100–250k).

Use for: typos, copy changes, config tweaks, renames, minor refactors touching ≤ 2 files.
Don't use for: bug fixes where the root cause isn't already understood (use `/slashforge:code`), anything multi-file with new abstractions.

```
/slashforge:investigate "users see 500 when uploading >10MB files"
```
Read-only research. No branches, no PRs, no code changes. Produces a findings report (summary, reproduction, root cause, affected scope, suggested next step) written as a self-contained HTML file to `docs/slashforge/investigations/investigation-<timestamp>.html` — outside `.claude/`, so it is visible in Finder rather than buried in a dot-directory.

The report is then **opened in your default browser** (`open` / `xdg-open` / `wslview` / `start`, skipped silently over SSH or on a headless box), and chat gets a short plain-text summary rather than the raw HTML. Styling comes from `forge-report-shell.html`, installed with the guides — each run writes only its body fragment, so every report looks identical and the CSS is never regenerated. The finished file still inlines everything and opens offline.

It ends by handing the report path to the fix command:

```
Investigation complete → docs/slashforge/investigations/investigation-2026-08-02-1432.html
Want me to fix this? Run /slashforge:code investigation-2026-08-02-1432.html
```

The command takes the bare filename — `/slashforge:code` resolves it against `docs/slashforge/investigations/`. Pass it and the fix command reads the report instead of asking you to restate the bug, so the root cause survives into a fresh session. Every gate still applies; the report's suggested fix is a proposal, not an approved plan.

---

```
/slashforge:review-pr              # PRs awaiting your review
/slashforge:review-pr 42           # that PR, whatever your relationship to it
/slashforge:review-pr --assigned   # PRs assigned to you
/slashforge:review-pr --mine       # your own PRs (comment only — GitHub blocks self-approval)
/slashforge:review-pr --all        # all three, grouped
```
Reviews a pull request against **your repo's** standards — `CLAUDE.md`, `.claude/rules/`, and the conventions actually in the surrounding code — then posts line-level comments or an approval.

With no argument it searches `review-requested:@me`, since that is what "waiting on me" means on GitHub; `assignee` is a different relationship and usually empty, so filtering on it would show an empty list. It widens to assignee only if the first search comes back empty, and says so. The flags override that: `--assigned` if your team routes reviews by assigning, `--mine` for self-review, `--all` for everything grouped. Drafts are skipped, a single PR is reviewed without a menu, and no PRs means it says so rather than inventing work.

Before reading the diff it checks CI status, existing review comments so it does not repeat a point already made, and whether the PR is yours — GitHub refuses to let anyone approve their own, so that option is withdrawn when it applies. Past roughly 1,500 changed lines it says a single pass cannot be thorough and states which files it covered.

**Nothing reaches GitHub without your explicit yes.** You get the verdict in chat, the full review opens in your browser, and then the exact text that will be posted — verbatim, because it is public and attributed to you:

```
Post this review?  approve · comment · request-changes · edit · cancel
```

`request-changes` blocks a merge and `comment` does not, so the command never picks between them. It recommends — blocking findings make the suggestion obvious — but blocking someone's PR is your decision.

Line comments and the summary go up as a **single review**, so the PR gets one notification rather than a stream. A line comment can only anchor inside the diff; one outside makes GitHub reject the whole review with a 422, so the command moves those findings into the summary body, tells you which moved, and retries. The review is saved to `docs/slashforge/reviews/<date>-pr-<N>.html` either way.

Requires `gh` installed and authenticated — checked up front, so it stops with instructions rather than failing halfway.

---

## `/slashforge:setup` vs Anthropic's `/init`

Claude Code ships with a built-in `/init` command. The two are complementary, not competitors:

| | `/init` (built-in) | `/slashforge:setup` (this kit) |
|---|---|---|
| Creates | `CLAUDE.md` only (or + skills/hooks with `CLAUDE_CODE_NEW_INIT=1`) | Full `.claude/` — rules, skills, agents, commands, hooks, plus `CLAUDE.md` |
| Approach | Discovers and suggests — opinion-light | Opinionated — enforces multi-agent layout, 200-line cap, global vs specialist split |
| Agents | None | Mandatory: `developer`, `code-reviewer`, `git`, plus specialists |
| Workflow | None | Four commands: `/slashforge:setup` (setup), `/slashforge:code` (full flow, `-quick` for lean), `/slashforge:investigate` (read-only research), `/slashforge:review-pr` (PR review) |
| Monorepo | Single-repo focused | Root + per-app `CLAUDE.md` flow |
| Existing setup | Suggests improvements to `CLAUDE.md` | Full Update flow — reads everything in `.claude/` and fills gaps |

**Use `/init`** for a lightweight starter `CLAUDE.md` on a personal project. **Use `/slashforge:setup`** when the repo needs a disciplined `.claude/` layout, specialist agents, or a defined team workflow. You can also run `/init` first for a starter, then `/slashforge:setup` in Update mode to enrich it.

---

## Customization

Everything the workflow enforces comes from files in your repo, so changing the behaviour means editing those rather than configuring SlashForge.

**Verification commands** live in `CLAUDE.md`. Phase 6 runs exactly what you put here:

```markdown
## Commands
- Lint:      npm run lint
- Typecheck: npx tsc --noEmit
- Test:      npm test
- Build:     npm run build
```

If a command is missing, Phase 6 asks for it rather than guessing or skipping.

**Coding standards** live in `.claude/rules/`. One file per concern. A rule with no `paths` field loads at session start; add one and it loads only when a matching file is touched, which keeps frontend rules out of backend work:

```yaml
---
paths:
  - "src/api/**/*.ts"
---
```

Both `/slashforge:code` Phase 7 and `/slashforge:review-pr` judge against these.

**Agents** live in `.claude/agents/`. `/slashforge:setup` generates a set matched to the codebase; edit them, or add your own for a concern the generated set missed.

All of it is generated by `/slashforge:setup` and then yours. Every generated file carries a `generated_by` marker — edit or remove it and that file is never refreshed again, so your changes survive a re-run.

---

## Monorepo support

`/slashforge:setup` handles monorepos — it creates a root `CLAUDE.md` with shared global agents, and a separate `CLAUDE.md` with app-specific rules, skills, and agents for each app.

---

## Updating

Re-run the install command to update your guide files to the latest version:

```bash
npx slashforge
# → "slashforge is already installed. Update to v3.0.x? (y/n)"
```

Both `npx slashforge` and `npx slashforge status` check npm afterwards and say so if a newer release exists:

```
⚠  This is v4.4.1. The current release is v4.4.2.
   `npx slashforge` runs a global install if you have one, and never checks npm:
     npm uninstall -g slashforge     # then re-run npx, or
     npm install -g slashforge@latest
```

That last line is the one worth knowing: **`npx` prefers an executable already on your `PATH`**, so if you have ever run `npm install -g slashforge`, `npx slashforge` runs that copy and never contacts the registry. It can install an old release indefinitely while reporting success.

The check has a 1.5 second timeout and fails silently — offline installs are unaffected. It is skipped under `CI`, and `SLASHFORGE_NO_UPDATE_CHECK=1` turns it off.

**Safe re-runs of `/slashforge:setup`.** Every file `/slashforge:setup` creates in a repo's `.claude/` and the root `CLAUDE.md` now carries a `generated_by` marker (YAML frontmatter for `.claude/` files, an HTML comment for `CLAUDE.md`). On re-run, the Update flow uses the marker to tell kit-generated files from files you've edited:

- Marker present, version current → safe to refresh
- Marker present, version older → stale; proposes a refresh and asks before overwriting
- Marker missing or edited → treated as user-owned; edits to fill gaps only, never overwritten

Remove or edit the marker on any file you want the kit to leave alone.

---

## Support

Start with [Troubleshooting](https://www.rajdeepratan.com/slashforge/reference/troubleshooting/) — it covers the handful of things that actually go wrong, and the first one accounts for most of them.

| | |
| --- | --- |
| **Bug or feature request** | [Open an issue](https://github.com/rajdeepratan/SlashForge/issues/new/choose). Include the output of `npx slashforge status` — it is the single most useful thing you can attach |
| **Anything else** | [slashforge@rajdeepratan.com](mailto:slashforge@rajdeepratan.com) |

---

## Author

<img src="assets/png/rajdeepratan.png" width="72" alt="Rajdeep Ratan">

**Rajdeep Ratan** — [GitHub](https://github.com/rajdeepratan) · [npm](https://www.npmjs.com/~rajdeepratan)

---

## License

[MIT](LICENSE) © Rajdeep Ratan
