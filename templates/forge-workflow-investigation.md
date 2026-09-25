---
name: Claude Development Workflow — Investigation Flow
description: Read-only investigation flow used by /slashforge-investigate — reproduction, root-cause analysis, and findings report
---

# Investigation Flow

Short, research-only flow used by `/slashforge-investigate`. No branching, no PR, no verification phase. Output is a findings report. Companion file:

<!--target:claude-->
- `forge-workflow-agents.md` — Agent Selection Table + multiple-agents rule + self-sufficiency rules (loaded by every workflow command)
<!--/target-->
<!--target:agents-->
- `forge-workflow-agents.md` — how task types are handled + self-sufficiency rules (loaded by every workflow command)
<!--/target-->

This file is loaded by `/slashforge-investigate`.

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

**Skill:** `slashforge-debug`

1. Invoke `slashforge-debug`
2. **If a code graph is available** (`GRAPH_REPORT.md` exists at repo root — Graphify is installed), run the freshness check from `forge-graph.md` Runtime section first, then consult the graph before grep/glob. Investigation is the scenario the graph is built for — blast radius, call paths, affected surface. The `graphify` PreToolUse hook should surface graph context automatically before any Glob/Grep call; if it doesn't, read `GRAPH_REPORT.md` directly.
3. Reproduce the issue — in code, in a test, or by tracing
4. Bisect / trace / read the code to find the root cause
5. **No edits to application code.** Scratch files, temporary test files in a sandboxed location, and logging are fine — but no PR-bound changes
6. If unable to reproduce, document what was tried and what conclusion was reached (intended behavior / environmental / need more info)

---

## Phase I3 — Report & Hand-Off

Three steps, in order: **write the file**, **open it**, **summarise in chat**. Then hand off.

### The findings report — body fragment only

The report's shell — doctype, `<head>`, the entire `<style>` block — ships with SlashForge at
`{{INSTALL_PATH}}/forge-report-shell.html`. **Do not regenerate it.** You write only the body
fragment; a substitution step splices the two together.

This is deliberate: the CSS is identical in every report, so regenerating it per run wastes
output tokens and lets reports drift apart visually.

Write **only** these five sections — no `<html>`, no `<head>`, no `<style>`, no `<body>` tags:

```html
<h1>Investigation — <short-symptom></h1>

<div class="summary">
  <!-- Pick one class: default green (confirmed), .unreproducible, .intended, .needs-info -->
  <strong>Summary:</strong> <one-line conclusion — confirmed / not reproducible / intended behaviour / needs more info>
</div>

<h2>Reproduction</h2>
<!-- Exact steps as an ordered list, or a paragraph explaining "unable to reproduce" + what was tried -->
<ol>
  <li>...</li>
</ol>

<h2>Root cause</h2>
<p>What's actually happening, or best hypothesis if not fully nailed down. Wrap code references
   like <code>path/to/file.ts:42</code> in <code>&lt;code&gt;</code> tags.</p>

<h2>Affected scope</h2>
<ul>
  <li><strong>Versions:</strong> ...</li>
  <li><strong>Environments:</strong> ...</li>
  <li><strong>Users:</strong> ...</li>
</ul>

<h2>Suggested next step</h2>
<p>Fix approach, deferral rationale, or further investigation needed.</p>
```

The shell provides styling for `h1`, `h2`, `.summary` (plus its four state modifiers), `code`,
`pre`, `ul`/`ol`, and `table`. Use those elements and the report renders correctly in light and
dark. Do not add inline `style=` attributes and do not introduce new classes — the shell will not
have styles for them.

**Self-contained only.** No `<script>`, no external stylesheets, no CDN links, no remote fonts or
images. The finished file must render identically opened from disk with no network.

### 1. Write

Write your body fragment to a scratch file, then splice it into the shipped shell. Create
`docs/slashforge/investigations/` if it doesn't exist, parents included (`mkdir -p` handles this).
<!--target:claude-->
Not inside `.claude/`, because a dot-directory is hidden in Finder and these reports are meant to
<!--/target-->
<!--target:cursor-->
Not inside `.cursor/`, because a dot-directory is hidden in Finder and these reports are meant to
<!--/target-->
<!--target:codex-->
Not inside `.codex/`, because a dot-directory is hidden in Finder and these reports are meant to
<!--/target-->
be opened by a human without a code editor.

```bash
mkdir -p docs/slashforge/investigations
report="docs/slashforge/investigations/investigation-<YYYY-MM-DD-HHMM>.html"

node "{{INSTALL_PATH}}/forge-splice.js" "$fragment" "$report" "Investigation — <short-symptom> (<YYYY-MM-DD>)"
```

`forge-splice.js` ships next to the shell and does the substitution the same way every time:

- It uses **function-form** replacement (`() => body`), so `$&` or `$'` inside your fragment can't be read as substitution patterns and corrupt the report.
- **It escapes the title but not the body.** The title is plain text taken from the symptom. Unescaped, a symptom containing `</title>` would end the element early, and entity-shaped text like `&amp;` would be decoded into something the symptom never said. The body is real HTML and goes in verbatim.
- It is a file rather than an inline `node -e` script so that a permission rule can allow exactly this path, not arbitrary node code.
- Delete the scratch fragment afterwards. It is not part of the deliverable.

<!--target:claude-->
If the shell or `forge-splice.js` is missing (an older install, or a hand-modified `.claude/`), fall back to emitting a complete standalone HTML document yourself using the same element vocabulary, and tell the user the shell was not found.
<!--/target-->
<!--target:cursor-->
If the shell or `forge-splice.js` is missing (an older install, or a hand-modified `.agents/`), fall back to emitting a complete standalone HTML document yourself using the same element vocabulary, and tell the user the shell was not found.
<!--/target-->
<!--target:codex-->
If the shell or `forge-splice.js` is missing (an older install, or a hand-modified `.agents/`), fall back to emitting a complete standalone HTML document yourself using the same element vocabulary, and tell the user the shell was not found.
<!--/target-->

### 2. Open it in the user's browser (best-effort)

Use the shipped helper rather than writing your own platform detection:

```bash
sh "{{INSTALL_PATH}}/forge-open.sh" "$report"
```

The script handles the platform differences and the cases where opening makes no sense — a remote session (`$SSH_CONNECTION`), or a headless Linux box with no `$DISPLAY`/`$WAYLAND_DISPLAY`. It always exits 0, so it can never fail the run. In those cases the report is still written; it just is not opened, and you say so in step 3.

### 3. Summarise in chat — never print the HTML

Print **only**:

- the one-line conclusion (confirmed / not reproducible / intended behaviour / needs more info)
- the root cause in a sentence or two
- the file path
- the hand-off line (below)

**Do not print the HTML document, and do not restate the full report in chat.** The file is the report; the chat gets a summary. If the browser could not be opened, add: *"Couldn't open a browser here — open `<path>` to read it."*

### 4. Hand off

End with the report's **actual filename** substituted in — never emit a placeholder like `<path>` or `#FileName`:

> *"Investigation complete → `docs/slashforge/investigations/investigation-2026-08-02-1432.html`. Want me to fix this? Run `/slashforge-code investigation-2026-08-02-1432.html` to start the fix."*

Two different forms, deliberately:

- **The pointer** (after the arrow) is the full repo-root-relative path — it tells the user where the file lives and is clickable in most terminals.
- **The command** takes the **bare filename only.** `/slashforge-code` Step 0b resolves it against `docs/slashforge/investigations/`, so the shorter form is what the user has to type or paste.

No `#` or `@` prefix on either. A bare filename is what Step 0b resolves.
