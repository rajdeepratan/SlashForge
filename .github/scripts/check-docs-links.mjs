#!/usr/bin/env node
/**
 * Fails if any internal link in the built docs does not resolve to a file.
 *
 * Astro reports unresolvable *sidebar* slugs, but a dead link inside page
 * content builds fine and 404s in production. Renaming the base path or a page
 * slug is exactly the change that produces those, and it has happened here more
 * than once.
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

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.html')) pages.push(p);
  }
})(DIST);

// A URL may map to a file, a directory index, or an extensionless .html,
// depending on the build format — accept any of them.
function resolves(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean === '/') return true;
  return [
    join(DIST, clean),
    join(DIST, clean, 'index.html'),
    join(DIST, `${clean}.html`),
  ].some((candidate) => existsSync(candidate));
}

let broken = 0;
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const hrefs = new Set(
    [...html.matchAll(/(?:href|src)="(\/[^"]*)"/g)].map((m) => m[1])
  );
  for (const href of hrefs) {
    if (!resolves(href)) {
      console.error(
        `::error file=docs/${relative('.', page)}::dead internal link ${href}`
      );
      broken++;
    }
  }
}

console.log(`checked ${pages.length} pages`);

if (broken > 0) {
  console.error(`${broken} dead internal link(s)`);
  process.exit(1);
}

console.log('all internal links resolve');
