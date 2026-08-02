---
name: /slashforge:investigate
description: Research-only flow — reproduce and root-cause a bug or suspected issue. Produces a findings report. No branch, no PR, no code changes.
preflight: superpowers
---

**Preflight:** before reading anything else, open `{{INSTALL_PATH}}/forge-preflight.md` and run the **Superpowers Check**.

Then read the following files in full:

- {{INSTALL_PATH}}/forge-workflow-investigation.md
- {{INSTALL_PATH}}/forge-workflow-agents.md

This command is **read-only**. Do not edit application code. Do not create branches. Do not open PRs. The deliverable is a findings report.

## Entry

The user invoked `/slashforge:investigate` — the argument (if any) may be:
- A free-form symptom description
- A bug report or issue reference
- Nothing → ask: **"What's the symptom you want me to investigate?"**

**Begin Phase I1 — Investigation Intake** from the workflow doc's Investigation Flow section.

## Phases

- **I1 — Investigation Intake:** parse input, extract expected vs. actual behavior, ask clarifying questions
- **I2 — Investigate (read-only):** invoke `superpowers:systematic-debugging` (if installed); reproduce, bisect, trace, read code. **No edits to application code.**
- **I3 — Report & Hand-off:** produce findings report, write to file, print in chat

## Findings report — body fragment only

The report's shell — doctype, `<head>`, the entire `<style>` block — ships with SlashForge at
`{{INSTALL_PATH}}/forge-report-shell.html`. **Do not regenerate it.** You write only the body
fragment; a substitution step splices the two together.

This is deliberate: the CSS is identical in every report, so regenerating it per run wastes
output tokens and lets reports drift apart visually.

### The fragment

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

## Output

Three steps, in order: **write the file**, **open it**, **summarise in chat**.

### 1. Write

Write your body fragment to a scratch file, then splice it into the shipped shell. Create `investigations/` if it doesn't exist — repo root, not inside `.claude/`, because a dot-directory is hidden in Finder and these reports are meant to be opened by a human without a code editor.

```bash
mkdir -p investigations
report="investigations/investigation-<YYYY-MM-DD-HHMM>.html"

node -e '
const fs = require("fs");
const [shell, frag, out, title] = process.argv.slice(1);
const body = fs.readFileSync(frag, "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
fs.writeFileSync(out, fs.readFileSync(shell, "utf8")
  .replace("<!--TITLE-->",   () => esc(title))
  .replace("<!--CONTENT-->", () => body));
' "{{INSTALL_PATH}}/forge-report-shell.html" "$fragment" "$report" "<short-symptom> (<YYYY-MM-DD>)"
```

Three details that matter:

- The replacements use **function** form (`() => body`), not a plain string. A string replacement would let `$&` or `$'` sequences inside your fragment be interpreted as substitution patterns and silently corrupt the report.
- **The title is escaped; the body is not.** The title is plain text taken from the symptom, so `&`, `<` and `>` are escaped — `&` first, or the ampersands introduced by the later replacements get double-escaped. Without this, a symptom containing `</title>` ends the element early and the rest leaks into the document as markup, and entity-shaped text like `&amp;` or `&#65;` is silently decoded into something the symptom never said. The body is genuine HTML and must be spliced verbatim.
- Delete the scratch fragment afterwards. It is not part of the deliverable.

If the shell is missing (an older install, or a hand-modified `.claude/`), fall back to emitting a complete standalone HTML document yourself using the same element vocabulary, and tell the user the shell was not found.

### 2. Open it in the user's browser (best-effort)

Run this, substituting the real filename. It is **best-effort**: it must never fail the run, and it must stay silent where no browser exists.

```bash
report="investigations/investigation-<YYYY-MM-DD-HHMM>.html"
if [ -z "$SSH_CONNECTION" ]; then
  case "$(uname -s)" in
    Darwin) open "$report" 2>/dev/null || true ;;
    Linux)
      if grep -qi microsoft /proc/version 2>/dev/null; then
        wslview "$report" 2>/dev/null || explorer.exe "$(wslpath -w "$report")" 2>/dev/null || true
      elif [ -n "${DISPLAY}${WAYLAND_DISPLAY}" ]; then
        xdg-open "$report" >/dev/null 2>&1 || true
      fi ;;
    MINGW*|MSYS*|CYGWIN*) start "" "$report" 2>/dev/null || true ;;
  esac
fi
```

The guards matter: `$SSH_CONNECTION` means a remote session (opening a browser there is useless or wrong), and an empty `$DISPLAY`/`$WAYLAND_DISPLAY` means a headless Linux box. In those cases the report is still written — it just is not opened, and you say so in step 3.

### 3. Summarise in chat — never print the HTML

Print **only**:

- the one-line conclusion (confirmed / not reproducible / intended behaviour / needs more info)
- the root cause in a sentence or two
- the file path
- the hand-off line (below)

**Do not print the HTML document, and do not restate the full report in chat.** The file is the report; the chat gets a summary. If the browser could not be opened, add: *"Couldn't open a browser here — open `<path>` to read it."*

## Hand-off

End with the report's **actual filename** substituted in — never emit a placeholder like `<path>` or `#FileName`:

> *"Investigation complete → `investigations/investigation-2026-08-02-1432.html`. Want me to fix this? Run `/slashforge:code investigation-2026-08-02-1432.html` to start the fix."*

Two different forms, deliberately:

- **The pointer** (after the arrow) is the full repo-root-relative path — it tells the user where the file lives and is clickable in most terminals.
- **The command** takes the **bare filename only.** `/slashforge:code` Step 0b resolves it against `investigations/`, so the shorter form is what the user has to type or paste.

No `#` or `@` prefix on either. A bare filename is what Step 0b resolves.

Follow `{{INSTALL_PATH}}/forge-workflow-investigation.md` as the source of truth.
