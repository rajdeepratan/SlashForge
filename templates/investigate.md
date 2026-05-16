---
name: /investigate
description: Research-only flow — reproduce and root-cause a bug or suspected issue. Produces a findings report. No branch, no PR, no code changes.
preflight: superpowers
---

**Preflight:** before reading anything else, open `{{INSTALL_PATH}}/claude-setup-preflight.md` and run the **Superpowers Check**.

Then read the following files in full:

- {{INSTALL_PATH}}/claude-setup-workflow-investigation.md
- {{INSTALL_PATH}}/claude-setup-workflow-agents.md

This command is **read-only**. Do not edit application code. Do not create branches. Do not open PRs. The deliverable is a findings report.

## Entry

The user invoked `/investigate` — the argument (if any) may be:
- A free-form symptom description
- A bug report or issue reference
- Nothing → ask: **"What's the symptom you want me to investigate?"**

**Begin Phase I1 — Investigation Intake** from the workflow doc's Investigation Flow section.

## Phases

- **I1 — Investigation Intake:** parse input, extract expected vs. actual behavior, ask clarifying questions
- **I2 — Investigate (read-only):** invoke `superpowers:systematic-debugging` (if installed); reproduce, bisect, trace, read code. **No edits to application code.**
- **I3 — Report & Hand-off:** produce findings report, write to file, print in chat

## Findings report — required HTML structure

The findings report is a self-contained HTML document with inline `<style>`, no external assets, no JavaScript. Use the skeleton below — fill the `<body>` sections with synthesis content. Same five logical sections as before, rendered as HTML.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Investigation — <short-symptom> (<YYYY-MM-DD>)</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         max-width: 880px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.55;
         color: #1f2328; background: #fff; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #d0d7de; padding-bottom: 0.25rem; }
  .summary { padding: 0.6rem 0.9rem; border-left: 4px solid #1a7f37; background: #f6f8fa;
             margin: 1rem 0; font-weight: 500; }
  .summary.unreproducible { border-left-color: #9a6700; }
  .summary.intended       { border-left-color: #57606a; }
  .summary.needs-info     { border-left-color: #0969da; }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; background: #f6f8fa;
         padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f6f8fa; padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  ul, ol { padding-left: 1.25rem; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d1117; color: #e6edf3; }
    h2 { border-bottom-color: #30363d; }
    .summary { background: #161b22; }
    th, td { border-color: #30363d; }
    th { background: #161b22; }
    code, pre { background: #161b22; }
    a { color: #58a6ff; }
  }
</style>
</head>
<body>

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
<p>What's actually happening, or best hypothesis if not fully nailed down. Link code references as
   <code>path/to/file.ts:42</code> inside <code>&lt;code&gt;</code> tags.</p>

<h2>Affected scope</h2>
<ul>
  <li><strong>Versions:</strong> ...</li>
  <li><strong>Environments:</strong> ...</li>
  <li><strong>Users:</strong> ...</li>
</ul>

<h2>Suggested next step</h2>
<p>Fix approach, deferral rationale, or further investigation needed.</p>

</body>
</html>
```

**Self-contained only.** No `<script>`, no external stylesheets, no CDN links. The file must render identically when opened from disk with no network.

## Output

Write the report to a file AND print the same content (or a plain-text equivalent) in chat: `.claude/investigations/investigation-<YYYY-MM-DD-HHMM>.html`. Create `.claude/investigations/` if it doesn't exist.

## Hand-off

End with:
> *"Investigation complete. Want me to fix this? Run `/code` to start the fix."*

Follow `{{INSTALL_PATH}}/claude-setup-workflow-investigation.md` as the source of truth.
