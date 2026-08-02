---
name: /slashforge:plan
description: Turn an approved spec into a step-by-step implementation plan. Use after a design is agreed and before touching code. Produces bite-sized tasks with real code, real commands, and no placeholders.
---

<!--
Adapted from the `writing-plans` skill in superpowers.
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

# Write the Implementation Plan

Write for a capable engineer who knows nothing about this codebase and will not ask you
questions. Everything they need is in the plan or it does not reach them.

## Where the plan goes

`docs/slashforge/plans/YYYY-MM-DD-<feature-name>.html`, unless the user has said otherwise. Do
not write plans anywhere else in the repo.

It is HTML, built from the shared document shell — the same one investigation reports and design
specs use. **Write only the body fragment**; a substitution step splices it in.

```bash
mkdir -p docs/slashforge/plans
plan="docs/slashforge/plans/<YYYY-MM-DD>-<feature-name>.html"

node -e '
const fs = require("fs");
const [shell, frag, out, title] = process.argv.slice(1);
const body = fs.readFileSync(frag, "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
fs.writeFileSync(out, fs.readFileSync(shell, "utf8")
  .replace("<!--TITLE-->",   () => esc(title))
  .replace("<!--CONTENT-->", () => body));
' "{{INSTALL_PATH}}/forge-report-shell.html" "$fragment" "$plan" "Plan — <feature-name> (<YYYY-MM-DD>)"
```

Function-form replacement, title escaped, body verbatim. Delete the scratch fragment afterwards.

Then open it, so the user reviews the rendered plan rather than the markup:

```bash
sh "{{INSTALL_PATH}}/forge-open.sh" "$plan"
```

Best-effort — the helper stays silent over SSH or on a headless box and can never fail the run.
If it could not open, say so and give the path.

### Tracking progress in HTML

Steps are checkboxes. In HTML that is a literal `☐` at the start of the list item, swapped to `☑`
when the step is done:

```html
<li>☐ <strong>Step 1: Write the failing test</strong></li>
```

Edit the character in place as you go — the plan is a live document, not a record written once.
Do not use `<input type="checkbox">`: the shell carries no JavaScript, so its state would not
survive a reload and would not be readable by whoever picks the plan up next.

## Before writing tasks: map the files

List what gets created and modified, and what each file is responsible for. This is where
decomposition gets decided, so decide it deliberately:

- One clear responsibility per file. Files that change together belong together.
- Split by responsibility, not by technical layer.
- Follow the codebase's existing structure. If a file you are touching has grown unwieldy,
  including a split is reasonable — unrelated restructuring is not.

## Required header

```html
<h1>Plan — [Feature]</h1>

<div class="summary">
  <strong>Goal:</strong> [one sentence]
</div>

<h2>Architecture</h2>
<p>[2–3 sentences on the approach]</p>

<h2>Tech stack</h2>
<p>[key technologies]</p>

<h2>Global constraints</h2>
<ul>
  <li>[Project-wide requirements — version floors, dependency limits, platform
      rules — one line each, values copied exactly from the spec. Every task
      inherits these.]</li>
</ul>
```

## Task shape

A task is the smallest unit that carries its own test cycle and deserves a reviewer's yes or no.
Fold setup, configuration and documentation into the task whose deliverable needs them. Split
only where a reviewer could sensibly accept one task and reject the next. Every task ends with
something independently testable.

Each **step** inside a task is one action, two to five minutes:

```html
<h2>Task N: [Name]</h2>

<p><strong>Files</strong></p>
<ul>
  <li>Create: <code>exact/path/to/file.js</code></li>
  <li>Modify: <code>exact/path/to/existing.js:123-145</code></li>
  <li>Test: <code>test/exact/path.test.js</code></li>
</ul>

<p><strong>Interfaces</strong></p>
<ul>
  <li>Consumes: [what earlier tasks provide — exact signatures]</li>
  <li>Produces: [what later tasks rely on — exact names and types]</li>
</ul>

<ul>
  <li>☐ <strong>Step 1: Write the failing test</strong>
<pre><code>test('specific behaviour', () =&gt; {
  assert.equal(fn(input), expected);
});</code></pre></li>

  <li>☐ <strong>Step 2: Run it and confirm it FAILS</strong><br>
      Run: <code>npm test</code> — expected: fail with "fn is not defined"</li>

  <li>☐ <strong>Step 3: Write the minimal implementation</strong>
<pre><code>function fn(input) { return expected; }</code></pre></li>

  <li>☐ <strong>Step 4: Run it and confirm it PASSES</strong></li>

  <li>☐ <strong>Step 5: Commit</strong></li>
</ul>
```

Code inside `<pre><code>` must have `<`, `>` and `&` escaped, or the snippet will be parsed as
markup and vanish from the rendered page.

The **Interfaces** block matters: a task's implementer sees only their own task, so this is how
they learn the names and types their neighbours use.

## No placeholders

These are plan failures, not shorthand. Never write them:

- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling", "handle edge cases", "add validation"
- "Write tests for the above" without the test code
- "Similar to Task N" — repeat it; tasks get read out of order
- Any step describing *what* without showing *how*
- References to functions or types no task defines

## Self-review

Read the spec again with fresh eyes, then check the plan against it:

1. **Coverage** — can you point at a task for every requirement in the spec? List gaps and add
   tasks for them.
2. **Placeholders** — search for the patterns above. Fix them.
3. **Consistency** — do the names and signatures in later tasks match what earlier tasks
   defined? `clearLayers()` in one task and `clearFullLayers()` in another is a bug you are
   shipping to the implementer.

Fix inline and move on.

## Hand-off

Say where the plan is saved and confirm the execution approach before starting: task-by-task
with review between, or straight through with checkpoints. It is already open in their browser.
