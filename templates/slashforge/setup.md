---
name: /slashforge-setup
<!--target:claude-->
description: One-time repo setup — explore the codebase, ask clarifying questions, and create CLAUDE.md plus tailored rules, skills, agents, commands, and hooks in .claude/. Handles both fresh repos and partial setups.
<!--/target-->
<!--target:cursor-->
description: One-time repo setup — explore the codebase, ask clarifying questions, and create AGENTS.md plus tailored rules, skills, subagents, commands, and hooks in .cursor/. Handles both fresh repos and partial setups.
<!--/target-->
<!--target:codex-->
description: One-time repo setup — explore the codebase, ask clarifying questions, and create AGENTS.md plus nested rule files, skills in .agents/skills/, and subagents in .codex/agents/. Handles both fresh repos and partial setups.
<!--/target-->
---

Then read all of the following files in full — together they are your complete guide:

- {{INSTALL_PATH}}/forge-instructions.md
- {{INSTALL_PATH}}/forge-graph.md
- {{INSTALL_PATH}}/forge-workflow.md
- {{INSTALL_PATH}}/forge-workflow-investigation.md
- {{INSTALL_PATH}}/forge-workflow-agents.md
- {{INSTALL_PATH}}/forge-rules.md
- {{INSTALL_PATH}}/forge-skills.md
<!--target:claude-->
- {{INSTALL_PATH}}/forge-agents.md
- {{INSTALL_PATH}}/forge-commands.md
- {{INSTALL_PATH}}/forge-hooks.md
- {{INSTALL_PATH}}/forge-claude-md.md
- {{INSTALL_PATH}}/forge-memory.md
<!--/target-->
<!--target:cursor-->
- {{INSTALL_PATH}}/forge-agents.md
- {{INSTALL_PATH}}/forge-commands.md
- {{INSTALL_PATH}}/forge-hooks.md
- {{INSTALL_PATH}}/forge-agents-md.md
<!--/target-->
<!--target:codex-->
- {{INSTALL_PATH}}/forge-agents-codex.md
- {{INSTALL_PATH}}/forge-commands.md
- {{INSTALL_PATH}}/forge-hooks.md
- {{INSTALL_PATH}}/forge-agents-md.md
<!--/target-->

Also read `{{INSTALL_PATH}}/meta.json` — it contains the kit's `version`, `package`, and `installed_at`. You will stamp these into every file you create or refresh as a `generated_by` / `generated_at` marker (see § Generated File Markers in `forge-instructions.md` for the exact format).

**Running kit:** `{{KIT_PACKAGE}}@{{KIT_VERSION}}` — this is what installed the slash command you just ran. If `meta.json` disagrees with this, use `meta.json` (it's the source of truth for what's actually on disk in the guides directory).

Do not skip steps. Do not write any file before finishing the clarifying questions step.

**Before anything else — detect the current state:**
<!--target:claude-->
Check whether `.claude/` and `CLAUDE.md` already exist in the repo.
<!--/target-->
<!--target:cursor-->
Check whether `.cursor/` and `AGENTS.md` already exist in the repo.

If a `CLAUDE.md` exists, it came from a Claude Code setup and is not yours to
rewrite. Add it to the Phase 1 clarifying questions — collapse it to a one-line
`@AGENTS.md` import, leave it untouched, or mirror the content into both — and do
nothing to it without an answer.
<!--/target-->
<!--target:codex-->
Check whether `.codex/` and `AGENTS.md` already exist in the repo.

If a `CLAUDE.md` exists, it came from a Claude Code setup and is not yours to
rewrite. Add it to the Phase 1 clarifying questions — collapse it to a one-line
`@AGENTS.md` import, leave it untouched, or mirror the content into both — and do
nothing to it without an answer.
<!--/target-->

- If they **do not exist** → follow the **Fresh Setup** flow below
- If they **already exist** → follow the **Update Existing Setup** flow below

---

**Fresh Setup — single-app repo:**

Run in five phases. **Collect every user decision in Phase 1**, then run the rest without interrupting the user. Do not write any file until Phase 3.


*Phase 1 — Decide (explore + gather all consent; write nothing yet):*
1. Explore the repo — tech stack, folder structure, key abstractions, build/test/lint commands
2. **Graphify offer — decision only.** Apply the language-fit gate from `{{INSTALL_PATH}}/forge-graph.md`: skip silently if under the 70% threshold. Otherwise present the **Offer** half of the matching branch (Branch A if the CLI is not on `PATH`, Branch B if it is but this repo has no `graphify-out/graph.json`) — show the "Why it matters" block and the exact commands, then ask y/n. **Do not run anything yet.** Just capture the decision. Branch C (graph already present) cannot occur in a fresh repo.
3. Ask the user any remaining clarifying questions

