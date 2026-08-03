#!/usr/bin/env node
/**
 * Fails if a published version string in the built docs disagrees with package.json.
 *
 * The site restated its version by hand in two places — the hero fact chips and
 * the shared footer — and both froze at v4.0.1 while npm served 4.3.1.
 * Seventeen stale strings across sixteen pages, live, for six releases. The
 * values are derived now, so this should always pass; its job is to fail if
 * anyone writes one by hand again.
 *
 * Run from docs/ after `npm run build`.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error(`::error::${DIST}/ not found — run the build first`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(join('..', 'package.json'), 'utf8'));
const expected = `v${pkg.version}`;

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(DIST);

// Deliberately narrow: only a bare vN.N.N alone inside a <span>. The changelog
// page legitimately lists every past release, and a looser pattern would flag
// all of them.
const CHIP = /<span>(v\d+\.\d+\.\d+)<\/span>/g;

let wrong = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const [, found] of html.matchAll(CHIP)) {
    if (found === expected) continue;
    console.error(
      `::error file=docs/${relative('.', page)}::shows ${found}, package.json says ${expected}`
    );
    wrong++;
  }
}

console.log(`checked ${pages.length} pages against ${expected}`);

if (wrong > 0) {
  console.error(`${wrong} stale version string(s)`);
  process.exit(1);
}

console.log('every published version string matches package.json');
