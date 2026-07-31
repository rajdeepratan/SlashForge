---
name: /forge:setup
description: One-time repo setup — explore the codebase, ask clarifying questions, and create CLAUDE.md plus tailored rules, skills, agents, commands, and hooks in .claude/. Handles both fresh repos and partial setups.
preflight: superpowers
---

**Preflight:** before reading anything else, open `{{INSTALL_PATH}}/forge-preflight.md` and run the **Superpowers Check**.

Then read all of the following files in full — together they are your complete guide:

- {{INSTALL_PATH}}/forge-instructions.md
- {{INSTALL_PATH}}/forge-graph.md
- {{INSTALL_PATH}}/forge-workflow.md
- {{INSTALL_PATH}}/forge-workflow-investigation.md
- {{INSTALL_PATH}}/forge-workflow-agents.md
- {{INSTALL_PATH}}/forge-rules.md
- {{INSTALL_PATH}}/forge-skills.md
- {{INSTALL_PATH}}/forge-agents.md
- {{INSTALL_PATH}}/forge-commands.md
- {{INSTALL_PATH}}/forge-hooks.md
- {{INSTALL_PATH}}/forge-claude-md.md
- {{INSTALL_PATH}}/forge-memory.md

Also read `{{INSTALL_PATH}}/meta.json` — it contains the kit's `version`, `package`, and `installed_at`. You will stamp these into every file you create or refresh as a `generated_by` / `generated_at` marker (see § Generated File Markers in `forge-instructions.md` for the exact format).

**Running kit:** `{{KIT_PACKAGE}}@{{KIT_VERSION}}` — this is what installed the slash command you just ran. If `meta.json` disagrees with this, use `meta.json` (it's the source of truth for what's actually on disk in the guides directory).

Do not skip steps. Do not write any file before finishing the clarifying questions step.

**Before anything else — detect the current state:**
Check whether `.claude/` and `CLAUDE.md` already exist in the repo.

- If they **do not exist** → follow the **Fresh Setup** flow below
- If they **already exist** → follow the **Update Existing Setup** flow below

---

**Fresh Setup — single-app repo:**

Run in five phases. **Collect every user decision in Phase 1**, then run the rest without interrupting the user. The Superpowers gate already ran in preflight — confirm it was resolved there; if for any reason it was not, resolve it now before continuing. Do not write any file until Phase 3.

*Phase 1 — Decide (explore + gather all consent; write nothing yet):*
1. Explore the repo — tech stack, folder structure, key abstractions, build/test/lint commands
2. **Graphify offer — decision only.** Apply the language-fit gate from `{{INSTALL_PATH}}/forge-graph.md`: skip silently if under the 70% threshold. Otherwise present the **Offer** half of the matching branch (Branch A if the CLI is not on `PATH`, Branch B if it is but this repo has no `graphify-out/graph.json`) — show the "Why it matters" block and the exact commands, then ask y/n. **Do not run anything yet.** Just capture the decision. Branch C (graph already present) cannot occur in a fresh repo.
3. Ask the user any remaining clarifying questions

*Phase 2 — Provision (run approved installs; touches nothing in `.claude/` or `CLAUDE.md`):*
4. If Graphify was approved in step 2, run only its **Provision** half from `{{INSTALL_PATH}}/forge-graph.md` — the CLI install (Branch A) and `graphify .` indexing. **Stop before `graphify claude install`** — that step appends to `CLAUDE.md` and must wait for Phase 4.

*Phase 3 — Generate kit files:*
5. Create rule files → `.claude/rules/`
6. Create skill files → `.claude/skills/`
7. Create agent files → `.claude/agents/` — always more than one coding agent
8. Create command files → `.claude/commands/` if needed
9. Create `CLAUDE.md` in the repo root last

*Phase 4 — Graphify hook-in (the only Graphify step that appends to `CLAUDE.md` / `settings.json`; must run last):*
10. If Graphify was provisioned in Phase 2, run its **Hook-in** half from `{{INSTALL_PATH}}/forge-graph.md` — `graphify claude install` + SUMMARY.html synthesis. Running it after step 9 keeps the kit's `CLAUDE.md` write before Graphify's append, so Graphify's section survives and is treated as user-owned.