<!--target:claude-->
*Phase 2 — Provision (run approved installs; touches nothing in `.claude/` or `CLAUDE.md`):*
4. If Graphify was approved in step 2, run only its **Provision** half from `{{INSTALL_PATH}}/forge-graph.md` — the CLI install (Branch A) and `graphify .` indexing. **Stop before `graphify claude install`** — that step appends to `CLAUDE.md` and must wait for Phase 4.
<!--/target-->
<!--target:cursor-->
*Phase 2 — Provision (run approved installs; touches nothing in `.cursor/` or `AGENTS.md`):*
4. If Graphify was approved in step 2, run only its **Provision** half from `{{INSTALL_PATH}}/forge-graph.md` — the CLI install (Branch A) and `graphify .` indexing. **Stop before the hook-in command** — that step writes into files this setup manages and must wait for Phase 4.
<!--/target-->
<!--target:codex-->
*Phase 2 — Provision (run approved installs; touches nothing in `.codex/` or `AGENTS.md`):*
4. If Graphify was approved in step 2, run only its **Provision** half from `{{INSTALL_PATH}}/forge-graph.md` — the CLI install (Branch A) and `graphify .` indexing. **Stop before the hook-in command** — that step writes into files this setup manages and must wait for Phase 4.
<!--/target-->

<!--target:claude-->
*Phase 3 — Generate kit files:*
5. Create rule files → `.claude/rules/`
6. Create skill files → `.claude/skills/`
7. Create agent files → `.claude/agents/` — always more than one coding agent
8. Create command files → `.claude/commands/` if needed
9. Create `CLAUDE.md` in the repo root last
<!--/target-->
<!--target:cursor-->
*Phase 3 — Generate kit files:*
5. Create rule files → `.cursor/rules/*.mdc` — the `.mdc` extension and its frontmatter are required; a plain `.md` there is ignored
6. Create skill files → `.cursor/skills/<name>/SKILL.md`
7. Create subagent files → `.cursor/agents/*.md` — always more than one coding agent
8. Create command files → `.cursor/commands/` if needed
9. Create `AGENTS.md` in the repo root last
<!--/target-->
<!--target:codex-->
*Phase 3 — Generate kit files:*
5. Encode rules as nested `AGENTS.md` files at the directories they govern — Codex has no rules directory
6. Create skill files → `.agents/skills/<name>/SKILL.md`
7. Create subagent files → `.codex/agents/*.toml` — always more than one coding agent
8. Do not create commands — custom prompts are deprecated; express each as a skill instead
9. Create the root `AGENTS.md` last
<!--/target-->

<!--target:claude-->
*Phase 4 — Graphify hook-in (the only Graphify step that appends to `CLAUDE.md` / `settings.json`; must run last):*
10. If Graphify was provisioned in Phase 2, run its **Hook-in** half from `{{INSTALL_PATH}}/forge-graph.md` — `graphify claude install` + SUMMARY.html synthesis. Running it after step 9 keeps the kit's `CLAUDE.md` write before Graphify's append, so Graphify's section survives and is treated as user-owned.

*Phase 5 — Verify:*
11. Run the verify step
<!--/target-->
<!--target:cursor-->
*Phase 4 — Graphify hook-in (must run last):*
10. If Graphify was provisioned in Phase 2, run its **Hook-in** half from `{{INSTALL_PATH}}/forge-graph.md` — `graphify cursor install` + SUMMARY.html synthesis. It writes `.cursor/rules/graphify.mdc`; running it after step 9 keeps it clear of the kit's own rule generation.

*Phase 5 — Verify:*
11. Run the verify step
<!--/target-->
<!--target:codex-->
*Phase 4 — Graphify hook-in (the only Graphify step that appends to `AGENTS.md` / `hooks.json`; must run last):*
10. If Graphify was provisioned in Phase 2, run its **Hook-in** half from `{{INSTALL_PATH}}/forge-graph.md` — `graphify codex install` + SUMMARY.html synthesis. Running it after step 9 keeps the kit's `AGENTS.md` write before Graphify's append, so Graphify's section survives and is treated as user-owned.

