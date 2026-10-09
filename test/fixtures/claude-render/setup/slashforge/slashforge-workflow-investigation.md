---
name: SlashForge Workflow — Investigation Flow
description: Read-only investigation flow used by /slashforge-investigate — reproduction, root-cause analysis, and findings report
---

# Investigation Flow

Short, research-only flow used by `/slashforge-investigate`. No branching, no PR, no verification phase. Output is a findings report. Companion file:

- `slashforge-workflow-agents.md` — Agent Selection Table + multiple-agents rule + self-sufficiency rules (loaded by every workflow command)

This file is loaded by `/slashforge-investigate`.

---

## Phase I1 — Investigation Intake

1. Parse input. Accept:
   - A free-form symptom description
   - A bug report or issue link the user pastes
   - Nothing → ask: **"What's the symptom you want me to investigate?"**
2. Extract: expected vs. actual behavior, reproduction conditions (environment, inputs, frequency), recent changes that might be related
3. Ask clarifying questions until the investigation scope is clear
4. **Pick the `<issue-slug>`** — a short kebab name for the issue (from the issue reference, or a summary of the symptom — **never a timestamp**). It names the `docs/slashforge/active/<issue-slug>/` folder the report is written into, and the folder a later `/slashforge-code` or `/slashforge-fix` on this issue reuses. If `active/<issue-slug>/` or `archive/<issue-slug>/` already exists, append `-2`, `-3`, … See `slashforge-spec-home.md`.

---

## Phase I2 — Investigate (Read-Only)

**Skill:** `slashforge-debug`

1. Invoke `slashforge-debug`
2. **If a code graph is available** (`GRAPH_REPORT.md` exists at repo root — Graphify is installed), run the freshness check from `slashforge-graph.md` Runtime section first, then consult the graph before grep/glob. Investigation is the scenario the graph is built for — blast radius, call paths, affected surface. The `graphify` PreToolUse hook should surface graph context automatically before any Glob/Grep call; if it doesn't, read `GRAPH_REPORT.md` directly.
3. Reproduce the issue — in code, in a test, or by tracing
4. Bisect / trace / read the code to find the root cause
5. **No edits to application code.** Scratch files, temporary test files in a sandboxed location, and logging are fine — but no PR-bound changes
6. If unable to reproduce, document what was tried and what conclusion was reached (intended behavior / environmental / need more info)

---

## Phase I3 — Report & Hand-Off

Three steps, in order: **write the report**, **write the structured hand-off**, **summarise in
chat**. Then hand off.

### The findings report — Markdown

Write a Markdown report with these five sections to
`docs/slashforge/active/<issue-slug>/investigation.md` (the `<issue-slug>` chosen at I1). This is the
same `active/<issue-slug>/` folder a later `/slashforge-code` or `/slashforge-fix` reuses, so one
issue's investigation, plan and tasks live together.

```markdown
# Investigation — <short-symptom>

**Summary:** <one-line conclusion — confirmed / not reproducible / intended behaviour / needs more info>

## Reproduction
Exact steps as an ordered list, or a paragraph explaining "unable to reproduce" and what was tried.

## Root cause
What is actually happening, or the best hypothesis if not fully nailed down. Reference code as
inline `code` spans, e.g. `path/to/file.ts:42`.

## Affected scope
- **Versions:** ...
- **Environments:** ...
- **Users:** ...

## Suggested next step
Fix approach, deferral rationale, or further investigation needed.
```

### 1. Write the report

```bash
mkdir -p docs/slashforge/active/<issue-slug>
# then write the Markdown above to:
#   docs/slashforge/active/<issue-slug>/investigation.md
```

Write the file with your editor/Write tool — plain Markdown, no shell or splice step and no HTML.
Keep code references as inline `code` spans so they read well in a diff and in a Markdown viewer.

### 1b. Write the structured hand-off — `.slashforge/latest_investigation.json`

The report is for a human. `/slashforge-fix` needs the same findings as data it can read without
parsing prose, so write a second artifact: a machine-readable JSON file at
`.slashforge/latest_investigation.json`. This is the **investigation contract** — the one interface
between the read-only investigation and the code-fixing pipeline.

```bash
mkdir -p .slashforge
```

Write exactly this schema — every key is required, even when a value is empty (`[]` or `""`):

```json
{
  "run_id": "<issue-slug>",
  "reproduction_steps": ["string", "..."],
  "root_cause": "string",
  "implicated_files": [
    { "filepath": "path/to/file.ts", "line_numbers": [42, 118] }
  ],
  "suggested_approach": "string"
}
```

- **`run_id`** — the `<issue-slug>`, matching the report's `active/<issue-slug>/` folder, so the two
  artifacts are traceable to one investigation.
- **`reproduction_steps`** — the ordered steps that trigger the bug, one per array entry. These
  become the regression test `/slashforge-fix` writes before it patches anything. If the issue was
  not reproducible, use `[]` and say so in `suggested_approach`.
- **`root_cause`** — the same conclusion as the report's Root cause section, as plain text.
- **`implicated_files`** — every file the fix is likely to touch, each with the line numbers that
  matter (`[]` when the whole file is implicated or no specific line is known). `/slashforge-fix`
  **locks its context to exactly these files** — a file omitted here is a file the fix will not
  look at, so list every file the patch and its test will need.
- **`suggested_approach`** — the report's Suggested next step, as plain text. A proposal, not an
  approved plan.

Write it with a tool that serialises JSON correctly (so quotes, newlines and backslashes are
escaped) rather than by hand. `.slashforge/` is machine-local run state and belongs in `.gitignore`
— a hand-off between commands, not a committed record (the `investigation.md` report is that). Each
investigation overwrites `latest_investigation.json`, which is what `/slashforge-fix` reads with no
argument.

### 2. Summarise in chat — never paste the full report

Print **only**:

- the one-line conclusion (confirmed / not reproducible / intended behaviour / needs more info)
- the root cause in a sentence or two
- the file path
- the hand-off line (below)

**Do not restate the full report in chat.** The file is the report; the chat gets a summary.

### 3. Hand off

End with the report's **actual path** substituted in — never emit a placeholder like `<issue-slug>`:

> *"Investigation complete → `docs/slashforge/active/fix-command-lists-stop-at-six/investigation.md`. Want me to fix this? Run `/slashforge-fix` to patch it straight from this investigation (test-first, scoped to the implicated files), or `/slashforge-code fix-command-lists-stop-at-six` for the full planning flow."*

Two hand-off routes, deliberately:

- **`/slashforge-fix`** (recommended for a confirmed bug) reads `.slashforge/latest_investigation.json`
  — the artifact just written — with no argument. It skips discovery, locks its context to the
  `implicated_files`, and enforces a regression test before the patch. This is the tight
  investigate → fix loop.
- **`/slashforge-code <issue-slug>`** takes the **bare issue slug** (no `#` or `@` prefix — its
  Step 0b resolves it to `docs/slashforge/active/<issue-slug>/investigation.md`) and runs the full
  feature-planning flow, for when the fix is larger than the bug.

The pointer after the arrow is the full repo-root-relative path — it tells the user where the
report lives and is clickable in most terminals.
