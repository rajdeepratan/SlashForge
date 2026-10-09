# Command lists that still stop at six/four — Tasks

Execution: task-by-task, `npm test` green at the end, with a review between.
Task 1 (regression test, must fail) → Task 2 (install.js patch, test goes green)
→ Task 3 (docs tiles). Tasks 1→2 are ordered (2 makes 1 pass); 3 is independent.

---

## Task 1: regression test — closing message lists every command
Files: modify `test/install.test.js` (near the existing summary test at L2720;
also fix the stale comment L2594 + test name L2596)
Consumes: exported `COMMAND_FILES` and `commandName` from `bin/install.js` (already imported by this test file)
Produces: a failing test proving the closing message omits `/slashforge-test` and `/slashforge-refactor`

- [ ] Step 1: add this test after the existing `'the install summary names all three agents'` test:
  ```js
  test('the install summary lists every shipped command', () => {
    const home = tmp();
    const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
    const out = execFileSync('node', [BIN, '--yes'], { env, encoding: 'utf8' });
    const start = out.indexOf('Open Claude Code, Cursor or Codex in any repo');
    assert.ok(start !== -1, 'closing message block must be present');
    const summary = out.slice(start);
    for (const c of COMMAND_FILES) {
      const name = commandName(c); // e.g. /slashforge-test
      assert.ok(summary.includes(name), `closing message must list ${name}`);
    }
  });
  ```
- [ ] Step 2: run `node --test test/install.test.js` — confirm the NEW test FAILS with
  `closing message must list /slashforge-test` (refactor likewise). The rest of the file stays green.
- [ ] Step 3: in the same file, fix the stale wording (no behaviour change): change the comment at
  L2594 from "The four commands must run only when the user types them." to "These commands must run
  only when the user types them." and rename the test at L2596 from
  `'the four commands run only when typed on Cursor and Codex'` to
  `'the commands run only when typed on Cursor and Codex'`.
- [ ] Step 4: `git add -A` is **not** run yet — Task 2 commits together after green.

## Task 2: patch install.js — closing message + stale comment
Files: modify `bin/install.js` (closing message L1199-1205; comment L545)
Consumes: Task 1's failing test
Produces: closing message naming all eight commands; count-agnostic comment; Task 1 test green

- [ ] Step 5: in the closing-message block (after the `/slashforge-review-pr` bullet at L1205), add:
  ```js
  console.log('  • /slashforge-test [file|glob] — generate spec-based test coverage for existing files (no branch, no PR)');
  console.log('  • /slashforge-refactor [file|glob] — zero-functional-change refactor, gated by the suite passing before and after');
  ```
- [ ] Step 6: change the comment at L545 from
  `// relevant. The four commands must run only when the user types them: Cursor` to
  `// relevant. These commands must run only when the user types them: Cursor`.
- [ ] Step 7: run `node --test test/install.test.js` — confirm the Task 1 test now PASSES and the whole file is green.
- [ ] Step 8: run `npm test` (full suite) — all green, including the pinned-render test (unchanged, since no template output changed).
- [ ] Step 9: commit `fix(install): list all eight commands in the closing message; drop stale "four" wording`.

## Task 3: homepage cost tiles — add test + refactor
Files: modify `docs/src/pages/index.astro` (`costs` array L115-146)
Consumes: nothing
Produces: cost tiles covering `/slashforge-test` and `/slashforge-refactor` (plus fix/resume if the gate approves)

- [ ] Step 10: append to the `costs` array (values/labels subject to the gate's decision):
  ```js
  {
    label: 'Covering a file (test)',
    value: '15–50k',
    note: 'Discovers your framework, writes and runs spec-based tests for the targeted files, then reports. No branch, no PR.',
  },
  {
    label: 'Refactoring',
    value: '40–120k',
    note: 'Zero functional change, gated by the suite passing with identical results before and after.',
  },
  ```
- [ ] Step 11: from `docs/`, run `npm run build`, then the five `check-docs-*.mjs` scripts — all pass.
- [ ] Step 12: do NOT commit a macOS-only `docs/package-lock.json` (CI `npm ci` needs Linux optionals) — only `index.astro` should be staged from the docs workspace.
- [ ] Step 13: commit `docs(site): add /slashforge-test and /slashforge-refactor cost tiles`.
