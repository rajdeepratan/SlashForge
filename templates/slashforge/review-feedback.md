---
name: /slashforge:review-feedback
description: Evaluate code review feedback technically before implementing any of it. Use when receiving review comments, especially if a suggestion seems unclear or wrong — requires verification and reasoned pushback, not agreement.
---

<!--
Adapted from the `receiving-code-review` skill in superpowers.
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

# Receiving Code Review

Review feedback is a technical claim to evaluate, not a verdict to accept.

**Verify before implementing. Ask before assuming. Technical correctness over social comfort.**

## The sequence

1. **Read all of it** before reacting to any of it.
2. **Restate** each item in your own words — or ask, if you cannot.
3. **Verify** it against the actual codebase.
4. **Evaluate**: is this correct *for this codebase*?
5. **Respond**: technical acknowledgement, or reasoned pushback.
6. **Implement** one item at a time, testing each.

## Do not perform agreement

Skip "You're absolutely right!", "Great point!", "Excellent catch!". They add nothing, and
saying them before verification means agreeing to something you have not checked.

Instead: restate the technical requirement, ask the clarifying question, push back with
reasoning, or simply start working. Actions communicate more than acknowledgement does.

## When any item is unclear

Stop. Implement nothing yet, and ask about the unclear items first.

Review items are frequently related — partial understanding produces a confidently wrong
implementation of the parts you thought you understood. If you understand items 1, 2, 3 and 6
but not 4 and 5, say exactly that before touching anything.

## Judging a suggestion

Before implementing feedback from someone outside the immediate work, check: is it correct for
*this* codebase? Would it break existing behaviour? Is there a reason the current
implementation is the way it is? Does it hold on every platform and version you support? Does
the reviewer have the full context?

If it seems wrong, push back with the technical reasoning. If you cannot verify it, say so
plainly: *"I can't confirm this without X — should I investigate, or proceed as-is?"*

Feedback from the person you are working with is trusted and usually implemented directly —
but ask when the scope is unclear, and still skip the performative agreement.

## Sorting the feedback

Group items before starting:

- **Must fix** — blocking. Correctness, security, breakage.
- **Should fix** — quality and convention. Do them unless there is a reason not to.
- **Discuss** — opinion or a decision that is not yours alone. Summarise and ask before
  changing code.

## After implementing

Re-run the verification for the work, not just the changed lines. Feedback applied without a
fresh test run is an unverified claim like any other.

If the same comments remain unresolved after two attempts, stop and escalate rather than
trying a third time — repeated misses usually mean the requirement was misunderstood, not
mis-implemented.
