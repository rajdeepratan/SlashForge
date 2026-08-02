---
name: Claude Setup — SUMMARY.html Synthesis Prompt
description: Prompt template for synthesising graphify-out/SUMMARY.html from graphify-out/GRAPH_REPORT.md. Runs automatically inside /slashforge:setup on the Graphify yes-path — no second prompt. Produces a human-readable interpretive summary as a self-contained HTML file, not a reformat.
---

# SUMMARY.html Synthesis Prompt

This guide is read by Claude during `/slashforge:setup` immediately after `graphify claude install` succeeds. The user already authorised Graphify; SUMMARY.html generation rides on that same yes — no additional y/n prompt.

**One-time cost:** ~5–15k tokens, only on the yes-path. The synthesis turns a ~400-line machine dump into a human-readable HTML file (~250 lines, ~2-minute read) that opens cleanly in any browser.

**Stale-on-update behaviour is deferred** — for now, SUMMARY.html is written once at install time. Refresh policy on `graphify .` re-runs and `graphify watch` is a separate concern, not addressed here.

---

## What to do

1. Read `graphify-out/GRAPH_REPORT.md` in full.
2. Write `graphify-out/SUMMARY.html` following the structure below — a self-contained HTML document with inline `<style>`, no external assets, no JavaScript, no CDN links.
3. Tell the user: *"Synthesised graphify-out/SUMMARY.html from the graph report — open it in a browser to anchor your mental model of the codebase."*

---

## Required structure for SUMMARY.html

