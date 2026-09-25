---
<!--target:claude-->
name: Claude Setup — .claude/ Coverage Check
description: Detection logic for new domains not covered by .claude/ + CLAUDE.md. Fires at Phase 2 (proactive) and inside the code-reviewer agent at Phase 7 (safety net). Suggests creating agents/rules/skills/CLAUDE.md updates so .claude/ grows alongside the codebase. Auto-skipped on /slashforge-code -quick, /slashforge-code trivial, and /slashforge-investigate.
<!--/target-->
<!--target:cursor-->
name: Agent Setup — Coverage Check
description: Detection logic for new domains not covered by .cursor/ + AGENTS.md. Fires at Phase 2 (proactive) and inside the code-reviewer subagent at Phase 7 (safety net). Suggests creating subagents/rules/skills/AGENTS.md updates so setup grows alongside the codebase. Auto-skipped on /slashforge-code -quick, /slashforge-code trivial, and /slashforge-investigate.
<!--/target-->
<!--target:codex-->
name: Agent Setup — Coverage Check
description: Detection logic for new domains not covered by AGENTS.md + .codex/agents/. Fires at Phase 2 (proactive) and inside the code-reviewer subagent at Phase 7 (safety net). Suggests creating subagents/rules/skills/AGENTS.md updates so setup grows alongside the codebase. Auto-skipped on /slashforge-code -quick, /slashforge-code trivial, and /slashforge-investigate.
<!--/target-->
---

<!--target:claude-->
# .claude/ Coverage Check

When a feature introduces a new domain — a new framework, layer, language, or pattern the repo hasn't had before — the kit's `.claude/` infrastructure won't grow to cover it unless someone re-runs `/slashforge-setup`. This check catches the gap during normal development so the user can either add coverage now or defer it explicitly.
<!--/target-->
<!--target:cursor-->
# Setup Coverage Check

When a feature introduces a new domain — a new framework, layer, language, or pattern the repo hasn't had before — the kit's `.cursor/` infrastructure won't grow to cover it unless someone re-runs setup. This check catches the gap during normal development so the user can either add coverage now or defer it explicitly.
<!--/target-->
<!--target:codex-->
# Setup Coverage Check

When a feature introduces a new domain — a new framework, layer, language, or pattern the repo hasn't had before — the repo's `AGENTS.md` files and subagents won't grow to cover it unless someone re-runs setup. This check catches the gap during normal development so the user can either add coverage now or defer it explicitly.
<!--/target-->

## When it fires

