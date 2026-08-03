#!/usr/bin/env node
/**
 * Fails if any interactive element in the built docs has no accessible name.
 *
 * An icon-only <a> or <button> whose only child is an aria-hidden <svg> exposes
 * nothing to a screen reader. `title` deliberately does not count: it is the
 * last-resort fallback in the accessible-name computation, is announced
 * inconsistently, and never reaches keyboard or touch users at all. Accepting it
 * would mean passing on the exact bug this check exists to catch.
 *
 * The page looks correct either way, which is why this needs a machine — the
 * header socials shipped unnamed on every page and no review caught it.
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

// Non-greedy match of a whole element. Nesting would confuse this, but an <a>
// inside an <a> is invalid HTML and the same holds for <button>, so the shape
// being checked cannot legally nest.
const ELEMENT = /<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g;

let unnamed = 0;
for (const page of pages) {
  const filehtml = readFileSync(page, 'utf8');

  for (const [, tag, attrs, inner] of filehtml.matchAll(ELEMENT)) {
    if (!/<svg/i.test(inner)) continue; // not icon-only
    const text = inner.replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').trim();
    if (text) continue; // has visible text
    if (/\saria-label\s*=/i.test(attrs)) continue; // named directly
    if (/\saria-labelledby\s*=/i.test(attrs)) continue; // named by reference
    if (/<title[\s>]/i.test(inner)) continue; // named by the svg

    const href = (attrs.match(/href="([^"]*)"/) || [])[1];
    const hint = (attrs.match(/title="([^"]*)"/) || [])[1];
    console.error(
      `::error file=docs/${relative('.', page)}::<${tag}> has no accessible name` +
        `${href ? ` (href ${href})` : ''}` +
        `${hint ? ` — title="${hint}" does not count` : ''}`
    );
    unnamed++;
  }
}

console.log(`checked ${pages.length} pages`);

if (unnamed > 0) {
  console.error(`${unnamed} interactive element(s) with no accessible name`);
  process.exit(1);
}

console.log('every interactive element has an accessible name');
