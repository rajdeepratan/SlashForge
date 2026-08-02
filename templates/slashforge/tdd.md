---
name: /slashforge:tdd
description: Write the test first, watch it fail, then write the minimal code to pass. Use when implementing any feature, bugfix, or behaviour change, before writing implementation code.
---

<!--
Adapted from the `test-driven-development` skill in superpowers.
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

# Test-Driven Development

Write the test. Watch it fail. Write the minimal code to pass.

**If you did not watch it fail, you do not know it tests the right thing.**

## The rule

> **No production code without a failing test first.**

Wrote the code before the test? Delete it and start from the test. Not "keep it as reference",
not "adapt it while writing tests" — those are both testing afterwards, with the answer already
in front of you. Delete means delete.

## The cycle

**RED — write one failing test.** One behaviour, named for what it does. Test real code; reach
for mocks only when there is no alternative.

```js
test('retries a failed operation three times', async () => {
  let attempts = 0;
  const op = () => { attempts++; if (attempts < 3) throw new Error('fail'); return 'ok'; };
  assert.equal(await retryOperation(op), 'ok');
  assert.equal(attempts, 3);
});
```

Not `test('retry works')` asserting on a mock's call count — that tests the mock, not your code.

**Verify RED — watch it fail.** Mandatory, never skipped. Confirm it *fails* rather than
*errors*, that the message is the one you expected, and that it fails because the feature is
missing rather than because of a typo.

- Passes already? You are testing behaviour that exists. The test is wrong.
- Errors instead of failing? Fix the error and re-run until it fails properly.

**GREEN — write the simplest code that passes.** No extra options, no configurability nobody
asked for, no refactoring of neighbouring code.

**Verify GREEN — watch it pass.** Confirm the test passes, the rest of the suite still passes,
and the output is clean. If the test fails, fix the code — not the test.

**REFACTOR — only once green.** Remove duplication, improve names, extract helpers. Keep the
tests green and do not add behaviour.

Then repeat with the next test.

## What makes a test good

| | Good | Bad |
|---|---|---|
| **Minimal** | One behaviour. "and" in the name means split it. | `test('validates email and domain and whitespace')` |
| **Clear** | The name describes the behaviour | `test('test1')` |
| **Honest** | Asserts on real behaviour | Asserts on what a mock was called with |

Before writing a test, name the production change that would make it fail. If you cannot, the
test is not testing anything.

## Rationalisations, answered

| Excuse | Reality |
|---|---|
| "Too simple to test" | Simple code breaks. The test takes thirty seconds. |
| "I'll test after" | Tests written after pass immediately, which proves nothing. You never watched it fail, so you never proved it can catch the bug. |
| "Tests after achieve the same thing" | Tests-after ask "what does this do?". Tests-first ask "what should this do?". The second finds cases you would not have remembered. |
| "I already tested it manually" | No record of what you covered, no way to re-run it, easy to skip under pressure. |
| "Deleting hours of work is wasteful" | That time is spent either way. The choice is rewriting with confidence or keeping code you cannot trust. |
| "I'll keep it as reference" | You will adapt it. That is testing after. |
| "I need to explore first" | Fine — explore, throw it away, then start with TDD. |
| "This is hard to test" | Listen to that. Hard to test usually means hard to use. |
| "TDD will slow me down" | Debugging it in production is slower. |
| "The existing code has no tests" | You are improving it. Add them. |

## Stop signals

Code written before a test. A test that passes the first time. Not being able to explain why
the test failed. Tests deferred to "later". Any sentence beginning "just this once".

## Exceptions

Throwaway prototypes, generated code, and pure configuration. Ask the user rather than
deciding unilaterally — and "this feels like an exception" usually is not one.
