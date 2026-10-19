const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Pure-fs content test (no docs deps), so it runs in the root `npm test` like
// test/docs-lede.test.js. Cursor has no built-in /init, so on the "Plan mode
// and /init" guide its H1 and sidebar label should read just "Plan mode" while
// Claude and Codex keep the full title. The canonical frontmatter `title` stays
// "Plan mode and /init" (the SEO <title> and routing source).

const ROOT = path.join(__dirname, '..');
const PAGE = path.join(
  ROOT, 'docs', 'src', 'content', 'docs', 'guides', 'plan-mode.md',
);
const NAV = path.join(ROOT, 'docs', 'src', 'nav.ts');
const ASTRO_CONFIG = path.join(ROOT, 'docs', 'astro.config.mjs');

function frontmatter() {
  const src = fs.readFileSync(PAGE, 'utf8');
  const m = /^---\n([\s\S]*?)\n---/.exec(src);
  assert.ok(m, 'plan-mode.md must have frontmatter');
  return m[1];
}

test('the plan-mode H1 drops /init for Cursor but stays canonical for SEO', () => {
  const fm = frontmatter();

  // Canonical title is unchanged — it is the SEO <title> and routing source.
  assert.match(
    fm, /^title:\s*Plan mode and \/init\s*$/m,
    'canonical `title` must remain "Plan mode and /init"',
  );

  // A per-agent `titles` map drives the H1 so it can switch with the agent.
  assert.match(fm, /^titles:/m, 'frontmatter must declare a per-agent `titles` map');

  // Cursor gets the /init-free heading.
  assert.match(
    fm, /^\s{2,}cursor:\s*Plan mode\s*$/m,
    'titles.cursor must be exactly "Plan mode"',
  );
});

test('the plan-mode sidebar label drops /init for Cursor', () => {
  const nav = fs.readFileSync(NAV, 'utf8');

  // The nav item for the guide, by its slug, must carry a per-agent label
  // override setting Cursor to "Plan mode".
  const line = nav
    .split(/\r?\n/)
    .find((l) => l.includes("slug: 'guides/plan-mode'"));
  assert.ok(line, 'nav.ts must contain the plan-mode item');
  assert.match(
    line, /labels:\s*\{[^}]*cursor:\s*'Plan mode'/,
    'the plan-mode nav item must set labels.cursor to "Plan mode"',
  );
});

test('the old plan-mode-and-init URL still redirects after the slug rename', () => {
  const cfg = fs.readFileSync(ASTRO_CONFIG, 'utf8');
  // The page is live, so the previous slug must keep resolving (meta-refresh
  // redirect) rather than 404 for anyone holding the link.
  const line = cfg
    .split(/\r?\n/)
    .find((l) => l.includes("'/guides/plan-mode-and-init'"));
  assert.ok(line, 'astro.config must redirect the old /guides/plan-mode-and-init URL');
  assert.match(
    line, /guides\/plan-mode`/,
    'the redirect target must be the new guides/plan-mode slug',
  );
});