- **Phase 2 of `/slashforge-code`** — proactive, before the plan is written
- **Phase 7 (inside the `code-reviewer` agent)** — reactive safety net, on the diff
- **Auto-skipped on:** `/slashforge-code -quick`, `/slashforge-code` trivial auto-detect, `/slashforge-investigate` (read-only research, doesn't modify code)

## What "coverage" means — the matrix

For each kit-managed surface, compare the new feature against the existing state:

| Surface | Detection signal |
|---|---|
<!--target:claude-->
| `.claude/agents/` | Plan or diff names a domain not covered by an existing agent's `name` or `description` |
| `.claude/rules/` | New files in a directory not covered by an existing rule's `path` scope |
| `.claude/skills/` | Plan describes a recurring task pattern with no matching skill |
| `.claude/settings.json` hooks | New file extensions or patterns introduced |
| `CLAUDE.md` tech stack | Plan adds a dependency / framework not in the listed stack |
| `CLAUDE.md` Project References | New `.claude/` file proposed but not yet indexed |
| `CLAUDE.md` architecture | New top-level module / app / layer introduced |
<!--/target-->
<!--target:cursor-->
| `.cursor/agents/` | Plan or diff names a domain not covered by an existing subagent's `name` or `description` |
| `.cursor/rules/` | New files in a directory not covered by an existing rule's `globs` scope |
| `.cursor/skills/` | Plan describes a recurring task pattern with no matching skill |
| `.cursor/hooks.json` | New file extensions or patterns introduced |
| `AGENTS.md` tech stack | Plan adds a dependency / framework not in the listed stack |
| `AGENTS.md` Project References | New rule or skill proposed but not yet indexed |
| `AGENTS.md` architecture | New top-level module / app / layer introduced |
<!--/target-->
<!--target:codex-->
| `.codex/agents/` | Plan or diff names a domain not covered by an existing subagent's `name` or `description` |
| nested `AGENTS.md` | New files in a directory with no `AGENTS.md` governing it |
| `.agents/skills/` | Plan describes a recurring task pattern with no matching skill |
| `.codex/hooks.json` | New file extensions or patterns introduced |
| root `AGENTS.md` tech stack | Plan adds a dependency / framework not in the listed stack |
| root `AGENTS.md` Project References | New rule or skill proposed but not yet indexed |
| root `AGENTS.md` architecture | New top-level module / app / layer introduced |
<!--/target-->

<!--target:claude-->
`.claude/commands/*` is **not** in this matrix — commands are setup-time, not feature-driven.
<!--/target-->
<!--target:cursor-->
Commands are **not** in this matrix — they are setup-time, not feature-driven.
<!--/target-->
<!--target:codex-->
Commands are **not** in this matrix — they are setup-time, not feature-driven.
<!--/target-->

## Heuristic — what counts as "new domain"

Conservative on purpose. False positives (the kit yelling about coverage that's not really needed) are more expensive than false negatives because they erode trust in the check.

**Definite trigger** (any one is enough):

- Plan or diff introduces a new dependency in `package.json` / `requirements.txt` / `go.mod` / equivalent
- Plan or diff adds files in a top-level directory the repo doesn't currently have
<!--target:claude-->
- Plan names a framework or tech (e.g. "GraphQL", "Redis", "Stripe", "AWS Lambda") not in `CLAUDE.md`'s tech stack section
<!--/target-->
<!--target:cursor-->
- Plan names a framework or tech (e.g. "GraphQL", "Redis", "Stripe", "AWS Lambda") not in the entry file's tech stack section
<!--/target-->
<!--target:codex-->
- Plan names a framework or tech (e.g. "GraphQL", "Redis", "Stripe", "AWS Lambda") not in the entry file's tech stack section
<!--/target-->
- Diff introduces files with extensions not seen elsewhere in the repo

**Soft signal** (multiple needed before triggering):

- Plan mentions a layer/pattern (e.g. "WebSocket", "Auth", "Job queue") not visible in any agent or rule description
- Diff adds 5+ files in a sub-directory not covered by any rule's path scope

If none of the above hits, no coverage gap exists for this feature — the check passes silently.

## Phase 2 — proactive output

If gaps detected, present BEFORE writing the plan:

<!--target:claude-->
> *"Coverage check — this feature introduces [domain X]. `.claude/` is missing:*
<!--/target-->
<!--target:cursor-->
> *"Coverage check — this feature introduces [domain X]. The repo's agent setup is missing:*
<!--/target-->
<!--target:codex-->
> *"Coverage check — this feature introduces [domain X]. The repo's agent setup is missing:*
<!--/target-->
> - *agent for X (no specialist agent has `description` matching X)*
> - *rule for X (no rule with path scope covering [path])*
<!--target:claude-->
> - *X not in `CLAUDE.md`'s tech stack list*
<!--/target-->
<!--target:cursor-->
> - *X not in the entry file's tech stack list*
<!--/target-->
<!--target:codex-->
> - *X not in the entry file's tech stack list*
<!--/target-->
>
<!--target:claude-->
> *Add these to the plan as Phase 2.5 `.claude/` updates so they ship in this PR? (y/n)"*
<!--/target-->
<!--target:cursor-->
> *Add these to the plan as Phase 2.5 setup updates so they ship in this PR? (y/n)"*
<!--/target-->
<!--target:codex-->
> *Add these to the plan as Phase 2.5 setup updates so they ship in this PR? (y/n)"*
<!--/target-->

<!--target:claude-->
- **On yes:** plan grows a section "Phase 2.5 — `.claude/` updates" listing each file. Those updates are implemented in Phase 5 alongside the feature code, using the templates in `slashforge-agents.md`, `slashforge-rules.md`, etc. All new files get `generated_by` markers.
<!--/target-->
<!--target:cursor-->
- **On yes:** plan grows a section "Phase 2.5 — setup updates" listing each file. Those updates are implemented in Phase 5 alongside the feature code, using the templates in the setup guides. All new files get `generated_by` markers.
<!--/target-->
<!--target:codex-->
- **On yes:** plan grows a section "Phase 2.5 — setup updates" listing each file. Those updates are implemented in Phase 5 alongside the feature code, using the templates in the setup guides. All new files get `generated_by` markers.
<!--/target-->
- **On no:** proceed without coverage. Phase 7's safety-net check will still surface the gap as a review note.

## Phase 7 — safety-net output

The `code-reviewer` agent inspects the implemented diff for the same gaps. If gaps remain (because the user said no at Phase 2, or a new gap surfaced during implementation), the review report includes:

<!--target:claude-->
> *"**Coverage gap:** PR introduces [domain X] but `.claude/` doesn't cover it. Suggest adding [agent X / rule X / CLAUDE.md update] either before merge (extend this PR) or as a follow-up `/slashforge-setup` run."*
<!--/target-->
<!--target:cursor-->
> *"**Coverage gap:** PR introduces [domain X] but the repo's agent setup doesn't cover it. Suggest adding [agent X / rule X / entry-file update] either before merge (extend this PR) or as a follow-up setup run."*
<!--/target-->
<!--target:codex-->
> *"**Coverage gap:** PR introduces [domain X] but the repo's agent setup doesn't cover it. Suggest adding [agent X / rule X / entry-file update] either before merge (extend this PR) or as a follow-up setup run."*
<!--/target-->

This is a **note, not a block.** The PR can still merge with the gap; the user is informed.

## What this is NOT

- **Not a replacement for `/slashforge-setup`.** Coverage check is feature-scoped — it adds what THIS feature needs. `/slashforge-setup` re-explores the whole repo.
- **Not a hard gate.** The Phase 7 note doesn't block the PR.
<!--target:claude-->
- **Not auto-applied.** Always asks before creating new `.claude/` files. Capability ≠ consent (same principle as Graphify install).
<!--/target-->
<!--target:cursor-->
- **Not auto-applied.** Always asks before creating new setup files. Capability ≠ consent (same principle as Graphify install).
<!--/target-->
<!--target:codex-->
- **Not auto-applied.** Always asks before creating new setup files. Capability ≠ consent (same principle as Graphify install).
<!--/target-->
- **Not for `/slashforge-code -quick` / `/slashforge-investigate` / `/slashforge-code` trivial.** Lean and read-only paths skip this entirely.

## Token cost summary

| State | Tokens added per command |
|---|---|
| `/slashforge-code -quick`, `/slashforge-code` trivial, `/slashforge-investigate` | 0 (skipped) |
| Coverage gaps not detected | ~100–300 (matrix scan + Phase 2 result) |
| Coverage gaps detected, user declines | ~300–600 (matrix scan + warning + y/n) |
| Coverage gaps detected, user accepts | ~300–600 + ~3–8k for new file generation in Phase 5 |
| Phase 7 safety-net detection | ~100–300 (inside the existing `code-reviewer` agent pass) |

Steady state on a feature that doesn't introduce new domains: ~100–300 tokens. Well within `/slashforge-code` full-flow's 100–250k budget.
