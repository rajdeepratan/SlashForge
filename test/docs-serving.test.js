const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

// Regression guard for the slashless-url-404-on-vercel bug.
//
// `build.format: 'file'` emits named `guides/x.html` files with no
// `guides/x/index.html` directory. Vercel serves those at the extensionless
// URL (what every in-site link and the canonical now point to) ONLY when the
// project has Clean URLs enabled. Without it, every nested page 404s while the
// `.html` path 200s — which is exactly what took the live docs down.
//
// A second trap sits right next to it: `trailingSlash: false` must NOT be set.
// The landing page is the one directory index in the output
// (`dist/slashforge/index.html`), so `/slashforge` is a directory. Vercel
// serves a directory with a trailing slash; `trailingSlash: false` forces the
// slash back off, and the two fight as an infinite `/slashforge -> /slashforge`
// redirect that takes the landing page down. Clean URLs alone fixes the nested
// pages without looping the landing.
//
// So, when Astro ships file-format output: Clean URLs on, trailing-slash
// enforcement off. This test fails the moment either half drifts.
test('file-format output ships with Vercel Clean URLs and no trailing-slash enforcement', () => {
  const astroConfig = read('docs/astro.config.mjs');
  const usesFileFormat = /format:\s*['"]file['"]/.test(astroConfig);

  if (!usesFileFormat) {
    // Directory format resolves extensionless on Vercel natively, so the
    // Clean-URLs pairing is not required. Nothing to assert.
    return;
  }

  const vercelPath = path.join(__dirname, '..', 'docs/vercel.json');
  assert.ok(
    fs.existsSync(vercelPath),
    'docs/vercel.json must exist when astro.config.mjs uses build.format "file"'
  );

  let vercel;
  assert.doesNotThrow(() => {
    vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  }, 'docs/vercel.json must be valid JSON');

  assert.strictEqual(
    vercel.cleanUrls,
    true,
    'docs/vercel.json must set "cleanUrls": true so file-format pages resolve extensionless'
  );
  assert.notStrictEqual(
    vercel.trailingSlash,
    false,
    'docs/vercel.json must NOT set "trailingSlash": false — it loops the landing page (/slashforge -> /slashforge)'
  );
});
