---
name: /slashforge:debug
description: Find the root cause before proposing any fix. Use for any bug, test failure, or unexpected behaviour — especially when the fix looks obvious or time is short. Requires a reproduction and a failing regression test before code changes.
---

<!--
Adapted from the `systematic-debugging` skill in superpowers.
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

# Debug Systematically

**Find the root cause before attempting any fix. A fix for the symptom is a failure.**

## The rule

> **No fix without root-cause investigation first.**

Until you can say *what* is happening and *why*, you are guessing. A guess that makes the
symptom disappear is worse than no fix, because it looks finished.

## Phase 1 — Find the root cause

**Read the error properly.** All of it. The stack trace, the line numbers, the exit code.
Errors frequently contain the answer, and skipping past them is the most common way to waste
an hour.

**Reproduce it reliably.** What exact steps trigger it? Does it happen every time? If you
cannot reproduce it, gather more data — do not start changing code to see what helps.

**Check what changed.** Recent commits, dependency bumps, config edits, environment
differences. `git log` and `git diff` answer this faster than reasoning does.

**Instrument the boundaries.** When several components are involved — CI to build to deploy,
request to service to database — log what enters and leaves each one, then run it once. That
tells you *which* component fails before you start investigating any of them. Guessing which
layer is at fault, and being wrong, is where the time goes.

**Trace backwards from the bad value.** Where did it originate? What passed it in? Keep
walking up until you reach the source. Fix it there, not where it surfaced.

## Phase 2 — Compare against what works

Find similar code in the same codebase that works correctly. List every difference between it
and the broken path, however irrelevant it seems — "that can't matter" is a hypothesis, not a
fact. If you are following a reference implementation, read it completely rather than skimming
for the parts you expect to need.

## Phase 3 — One hypothesis at a time

State it plainly: *"I think X is the root cause, because Y."* Then make the smallest change
that would test it. One variable. If you were right, continue. If you were wrong, form a new
hypothesis — do not layer another fix on top of the last one.

If you do not understand something, say so. A stated gap is useful; a confident guess is not.

## Phase 4 — Fix the cause

1. **Write the failing test first.** Simplest reproduction that captures the bug.
2. **Watch it fail**, and check it fails for the right reason.
3. **Fix the root cause.** One change. No "while I'm here" improvements, no bundled
   refactoring.
4. **Watch it pass**, and confirm nothing else broke.

For work already committed, prove the test is real by reverting the fix, running the test,
confirming it fails, then restoring.

## When three fixes have failed

Stop. Do not attempt a fourth.

Three failed fixes is not bad luck — it is a signal the architecture is wrong. Look for the
pattern: does each fix reveal a new problem somewhere else? Does each one require "just a bit
more refactoring"? Then the shape is wrong, and more fixes will keep finding new symptoms.

Raise it with the user before continuing.

## Rationalisations, answered

| Excuse | Reality |
|---|---|
| "It's simple, I don't need the process" | Simple bugs have root causes too. The process is fast on simple bugs. |
| "Emergency, no time" | Systematic is faster than guess-and-check. Thrashing is what costs time. |
| "Let me try this first, then investigate" | The first fix sets the pattern. Start correctly. |
| "It's probably X, let me fix that" | "Probably" means you have not checked. |
| "I'll write the test after confirming the fix" | A test that never failed proves nothing. |
| "Multiple fixes at once saves time" | Then you cannot tell which one worked. |
| "I don't fully understand it but this might work" | Say the first half out loud. That is the useful part. |

## Stop signals

You are rationalising if you catch yourself thinking: *quick fix for now*, *just try changing
X*, *skip the test, I'll verify manually*, or *one more fix attempt* after two have failed.
Any of those means going back to Phase 1.

## When there genuinely is no root cause

Occasionally an issue really is environmental, timing-dependent, or external. If systematic
investigation lands there: document what you ruled out, implement appropriate handling — a
retry, a timeout, a clearer error — and add logging for next time.

But hold that conclusion loosely. Most "no root cause" findings are incomplete investigations.
