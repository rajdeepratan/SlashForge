---
name: /slashforge:brainstorm
description: Turn an idea into an agreed design before any code exists. Use before creating features, building components, adding functionality, or changing behaviour. Explores intent, constraints and success criteria, then produces a spec you approve.
---

<!--
Adapted from the `brainstorming` skill in superpowers.
Copyright (c) 2025 Jesse Vincent. Licensed under the MIT License.
https://github.com/obra/superpowers

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions: the above copyright notice and this
permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->

# Brainstorm Into a Design

Turn an idea into a design the user has actually agreed to, through dialogue — not by
guessing well.

## The gate

> **No implementation, scaffolding, or file creation until a design is presented and approved.**

This holds for every project regardless of how simple it looks. The design may be three
sentences for a genuinely small change — but it gets presented, and the user says yes.

**"This is too simple to need a design"** is the rationalisation to watch for. Simple work is
where unexamined assumptions cost the most, because nobody thinks to check them.

## Where the spec goes

`docs/slashforge/specs/YYYY-MM-DD-<topic>-design.html`, unless the user has said otherwise. Do
not write design documents anywhere else in the repo.

It is HTML, built from the shared document shell — the same one the investigation reports use, so
every SlashForge artefact looks alike and the CSS is never regenerated. **Write only the body
fragment**; a substitution step splices it in.

### The fragment

Use only these elements. The shell styles `h1`, `h2`, `code`, `pre`, `ul`/`ol`, `table`, and
`.summary`. Do not add inline `style=` attributes or new classes — the shell has no rules for them.

```html
<h1>Design — <topic></h1>

<div class="summary">
  <strong>Goal:</strong> <one sentence on what this achieves>
</div>

<h2>Problem</h2>
<p>What is wrong or missing today, and why it matters.</p>

<h2>Approach</h2>
<p>The chosen shape, and the 2-3 alternatives with why they lost.</p>

<h2>Design</h2>
<p>The pieces, their boundaries, and how they interact. Wrap code references like
   <code>path/to/file.ts:42</code> in <code>&lt;code&gt;</code> tags.</p>

<h2>Testing</h2>
<p>What will be tested and how it is proven.</p>

<h2>Out of scope</h2>
<ul>
  <li>...</li>
</ul>
```

### Writing it

```bash
mkdir -p docs/slashforge/specs
spec="docs/slashforge/specs/<YYYY-MM-DD>-<topic>-design.html"

node -e '
const fs = require("fs");
const [shell, frag, out, title] = process.argv.slice(1);
const body = fs.readFileSync(frag, "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
fs.writeFileSync(out, fs.readFileSync(shell, "utf8")
  .replace("<!--TITLE-->",   () => esc(title))
  .replace("<!--CONTENT-->", () => body));
' "{{INSTALL_PATH}}/forge-report-shell.html" "$fragment" "$spec" "Design — <topic> (<YYYY-MM-DD>)"
```

Function-form replacement, title escaped, body verbatim — same reasoning as the investigation
report. Delete the scratch fragment afterwards.

Then open it, so the user reads the rendered document rather than the markup:

```bash
sh "{{INSTALL_PATH}}/forge-open.sh" "$spec"
```

Best-effort — the helper stays silent over SSH or on a headless box and can never fail the run.
If it could not open, say so and give the path.

## Steps

Work through these in order.

**1. Explore the context first.** Read the relevant files, recent commits, existing patterns.
Understand what is already there before proposing anything new. In an existing codebase, follow
its conventions rather than importing your own.

**2. Check the scope before refining details.** If the request spans several independent
subsystems, say so immediately and help decompose it. Do not spend questions polishing details
of something that needs splitting first. Each sub-project earns its own spec → plan → build
cycle.

**3. Ask questions one at a time.** One question per message. Multiple choice where it fits,
open-ended where it does not. Aim at purpose, constraints, and success criteria — not
implementation detail. If a topic needs more depth, that is more questions, not a longer one.

**4. Propose 2–3 approaches with trade-offs.** Lead with your recommendation and say why. Be
ruthless about YAGNI — strip anything not needed for the actual goal from every option.

**5. Present the design in sections.** Scale each section to its complexity: a sentence or two
when it is straightforward, a few hundred words when it is genuinely nuanced. Cover the shape
of the change, the pieces involved, how they interact, what happens when things fail, and how
it gets tested. Check after each section that it still looks right.

**6. Write the spec** (see above), **then self-review it** with fresh eyes:

- **Placeholders** — any TBD, TODO, or vague requirement? Fill them in.
- **Consistency** — do any two sections contradict each other?
- **Scope** — is this one implementable piece of work, or does it need splitting?
- **Ambiguity** — could a requirement be read two ways? Pick one and say so explicitly.

Fix what you find inline. No second pass needed.

**7. Ask the user to review the written spec** before going further. If they want changes, make
them and re-run the self-review. Only continue once they approve.

## Designing units that hold together

Break the work into pieces with one clear purpose each, communicating through defined
interfaces. For every piece you should be able to answer: what does it do, how is it used, what
does it depend on?

If someone cannot tell what a unit does without reading its internals, or you cannot change
those internals without breaking callers, the boundary is wrong.

Where existing code genuinely obstructs the work — a file that has grown unwieldy, tangled
responsibilities — include a targeted improvement in the design, the way a careful developer
improves code they are working in. Do not propose unrelated refactoring.

## After approval

Hand off to planning. Do not start implementing, and do not invoke any other skill first.