*Phase 5 — Verify:*
11. Run the verify step
<!--/target-->

**Fresh Setup — monorepo:**

Same five-phase shape as single-app — all decisions in Phase 1, Graphify offered **once at the root** (not per-app).


*Phase 1 — Decide (write nothing yet):*
1. Explore the repo — understand all apps, shared code, and root structure
2. **Graphify offer — decision only, once at the root.** Apply the language-fit gate to the full repo's non-trivial source. Present the **Offer** half of the matching branch from `{{INSTALL_PATH}}/forge-graph.md` (branching on whether the CLI is on `PATH` and whether `graphify-out/graph.json` exists at the repo root) and capture y/n. Do not run anything yet.
3. Ask the user any remaining clarifying questions (including which apps need setup)

*Phase 2 — Provision:*
<!--target:claude-->
4. If Graphify was approved, run its **Provision** half once at the root — CLI install (if needed) + `graphify .`. Stop before `graphify claude install`.
<!--/target-->
<!--target:cursor-->
4. If Graphify was approved, run its **Provision** half once at the root — CLI install (if needed) + `graphify .`. Stop before the hook-in command.
<!--/target-->
<!--target:codex-->
4. If Graphify was approved, run its **Provision** half once at the root — CLI install (if needed) + `graphify .`. Stop before the hook-in command.
<!--/target-->

<!--target:claude-->
*Phase 3 — Generate kit files:*
5. At root: create shared rules, global agents (`git`, `code-reviewer`), and root `CLAUDE.md`
6. For each app: create app-specific rules, skills, specialist agents, and per-app `CLAUDE.md`
7. Create commands at root or per-app level as appropriate
<!--/target-->
<!--target:cursor-->
*Phase 3 — Generate kit files:*
5. At root: create shared rules (`.cursor/rules/*.mdc`), global subagents (`git`, `code-reviewer`) in `.cursor/agents/`, and the root `AGENTS.md`
6. For each app: create app-specific rules, skills, specialist subagents, and a per-app `AGENTS.md`
7. Create commands at root or per-app level as appropriate
<!--/target-->
<!--target:codex-->
*Phase 3 — Generate kit files:*
5. At root: create the root `AGENTS.md` with repo-wide rules, and global subagents (`git`, `code-reviewer`) in `.codex/agents/*.toml`
6. For each app: create a nested `AGENTS.md` carrying that app's rules, plus its skills under `.agents/skills/`. Keep every subagent at the root — Codex resolves `.codex/` from the project root, so per-app subagent directories are not read
7. Do not create commands — express each as a skill instead
<!--/target-->

<!--target:claude-->
*Phase 4 — Graphify hook-in:*
8. If Graphify was provisioned, run its **Hook-in** half once at the root — `graphify claude install` + SUMMARY.html — AFTER all root and per-app `CLAUDE.md` files are written.

*Phase 5 — Verify:*
9. Run the verify step for root and each app
<!--/target-->
<!--target:cursor-->
*Phase 4 — Graphify hook-in:*
8. If Graphify was provisioned, run its **Hook-in** half once at the root — `graphify cursor install` + SUMMARY.html — AFTER all root and per-app `AGENTS.md` files are written.

*Phase 5 — Verify:*
9. Run the verify step for root and each app
<!--/target-->
<!--target:codex-->
*Phase 4 — Graphify hook-in:*
8. If Graphify was provisioned, run its **Hook-in** half once at the root — `graphify codex install` + SUMMARY.html — AFTER all root and per-app `AGENTS.md` files are written.

*Phase 5 — Verify:*
9. Run the verify step for root and each app
<!--/target-->

**Update Existing Setup:**

Same five-phase shape — decisions first, file writes in the middle, Graphify's hook-in (if any) last.


*Phase 1 — Decide (read + explore + gather consent; change nothing yet):*
<!--target:claude-->
1. Read every existing file in `.claude/` and `CLAUDE.md` in full before touching anything
<!--/target-->
<!--target:cursor-->
1. Read every existing file in `.cursor/` and every `AGENTS.md` in full before touching anything
<!--/target-->
<!--target:codex-->
1. Read every `AGENTS.md` in the repo, plus `.codex/agents/` and `.agents/skills/`, in full before touching anything
<!--/target-->
<!--target:claude-->
2. For each file, inspect its `generated_by` marker (YAML frontmatter for `.claude/` files, HTML comment at the top for `CLAUDE.md`):
<!--/target-->
<!--target:cursor-->
2. For each file, inspect its `generated_by` marker (YAML frontmatter for `.cursor/` files, HTML comment at the top for `AGENTS.md`):
<!--/target-->
<!--target:codex-->
2. For each file, inspect its `generated_by` marker (a TOML key for `.codex/agents/*.toml`, YAML frontmatter for skills, HTML comment at the top for any `AGENTS.md`):
<!--/target-->
   - **Marker present, version matches current kit** → safe to refresh the generated content
   - **Marker present, version older than current kit** → kit-generated but stale; propose a refresh and ask the user before overwriting
   - **Marker missing or edited** → user-owned; edit to fill gaps only, never overwrite
