---
name: /slashforge:parallel
<!--target:claude-->
description: Execute an approved plan by dispatching one agent per task, reviewing between each. Use only when the plan has two or more genuinely independent units — tasks that share no state and no ordering.
<!--/target-->
<!--target:agents-->
description: Execute an approved plan one task at a time, with clean context per task and a review between each. Use only when the plan has two or more genuinely independent units — tasks that share no state and no ordering.
<!--/target-->
---

<!--
Adapted from the `subagent-driven-development` skill in superpowers.
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

<!--target:claude-->
# Parallel Task Execution

One fresh agent per task. Review between each. The coordinator holds the plan; the agents hold
only their own task.
<!--/target-->
<!--target:agents-->
# Sequential Task Execution

One task at a time, each started with clean context. Review between each. You hold the plan; each
task sees only itself.
<!--/target-->

## The test for "independent"

<!--target:claude-->
Before dispatching anything, prove the tasks are actually independent. Two tasks qualify only if:
<!--/target-->
<!--target:agents-->
Before starting anything, prove the tasks are actually independent. Two tasks qualify only if:
<!--/target-->

- Neither reads a file the other writes.
- Neither needs a name, signature or type the other introduces.
- Either could be reverted without touching the other.

<!--target:claude-->
**If any pair fails, run them in order instead.** A plan that looks parallel but is not produces
merge conflicts and two agents confidently implementing incompatible halves of one interface. That
costs far more than running them sequentially would have.

Most plans are not parallel. Sequential is the honest default.
<!--/target-->
<!--target:agents-->
**If any pair fails, treat the work as one unit instead.** A plan that looks independent but is not
produces two confidently implemented, incompatible halves of one interface — and finding that out
late costs far more than writing it as one task would have.

Most plans are not independent. A single ordered pass is the honest default.
<!--/target-->

<!--target:claude-->
## Why fresh agents

Each agent gets **only its own task**, never your session history. That is the point, not a
limitation:

- It cannot absorb your assumptions, so it implements what the task says — which is how you find
  out the task was ambiguous.
- Its context stays small enough to hold the whole task at once.
- Your coordinating context does not fill up with implementation detail you will never need again.

This is why the plan's **Interfaces** block matters. An agent sees no neighbouring task, so exact
names and types have to be written down or they do not reach it.
<!--/target-->
<!--target:agents-->
## Why clean context per task

Work each task from **only its own text**, not from the accumulated conversation. That is the
point, not a limitation:

- You cannot lean on assumptions that were never written down, so you implement what the task says
  — which is how you find out the task was ambiguous.
- The working context stays small enough to hold the whole task at once.
- Detail from a finished task does not leak into the next one.

This is why the plan's **Interfaces** block matters. A task must stand on its own text, so exact
names and types have to be written down or they are not there when you need them.
<!--/target-->

<!--target:claude-->
## Dispatching

For each task, hand over exactly:

1. The task's full text from the plan — files, interfaces, steps, verbatim.
2. The plan's **Global constraints** section. Every task inherits it.
3. Where the repo is and how to run its tests.

Nothing else. No summary of the conversation, no "we decided earlier that…". If the agent needs
it, the plan is missing it, and that is worth knowing now.

Each agent works its own task test-first, exactly as `slashforge:tdd` describes.
<!--/target-->
<!--target:agents-->
## Working each task

For each task, work from exactly:

1. The task's full text from the plan — files, interfaces, steps, verbatim.
2. The plan's **Global constraints** section. Every task inherits it.
3. Where the repo is and how to run its tests.

Nothing else. No "we decided earlier that…". If you find yourself needing it, the plan is missing
it, and that is worth knowing now — add it to the plan rather than carrying it in your head.

Work each task test-first, exactly as `slashforge:tdd` describes.
<!--/target-->

## Reviewing between tasks

<!--target:claude-->
**Do not dispatch the next task until the last one is reviewed.** Parallel dispatch of independent
tasks is fine; skipping the checkpoint is not.

For each returned task:

- **Read the diff.** Not the agent's summary of the diff. An agent reporting success and a diff
  showing the work are different claims, and only one is evidence.
- **Run the tests yourself.** Same reason.
- **Check it did the task and only the task.** Scope creep from an agent is common, because it sees
  a small slice and improvises around the edges.

If a task comes back wrong, fix the *task* before re-dispatching. A vague task will produce a
second wrong implementation just as confidently as the first.
<!--/target-->
<!--target:agents-->
**Do not start the next task until the last one is reviewed.** Working straight through without the
checkpoint is what this flow exists to prevent.

After each task:

- **Read the diff.** Not your recollection of what you just wrote. Having implemented it and having
  evidence it is correct are different claims, and only one is evidence.
- **Run the tests.** Same reason.
- **Check it did the task and only the task.** Improvising around the edges of a small slice is easy
  to do and easy to miss.

If a task comes out wrong, fix the *task* before redoing it. A vague task will produce a second
wrong implementation just as confidently as the first.
<!--/target-->

## When to stop and re-plan

<!--target:claude-->
Two signals, both meaning the plan is wrong rather than the agent:

- Two agents touched the same file. The independence test was wrong — merge by hand, then re-split
  the remaining work.
- An agent asks for something no task defines. The interface was never written down; add it to the
  plan rather than answering ad hoc, or the next agent hits the same wall.
<!--/target-->
<!--target:agents-->
Two signals, both meaning the plan is wrong rather than the work:

- Two tasks touched the same file. The independence test was wrong — reconcile them, then re-split
  the remaining work.
- A task needs something no task defines. The interface was never written down; add it to the plan
  rather than deciding ad hoc, or the next task hits the same wall.
<!--/target-->

## Cost

<!--target:claude-->
A fresh agent re-reads the files it needs, so parallel execution costs more tokens than doing the
work inline — sometimes considerably. It buys wall-clock time on genuinely independent work and a
coordinator context that stays clear.

For two or three small tasks, inline is usually cheaper and simpler. Say so rather than
parallelising because the plan happened to be numbered.
<!--/target-->
<!--target:agents-->
Starting each task from its own text means re-reading the files it needs, so this costs more tokens
than working straight through. There is no wall-clock saving — the tasks run in sequence. What it
buys is a contained context per task and a real review between units.

For two or three small tasks, working straight through is usually cheaper and simpler. Say so
rather than splitting because the plan happened to be numbered.
<!--/target-->
