---
name: /slashforge-plan
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

`docs/slashforge/active/<change-slug>/plan.md` (the HOW) and
`docs/slashforge/active/<change-slug>/tasks.md` (the checklist), under the
`<change-slug>` chosen at intake (by `slashforge-brainstorm` on the full path, or
when the plan is written on the lean/trivial path). See `/HOME/.claude/setup/slashforge/slashforge-spec-home.md`
for the layout. Do not write plans anywhere else in the repo.

They are **Markdown** — living specs that must diff, grep and review in a pull request. Write
them with a plain file write; there is no splice or shell step (those stay with the
investigation report).

### Tracking progress

`tasks.md` steps are Markdown checkboxes: `- [ ]` for a pending step, flipped to `- [x]` in
place as it completes. The plan is a live document, not a record written once.

## Before writing tasks: map the files

List what gets created and modified, and what each file is responsible for. This is where
decomposition gets decided, so decide it deliberately:

- One clear responsibility per file. Files that change together belong together.
- Split by responsibility, not by technical layer.
- Follow the codebase's existing structure. If a file you are touching has grown unwieldy,
  including a split is reasonable — unrelated restructuring is not.

## plan.md shape

```markdown
# <Feature> — Plan

## Approach
2–3 sentences on the shape of the change.

## Tech stack
Key technologies — only where they are not obvious from the repo.

## Global constraints
- Project-wide requirements — version floors, dependency limits, platform rules,
  one line each, values copied exactly from requirements.md. Every task inherits these.

## Files
- Create / Modify / Remove — exact paths and the responsibility of each.

## Risks & edge cases
- ...

## Test strategy
What will be tested and how it is proven.
```

## tasks.md shape

A task is the smallest unit that carries its own test cycle and deserves a reviewer's yes or no.
Fold setup, configuration and documentation into the task whose deliverable needs them. Split
only where a reviewer could sensibly accept one task and reject the next. Every task ends with
something independently testable. Each **step** is one action, two to five minutes.

```markdown
# <Feature> — Tasks

## Task 1: <name>
Files: create `exact/path.js`, modify `exact/existing.js:123-145`, test `test/path.test.js`
Consumes: what earlier tasks provide — exact signatures
Produces: what later tasks rely on — exact names and types

- [ ] Step 1: write the failing test (show the test code)
- [ ] Step 2: run it, confirm it FAILS — show the command and the expected message
- [ ] Step 3: write the minimal implementation (show it)
- [ ] Step 4: run it, confirm it PASSES
- [ ] Step 5: commit
```

The **Consumes / Produces** lines matter: a task's implementer sees only their own task, so this
is how they learn the names and types their neighbours use.

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

Say where `plan.md` and `tasks.md` are saved and confirm the execution approach before starting:
task-by-task with review between, or straight through with checkpoints.
