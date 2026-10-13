# Slashless URLs 404 on Vercel — Tasks

## Task 1: regression test (write first, must fail)
Files: create `test/docs-serving.test.js`
Produces: the invariant "file-format output requires Vercel Clean URLs"

- [ ] Step 1: write the test — read `docs/astro.config.mjs`; if it contains
      `format: 'file'`, assert `docs/vercel.json` exists and parses with
      `cleanUrls === true` and `trailingSlash === false`.
- [ ] Step 2: run `node --test test/docs-serving.test.js`, confirm it FAILS
      (expected: vercel.json missing).

## Task 2: fix (add the serving config)
Files: create `docs/vercel.json`
Consumes: the invariant from Task 1

- [ ] Step 3: write `docs/vercel.json` → `{ "cleanUrls": true, "trailingSlash": false }`.
- [ ] Step 4: run `node --test test/docs-serving.test.js`, confirm it PASSES.
- [ ] Step 5: run the full root suite `npm test`, plus `cd docs && npm run build`
      and the five `check-docs-*.mjs` scripts — all green.

## Task 3: verify (Phase 6 + post-deploy)
- [ ] Step 6: confirm the diff since the branch point adds a test file (Phase 6 gate).
- [ ] Step 7 (post-deploy, manual): re-run the four curl probes; all 200 except
      the trailing-slash 308 landing on a 200.
