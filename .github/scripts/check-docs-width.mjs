#!/usr/bin/env node
/**
 * Fails the build when a docs table would overflow the text column.
 *
 * Run from docs/ after a build, alongside the other check-docs-* scripts:
 *   node ../.github/scripts/check-docs-width.mjs
 *
 * The site can only show one coding agent at a time (see
 * src/plugins/remark-agent-only.mjs), so a table that puts one column per
 * agent — Claude Code / Cursor / Codex side by side — is both wider than the
 * ~685px text column and mostly irrelevant to any one reader. Those were split
 * into a per-agent table each. This guards against them coming back: it fails
 * on any content table with more than four columns, and on a per-agent-column
 * table (two or more agents named in its header) on a page that is not one of
 * the deliberately comparative references.
 *
 * "Per-agent-column" means two or more header cells are each exactly an agent
 * name — the shape of the tables that overflowed. A narrow table that merely
 * mentions agents (e.g. one column headed "Cursor and Codex") is left alone.
 *
 * It is a static structural proxy, not a pixel measurement — the repo's test
 * suite carries no browser, and the column shape is the actual cause of the
 * overflow the investigation found.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const AGENTS = ['Claude Code', 'Cursor', 'Codex'];
const MAX_COLS = 4;

// Pages allowed to compare agents in columns: the CLI reference and the
// migration guide are the canonical side-by-side references, by design.
const COMPARE_OK = ['/reference/cli/', '/reference/migrating/'];

/**
 * Width problems in one built page's HTML. `allowCompare` exempts a page from
 * the per-agent-column rule (never from the column-count budget).
 * Returns an array of message strings, empty when the page is clean.
 */
export function widthProblems(html, { allowCompare }) {
  const out = [];
  for (const m of html.matchAll(/<table[\s\S]*?<\/table>/g)) {
    const tableHtml = m[0];
    const firstRow = (tableHtml.match(/<tr[\s\S]*?<\/tr>/) || [''])[0];
    const cols = (firstRow.match(/<t[hd][\s>]/g) || []).length;

    if (cols > MAX_COLS) {
      out.push(`a table has ${cols} columns (max ${MAX_COLS}); split it per agent with :::agent blocks`);
    }
    if (!allowCompare) {
      // A header cell that is exactly an agent name marks a per-agent column.
      const cells = [...firstRow.matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/g)].map((c) =>
        c[1].replace(/<[^>]+>/g, '').trim()
      );
      const named = AGENTS.filter((a) => cells.includes(a));
      if (named.length >= 2) {
        out.push(
          `a table has a column per agent (${named.join(', ')}); use :::agent blocks, ` +
            `or move the comparison to the CLI reference`
        );
      }
    }
  }
  return out;
}

// When run directly (not imported by a test), walk dist/ and report.
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('check-docs-width.mjs');
if (invokedDirectly) {
  const base = process.env.DOCS_BASE_PATH ?? '/slashforge';
  const root = join(process.cwd(), 'dist' + base);

  const pages = [];
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const p = join(dir, entry);
      if (statSync(p).isDirectory()) walk(p);
      else if (entry === 'index.html') pages.push(p);
    }
  })(root);

  let bad = 0;
  for (const page of pages) {
    const rel = page.slice(root.length);
    const allowCompare = COMPARE_OK.some((s) => rel.includes(s));
    for (const msg of widthProblems(readFileSync(page, 'utf8'), { allowCompare })) {
      console.error(`  ✗ ${rel}: ${msg}`);
      bad += 1;
    }
  }

  if (bad) {
    console.error(`\n${bad} width problem(s).`);
    process.exit(1);
  }
  console.log('✓ no page carries an over-wide or unnecessary per-agent table');
}
