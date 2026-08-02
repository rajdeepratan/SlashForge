---
name: Claude Development Workflow — Investigation Flow
description: Read-only investigation flow used by /slashforge:investigate — reproduction, root-cause analysis, and findings report
---

# Investigation Flow

Short, research-only flow used by `/slashforge:investigate`. No branching, no PR, no verification phase. Output is a findings report.

This file is loaded by `/slashforge:investigate`.

---

## Phase I1 — Investigation Intake

1. Parse input. Accept:
   - A free-form symptom description
   - A bug report or issue link the user pastes
   - Nothing → ask: **"What's the symptom you want me to investigate?"**
2. Extract: expected vs. actual behavior, reproduction conditions (environment, inputs, frequency), recent changes that might be related
3. Ask clarifying questions until the investigation scope is clear

---

## Phase I2 — Investigate (Read-Only)

**Skill:** `slashforge:debug`

1. Invoke `slashforge:debug`
2. **If a code graph is available** (`GRAPH_REPORT.md` exists at repo root — Graphify is installed), run the freshness check from `forge-graph.md` Runtime section first, then consult the graph before grep/glob. Investigation is the scenario the graph is built for — blast radius, call paths, affected surface. The `graphify` PreToolUse hook should surface graph context automatically before any Glob/Grep call; if it doesn't, read `GRAPH_REPORT.md` directly.
3. Reproduce the issue — in code, in a test, or by tracing
4. Bisect / trace / read the code to find the root cause
5. **No edits to application code.** Scratch files, temporary test files in a sandboxed location, and logging are fine — but no PR-bound changes
6. If unable to reproduce, document what was tried and what conclusion was reached (intended behavior / environmental / need more info)

---

## Phase I3 — Report & Hand-Off

1. Produce a findings report. Required sections:
   - **Summary** — one-line conclusion (confirmed / not reproducible / intended behavior / needs more info)
   - **Reproduction** — exact steps, or "unable to reproduce" with what was tried
   - **Root cause** — what's actually happening (or best hypothesis)
   - **Affected scope** — which versions, environments, users
   - **Suggested next step** — fix approach, deferral rationale, or further investigation needed
2. **Write the report to a file:** `investigations/investigation-<YYYY-MM-DD-HHMM>.html`, relative to the repo root. Create the `investigations/` directory if it doesn't exist. Root-level, not under `.claude/` — dot-directories are hidden in Finder, and these reports are for humans to open. Write **only the body fragment** and splice it into the shipped `forge-report-shell.html`; see `investigate.md` (Findings report — body fragment only, and Output → step 1) for the fragment spec and the splice command. Never regenerate the shell's CSS.
3. **Open it in the user's browser** — best-effort, using the guarded snippet in `investigate.md` (Output → step 2). Skip silently when `$SSH_CONNECTION` is set or Linux has no `$DISPLAY`/`$WAYLAND_DISPLAY`; never let a failure abort the run.
4. **Summarise in chat — do not print the HTML.** Only the one-line conclusion, the root cause in a sentence or two, the file path, and the hand-off line. The file is the report; the chat gets a summary. If the browser could not be opened, say so and give the path.
5. **Hand off:** end with the report's **actual filename** substituted in — never emit a placeholder like `<path>` or `#FileName`:

   > *"Investigation complete → `investigations/investigation-2026-08-02-1432.html`. Want me to fix this? Run `/slashforge:code investigation-2026-08-02-1432.html` to start the fix."*

   The pointer after the arrow is the full repo-root-relative path (where the file lives, clickable in most terminals); the command takes the **bare filename only**, which `/slashforge:code` Step 0b resolves against `investigations/`. No `#` or `@` prefix on either.