The file is a complete standalone HTML document. Use the skeleton below verbatim for the `<head>` (the CSS is tuned for legibility, tables, light/dark mode, and printing). Fill the `<body>` with synthesis — same logical sections as before, just rendered as HTML.

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Graph Summary — <repo name> (<YYYY-MM-DD>)</title>
<style>
  :root { color-scheme: light dark; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
         max-width: 880px; margin: 2rem auto; padding: 0 1.25rem; line-height: 1.55;
         color: #1f2328; background: #fff; }
  h1 { font-size: 1.6rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1.2rem; margin-top: 2rem; border-bottom: 1px solid #d0d7de; padding-bottom: 0.25rem; }
  blockquote { border-left: 3px solid #d0d7de; margin: 0.75rem 0; padding: 0.25rem 0.9rem;
               color: #57606a; font-style: italic; }
  table { border-collapse: collapse; width: 100%; margin: 0.5rem 0 1rem; }
  th, td { border: 1px solid #d0d7de; padding: 0.4rem 0.6rem; text-align: left; vertical-align: top; }
  th { background: #f6f8fa; font-weight: 600; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; }
  code { font-family: "SF Mono", Menlo, Consolas, monospace; background: #f6f8fa;
         padding: 0.1rem 0.35rem; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f6f8fa; padding: 0.75rem 1rem; border-radius: 6px; overflow-x: auto; }
  pre code { background: transparent; padding: 0; }
  ul { padding-left: 1.25rem; }
  .verdict-real   { color: #1a7f37; font-weight: 600; }
  .verdict-likely { color: #9a6700; font-weight: 600; }
  .verdict-false  { color: #cf222e; font-weight: 600; }
  @media (prefers-color-scheme: dark) {
    body { background: #0d1117; color: #e6edf3; }
    h2 { border-bottom-color: #30363d; }
    blockquote { border-left-color: #30363d; color: #8b949e; }
    th, td { border-color: #30363d; }
    th { background: #161b22; }
    code, pre { background: #161b22; }
    .verdict-real   { color: #3fb950; }
    .verdict-likely { color: #d29922; }
    .verdict-false  { color: #f85149; }
  }
</style>
</head>
<body>

<h1>Graph Summary — <repo name> (<YYYY-MM-DD>)</h1>
<blockquote>Human-readable synthesis of <code>GRAPH_REPORT.md</code>. The report is auto-generated
by <code>graphify .</code>; this file is hand-curated synthesis written once at <code>/slashforge:setup</code> time.</blockquote>

<h2>Size &amp; quality</h2>
<ul>
  <li><strong>&lt;N&gt; files → &lt;N&gt; nodes → &lt;N&gt; edges → &lt;N&gt; communities</strong></li>
  <li><strong>&lt;%&gt; extracted</strong> (AST-derived, high confidence)
      <strong>/ &lt;%&gt; inferred</strong> (model-reasoned, ~&lt;avg&gt; confidence).
      Inferred edges are leads — verify before treating as fact for high-stakes refactors.</li>
  <li>Token cost to build: <strong>zero</strong> — purely AST + clustering, no LLM.</li>
</ul>

<h2>God nodes — your real architectural pillars</h2>
<table>
  <thead><tr><th>Rank</th><th>Symbol</th><th>Edges</th><th>What it means</th></tr></thead>
  <tbody>
    <tr><td>1</td><td><code>&lt;symbol&gt;</code></td><td class="num">&lt;N&gt;</td>
        <td>&lt;one-sentence interpretation of why this is central&gt;</td></tr>
    <!-- 8–10 rows total -->
  </tbody>
</table>
<p>[1–2 sentence "read this as architectural truth" paragraph naming the dominant pattern the god nodes confirm.]</p>

<h2>Surprising connections — verify these</h2>
<p>Inferred (non-AST) cross-community edges flagged in <code>GRAPH_REPORT.md</code>.
   One-line verdict per edge — Real / Likely real / False positive — with the reason. Identify which look like graph noise.</p>
<table>
  <thead><tr><th>Edge</th><th>Verdict</th></tr></thead>
  <tbody>
    <tr><td><code>&lt;from&gt; → &lt;to&gt;</code></td>
        <td><span class="verdict-real">Real.</span> &lt;why&gt;</td></tr>
    <!-- repeat per edge; use verdict-likely / verdict-false where appropriate -->
  </tbody>
</table>

<h2>Notable communities</h2>
<p>Top 6–10 communities by cohesion or size. Plain-language label of what each cluster actually is —
   derived from file paths and symbol names. Don't say "community 8"; say what community 8 actually does.</p>
<table>
  <thead><tr><th>Community</th><th>Cohesion</th><th>Size</th><th>What it is</th></tr></thead>
  <tbody>
    <tr><td><strong>&lt;id&gt;</strong></td><td class="num">&lt;score&gt;</td>
        <td class="num">&lt;count&gt;</td><td>&lt;plain-language description&gt;</td></tr>
  </tbody>
</table>
<p>[Optional 1–2 sentence note on thin communities at the tail — often duplicate patterns like CRUD-quartets per slice. Say whether that's intentional design or smell.]</p>

<h2>Knowledge gaps worth knowing about</h2>
<p>Symbols that appear isolated because the parser couldn't follow them — typically third-party classes,
   browser globals, native modules. For each, name what kind of work is opaque to the graph as a result.</p>
<ul>
  <li><strong>&lt;gap&gt;</strong> — &lt;impact&gt;</li>
</ul>

<h2>Going deeper</h2>
<pre><code>graphify query "&lt;question&gt;"            # BFS traversal — open-ended questions
graphify path "&lt;NodeA&gt;" "&lt;NodeB&gt;"      # Shortest path between two symbols
graphify explain "&lt;symbol&gt;"            # Plain-language node + neighbour explanation</code></pre>
<p>Three concrete examples using <em>this</em> repo's actual god nodes — not generic placeholders.</p>
<ul>
  <li><code>graphify explain "&lt;top-god-node&gt;"</code> → blast radius of changing &lt;its purpose&gt;</li>
  <li><code>graphify path "&lt;provider&gt;" "&lt;consumer&gt;"</code> → trace from &lt;bootstrap&gt; to &lt;feature&gt;</li>
  <li><code>graphify query "&lt;repo-specific question&gt;"</code> → &lt;what it'd answer&gt;</li>
</ul>

</body>
</html>
```

---

## Optional section — "What this means for &lt;X&gt; work"

Add this section ONLY if `CLAUDE.md` mentions an active feature, migration, or focus area. Then provide 3–4 graph-derived hints — patterns the new work should follow based on the god nodes and communities. Render it as another `<h2>` block with a short `<p>` and a `<ul>`.

**Do not invent a focus area.** If CLAUDE.md doesn't flag one, omit this section entirely.

---

## Synthesis directives — read carefully

- **Don't paraphrase.** Reformatting GRAPH_REPORT.md is the wrong output. The value is interpretation: which inferred edges are noise, what each community actually does in product terms, what architectural pattern the god nodes confirm.
- **Use file paths and symbol names** to derive plain-language labels. A community of `createCallsNotificationsHandler`, `handleQueueUpdate` in `packages/cobra-core/src/core/` is "telephony notification handlers", not "community 8".
- **Identify false positives** by looking at confidence scores and cross-community edges that smell wrong (e.g., a global JS builtin reached from an unrelated subsystem). The graph occasionally confuses local symbols with same-named globals — call those out using the `verdict-false` class so they read as red in the browser.
- **Reference actual numbers** from GRAPH_REPORT.md — file count, node count, edge count, extracted-vs-inferred ratio. Don't approximate.
- **Stay under ~250 lines of HTML.** The rendered page should still read in two minutes. If you're padding to look thorough, cut.
- **Self-contained only.** No `<script>` tags, no external stylesheets, no CDN links, no `<img src="http...">`. The file must render identically when opened from disk with no network.
- **Repo name and date** — derive repo name from the directory name or `package.json`/equivalent; date is today (YYYY-MM-DD).