*Phase 5 — Verify:*
11. Run the verify step

**Fresh Setup — monorepo:**

Same five-phase shape as single-app — all decisions in Phase 1, Graphify offered **once at the root** (not per-app).

*Phase 1 — Decide (write nothing yet):*
1. Explore the repo — understand all apps, shared code, and root structure
2. **Graphify offer — decision only, once at the root.** Apply the language-fit gate to the full repo's non-trivial source. Present the **Offer** half of the matching branch from `{{INSTALL_PATH}}/forge-graph.md` (branching on whether the CLI is on `PATH` and whether `graphify-out/graph.json` exists at the repo root) and capture y/n. Do not run anything yet.
3. Ask the user any remaining clarifying questions (including which apps need setup)

*Phase 2 — Provision:*
4. If Graphify was approved, run its **Provision** half once at the root — CLI install (if needed) + `graphify .`. Stop before `graphify claude install`.

*Phase 3 — Generate kit files:*
5. At root: create shared rules, global agents (`git`, `code-reviewer`), and root `CLAUDE.md`
6. For each app: create app-specific rules, skills, specialist agents, and per-app `CLAUDE.md`
7. Create commands at root or per-app level as appropriate

*Phase 4 — Graphify hook-in:*
8. If Graphify was provisioned, run its **Hook-in** half once at the root — `graphify claude install` + SUMMARY.html — AFTER all root and per-app `CLAUDE.md` files are written.

*Phase 5 — Verify:*
9. Run the verify step for root and each app

**Update Existing Setup:**

Same five-phase shape — decisions first, file writes in the middle, Graphify's `CLAUDE.md` append (if any) last.

*Phase 1 — Decide (read + explore + gather consent; change nothing yet):*
1. Read every existing file in `.claude/` and `CLAUDE.md` in full before touching anything
2. For each file, inspect its `generated_by` marker (YAML frontmatter for `.claude/` files, HTML comment at the top for `CLAUDE.md`):
   - **Marker present, version matches current kit** → safe to refresh the generated content
   - **Marker present, version older than current kit** → kit-generated but stale; propose a refresh and ask the user before overwriting
   - **Marker missing or edited** → user-owned; edit to fill gaps only, never overwrite
3. Explore the repo to understand what has changed since the setup was created
4. Identify gaps — missing agents, outdated rules, incomplete CLAUDE.md sections
5. **Graphify offer / freshness — decision only.** Follow `{{INSTALL_PATH}}/forge-graph.md`: skip silently if under the 70% language-fit threshold. Otherwise the guide branches automatically — **Branch A** (CLI not on `PATH`) offers full install; **Branch B** (CLI on `PATH`, no graph in this repo) offers index-only; **Branch C** (CLI on `PATH`, graph exists) runs the freshness check and offers a re-index if stale. Present only the **Offer** half here and capture y/n. Branches A and B re-fire on every Update run for users who declined previously.
6. Ask the user any remaining clarifying questions before making changes

*Phase 2 — Provision:*
7. If Graphify was approved in step 5, run its **Provision** half — CLI install (Branch A) + `graphify .`, or the re-index (Branch C stale). Stop before `graphify claude install`.

*Phase 3 — Generate kit files:*
8. Do not overwrite user-owned files wholesale — edit to fill gaps and preserve what is correct
9. Every file you create or refresh gets a fresh marker using the current kit version and timestamp from `meta.json`
10. Update `CLAUDE.md` Project References table to reflect actual state of `.claude/`

*Phase 4 — Graphify hook-in:*
11. If a **first-time** install was provisioned in Phase 2 (Branch A or B), run its **Hook-in** half last — `graphify claude install` + SUMMARY.html — after the `CLAUDE.md` edits in step 10. Branch C re-index needs no hook-in (the section already exists); just re-synthesise SUMMARY.html per the guide.

*Phase 5 — Verify:*
12. Run the verify step