3. Explore the repo to understand what has changed since the setup was created
<!--target:claude-->
4. Identify gaps — missing agents, outdated rules, incomplete CLAUDE.md sections
<!--/target-->
<!--target:cursor-->
4. Identify gaps — missing subagents, outdated rules, incomplete `AGENTS.md` sections
<!--/target-->
<!--target:codex-->
4. Identify gaps — missing subagents, outdated rules, incomplete `AGENTS.md` sections
<!--/target-->
5. **Graphify offer / freshness — decision only.** Follow `{{INSTALL_PATH}}/forge-graph.md`: skip silently if under the 70% language-fit threshold. Otherwise the guide branches automatically — **Branch A** (CLI not on `PATH`) offers full install; **Branch B** (CLI on `PATH`, no graph in this repo) offers index-only; **Branch C** (CLI on `PATH`, graph exists) runs the freshness check and offers a re-index if stale. Present only the **Offer** half here and capture y/n. Branches A and B re-fire on every Update run for users who declined previously.
6. Ask the user any remaining clarifying questions before making changes

*Phase 2 — Provision:*
<!--target:claude-->
7. If Graphify was approved in step 5, run its **Provision** half — CLI install (Branch A) + `graphify .`, or the re-index (Branch C stale). Stop before `graphify claude install`.
<!--/target-->
<!--target:cursor-->
7. If Graphify was approved in step 5, run its **Provision** half — CLI install (Branch A) + `graphify .`, or the re-index (Branch C stale). Stop before the hook-in command.
<!--/target-->
<!--target:codex-->
7. If Graphify was approved in step 5, run its **Provision** half — CLI install (Branch A) + `graphify .`, or the re-index (Branch C stale). Stop before the hook-in command.
<!--/target-->

*Phase 3 — Generate kit files:*
8. Do not overwrite user-owned files wholesale — edit to fill gaps and preserve what is correct
9. Every file you create or refresh gets a fresh marker using the current kit version and timestamp from `meta.json`
<!--target:claude-->
10. Update `CLAUDE.md` Project References table to reflect actual state of `.claude/`
<!--/target-->
<!--target:cursor-->
10. Update the `AGENTS.md` Project References table to reflect the actual state of `.cursor/`
<!--/target-->
<!--target:codex-->
10. Update the root `AGENTS.md` Project References table to reflect the actual nested `AGENTS.md` files, `.codex/agents/` and `.agents/skills/`
<!--/target-->

<!--target:claude-->
*Phase 4 — Graphify hook-in:*
11. If a **first-time** install was provisioned in Phase 2 (Branch A or B), run its **Hook-in** half last — `graphify claude install` + SUMMARY.html — after the `CLAUDE.md` edits in step 10. Branch C re-index needs no hook-in (the section already exists); just re-synthesise SUMMARY.html per the guide.

*Phase 5 — Verify:*
12. Run the verify step
<!--/target-->
<!--target:cursor-->
*Phase 4 — Graphify hook-in:*
11. If a **first-time** install was provisioned in Phase 2 (Branch A or B), run its **Hook-in** half last — `graphify cursor install` + SUMMARY.html — after the edits in step 10. Branch C re-index needs no hook-in (the rule file already exists); just re-synthesise SUMMARY.html per the guide.

*Phase 5 — Verify:*
12. Run the verify step
<!--/target-->
<!--target:codex-->
*Phase 4 — Graphify hook-in:*
11. If a **first-time** install was provisioned in Phase 2 (Branch A or B), run its **Hook-in** half last — `graphify codex install` + SUMMARY.html — after the `AGENTS.md` edits in step 10. Branch C re-index needs no hook-in (the section already exists); just re-synthesise SUMMARY.html per the guide.

*Phase 5 — Verify:*
12. Run the verify step
<!--/target-->
