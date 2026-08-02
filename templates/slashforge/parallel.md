---
name: /slashforge:parallel
description: Execute an approved plan by dispatching one agent per task, reviewing between each. Use only when the plan has two or more genuinely independent units — tasks that share no state and no ordering.
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

# Parallel Task Execution

One fresh agent per task. Review between each. The coordinator holds the plan; the agents hold
only their own task.

## The test for "independent"

Before dispatching anything, prove the tasks are actually independent. Two tasks qualify only if:

- Neither reads a file the other writes.
- Neither needs a name, signature or type the other introduces.
- Either could be reverted without touching the other.

**If any pair fails, run them in order instead.** A plan that looks parallel but is not produces
merge conflicts and two agents confidently implementing incompatible halves of one interface. That
costs far more than running them sequentially would have.

Most plans are not parallel. Sequential is the honest default.

## Why fresh agents

Each agent gets **only its own task**, never your session history. That is the point, not a
limitation:

- It cannot absorb your assumptions, so it implements what the task says — which is how you find
  out the task was ambiguous.
- Its context stays small enough to hold the whole task at once.
- Your coordinating context does not fill up with implementation detail you will never need again.

This is why the plan's **Interfaces** block matters. An agent sees no neighbouring task, so exact
names and types have to be written down or they do not reach it.

## Dispatching

For each task, hand over exactly:

1. The task's full text from the plan — files, interfaces, steps, verbatim.
2. The plan's **Global constraints** section. Every task inherits it.
3. Where the repo is and how to run its tests.

Nothing else. No summary of the conversation, no "we decided earlier that…". If the agent needs
it, the plan is missing it, and that is worth knowing now.

Each agent works its own task test-first, exactly as `slashforge:tdd` describes.

## Reviewing between tasks

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

## When to stop and re-plan

Two signals, both meaning the plan is wrong rather than the agent:

- Two agents touched the same file. The independence test was wrong — merge by hand, then re-split
  the remaining work.
- An agent asks for something no task defines. The interface was never written down; add it to the
  plan rather than answering ad hoc, or the next agent hits the same wall.

## Cost

A fresh agent re-reads the files it needs, so parallel execution costs more tokens than doing the
work inline — sometimes considerably. It buys wall-clock time on genuinely independent work and a
coordinator context that stays clear.

For two or three small tasks, inline is usually cheaper and simpler. Say so rather than
parallelising because the plan happened to be numbered.
