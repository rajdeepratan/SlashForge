---
name: /slashforge:verify
description: Evidence before claims. Use before stating that anything is done, fixed, passing, or ready — and before committing, opening a PR, or handing off. Requires running the verification command and reading its output first.
---

<!--
Adapted from the `verification-before-completion` skill in superpowers.
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

# Verify Before Claiming

**Evidence before claims. Always.**

## The rule

> **No completion claim without fresh verification evidence.**

If you have not run the verification command **in this message**, you cannot say it passes.
Not "should pass". Not "looks right". You run it, you read the output, then you speak.

## The gate

Before stating any status, or expressing any satisfaction:

1. **Identify** — what exact command proves this claim?
2. **Run** — execute it fresh and in full. Not a subset, not a remembered earlier run.
3. **Read** — the whole output. Check the exit code. Count the failures.
4. **Decide** — does the output actually confirm the claim?
   - No → state the real status, with the output.
   - Yes → state the claim, with the output.
5. **Only then** speak.

Skipping a step is not a shortcut. It is claiming something you have not checked.

## What each claim actually requires

| Claim | Requires | Not sufficient |
|---|---|---|
| Tests pass | Test command output, 0 failures | An earlier run; "should pass" |
| Linter clean | Linter output, 0 errors | Checking part of the tree |
| Build succeeds | Build command, exit 0 | Linter passing; logs looking fine |
| Bug fixed | The original symptom retested | Code changed; assumed fixed |
| Regression test works | Red→green actually observed | The test passing once |
| Requirements met | Each one checked off individually | Tests passing |
| Subagent finished | The diff read | The agent reporting success |

## Regression tests: red→green or it proves nothing

A regression test that has never failed is not evidence. Prove it fails without the fix:

```
write the test → run it → it FAILS → apply the fix → run it → it PASSES
```

If it passed before the fix, it does not cover the bug. Fix the test first.

For work already committed, revert the fix, run the test, confirm it fails, restore, confirm it passes.

## Stop signals

These mean you are about to claim something unverified:

- "should", "probably", "seems to", "looks right"
- Satisfaction before evidence — "Great!", "Perfect!", "Done!"
- About to commit, push, or open a PR without a fresh run
- Trusting a subagent's success report over the diff
- "Partial check is enough"
- "Just this once" — especially when tired or hurried

## Rationalisations, answered

| Excuse | Reality |
|---|---|
| "Should work now" | Then run it and find out. |
| "I'm confident" | Confidence is not evidence. |
| "Just this once" | There are no exceptions. That is what makes it a rule. |
| "The linter passed" | The linter does not compile, and does not test. |
| "The agent said success" | Verify independently. Read the diff. |
| "It's a tiny change" | Tiny changes break builds constantly. |
| "I'm short on time" | A false claim costs more time than the check. |
| "Different wording, so the rule doesn't apply" | The rule is about the claim, not the phrasing. |

## Reporting honestly

State what you ran and what came back:

- ✅ *"29/29 tests pass, docs build exit 0."* — after running both.
- ❌ *"Everything should be working now."* — after running neither.

Partial success is reported as partial. If three of four checks pass, say which one did not
and what it said. A qualified true statement is worth more than a confident false one.

## When this applies

Before **any** claim of completion or correctness — including paraphrases and implications.
Before committing, pushing, opening a PR, marking a task done, or handing to another agent.

Notably: this applies to the claim, not the word. Rewording "it passes" as "that should be
sorted" does not exempt it.
