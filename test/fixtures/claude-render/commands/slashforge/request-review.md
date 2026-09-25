---
name: /slashforge:request-review
description: Get your own work reviewed before it goes out — by a fresh reviewer with crafted context, not your session history. Use after implementing, before pushing or opening a PR.
---

<!--
Adapted from the `requesting-code-review` skill in superpowers.
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

# Requesting a Review of Your Own Work

Review early, review often. The person who wrote the code is the worst judge of whether it is
clear — they can see what they meant.

This is for **your own work before it ships**. For someone else's pull request use
`/slashforge:review-pr`; for handling comments you received, `slashforge:review-feedback`.

## Give the reviewer crafted context, never your session history

Hand over:

1. **What you built**, in two or three sentences.
2. **What it was supposed to do** — the approved plan or task, verbatim.
3. **The diff to review** — a base and head commit, or the changed files.

Deliberately withhold your reasoning, the paths you rejected, and the conversation that got here.
A reviewer given your justifications reviews the justification. A reviewer given the code reviews
the code — and any gap between what you meant and what you wrote shows up as a question, which is
exactly the signal worth having.

## What the review must cover

- **Matches the plan** — nothing missing, nothing extra. Scope creep is a finding.
- **No duplicate or dead code**, no debug leftovers, no hardcoded secrets.
- **No unintended breaking changes** to public APIs, exports, or shared interfaces.
- **Follows `.claude/rules/`** and the conventions already in the surrounding code.
- **Production-ready** — error handling at boundaries, no unsafe assumptions about input,
  ordering, or nullability.
- **For a bug fix** — the root cause is addressed rather than the symptom, and the regression test
  genuinely fails without the fix.

## Acting on what comes back

Sort by severity and act in order:

- **Critical** — fix now, before anything else.
- **Important** — fix before proceeding to push or PR.
- **Minor** — note it; fix if cheap, otherwise say you are deferring it and why.

**Push back when the reviewer is wrong.** A review is a technical claim, not a verdict. If a
finding does not hold for this codebase, say so with the reasoning and the code that proves it.
Silent compliance with a wrong finding makes the code worse and teaches nothing.

Re-run the verification after applying fixes — `slashforge:verify`. Changes made in response to
review are still changes, and a fix applied without a fresh test run is an unverified claim like
any other.

## When it fails repeatedly

If the same work fails review three times, stop looping and escalate. List the outstanding issues
and ask the user how to proceed. Three failures usually means the plan was wrong, not the
implementation — and a fourth attempt at the implementation will not find that out.
