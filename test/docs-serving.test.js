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
// So the two layers must agree: if Astro ships file-format output, the Vercel
// config must turn Clean URLs on (and drop trailing slashes, matching the
// site's slashless canonical). This test fails the moment that pairing breaks.
test('file-format output ships with Vercel Clean URLs', () => {
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
  assert.strictEqual(
    vercel.trailingSlash,
    false,
    'docs/vercel.json must set "trailingSlash": false to match the slashless canonical'
  );
});
