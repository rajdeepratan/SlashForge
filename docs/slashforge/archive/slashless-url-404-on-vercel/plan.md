# Slashless URLs 404 on Vercel — Plan

## Approach
Keep `build.format: 'file'`, and make the file-format output reachable at its
extensionless URL by enabling Vercel Clean URLs. Add `docs/vercel.json` with
`cleanUrls: true` and `trailingSlash: false`, and guard the pairing with a
regression test so file-format output can never ship again without Clean URLs.

## Global constraints
- Zero runtime dependencies — tests use `node:test` + `node:assert` only.
- `docs/vercel.json` must sit at the Vercel project root. This plan assumes the
  Vercel Root Directory is `docs/` (output `dist`), consistent with
  `outDir: ./dist/slashforge` serving at `/slashforge`. **Verify post-deploy.**

## Files
- **Create** `docs/vercel.json` — `{ "cleanUrls": true, "trailingSlash": false }`.
  Makes Vercel serve `guides/x.html` at `/guides/x` and drop trailing slashes.
- **Create** `test/docs-serving.test.js` — regression guard: if
  `docs/astro.config.mjs` uses `build.format: 'file'`, then `docs/vercel.json`
  must exist with `cleanUrls === true` and `trailingSlash === false`.
- No change to `docs/astro.config.mjs` or `docs/src/components/Head.astro` —
  the slashless links/canonical are already correct; only the serving layer was
  missing. (Both remain in scope should the test reveal a mismatch.)

## Risks & edge cases
- **Vercel Root Directory assumption.** If the project root is the repo root (not
  `docs/`), the file must live at repo-root `vercel.json` instead. Only provable
  by deploying; the curl probes below confirm it.
- **The regression test is a config-consistency proxy**, not a live-serving test
  (Vercel behaviour is not reproducible locally). It encodes the exact rule whose
  violation caused the 404, so it guards against recurrence, but green locally
  does not prove the deploy is fixed — the curl probes do.
- **Landing page.** `cleanUrls` must not break `/slashforge` (currently 200).
  Verify it still serves after deploy.

## Test strategy
`test/docs-serving.test.js` under the root `npm test` suite (CI-gated). It reads
`docs/astro.config.mjs` and `docs/vercel.json` via `fs` — no build, no extra deps.
It FAILS now (file format, no vercel.json) and PASSES after the fix. Post-deploy,
re-run the four curl probes from the investigation; all should be 200 except the
trailing-slash 308 that must land on a 200.
