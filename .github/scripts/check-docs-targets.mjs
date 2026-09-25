#!/usr/bin/env node
/**
 * Asserts the per-target command markup in dist/ is present and correct.
 *
 * Run from docs/ after a build, alongside the other check-docs-* scripts:
 *   node ../.github/scripts/check-docs-targets.mjs
 *
 * The rule this enforces is that the built HTML always ships the Claude Code
 * spelling. Switching happens client-side, so the default output has to be
 * correct on its own — for readers without JavaScript, and for the moment
 * before the script runs.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import {
  SWITCHABLE,
  COMMAND_RE,
  wholeLabelCommand,
  installPathFor,
} from '../../docs/src/targets.mjs';

const base = process.env.DOCS_BASE_PATH ?? '/slashforge';
const root = join(process.cwd(), 'dist' + base);
const content = join(process.cwd(), 'src', 'content', 'docs');

const pages = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry === 'index.html') pages.push(p);
  }
})(root);

let bad = 0;
const fail = (msg) => {
  console.error('  ✗ ' + msg);
  bad += 1;
};

for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const rel = page.slice(root.length);

  for (const m of html.matchAll(/<span data-cmd="([a-z-]+)">([^<]*)<\/span>/g)) {
    if (m[2] !== '/slashforge-' + m[1]) {
      fail(`${rel}: ${m[1]} rendered as "${m[2]}", expected the Claude Code form`);
    }
    if (!SWITCHABLE.includes(m[1])) {
      fail(`${rel}: marked a non-switchable command "${m[1]}"`);
    }
  }

  // Install paths ship in the Claude Code form too, for the same reason.
  for (const m of html.matchAll(/<span data-path="([a-z]+)">([^<]*)<\/span>/g)) {
    const want = installPathFor(m[1], 'claude');
    if (m[2] !== want) fail(`${rel}: ${m[1]} path rendered "${m[2]}", expected "${want}"`);
  }


  // The changelog is generated from /CHANGELOG.md and is a historical record.
  // Scoped to <main>: the sidebar and header are shared chrome on every page,
  // and their command labels switch legitimately even here.
  if (rel.startsWith('/changelog')) {
    const main = /<main class="main">([\s\S]*?)<\/main>/.exec(html);
    if (main && /data-cmd=/.test(main[1])) {
      fail('changelog prose must not be rewritten — it records what actually shipped');
    }
  }

  for (const pre of html.match(/<pre[^>]*>[\s\S]*?<\/pre>/g) ?? []) {
    const hasCmd = /data-cmd=/.test(pre);
    const flagged = /data-has-cmd/.test(pre);
    if (hasCmd && !flagged) fail(`${rel}: block with commands is missing data-has-cmd`);
    if (!hasCmd && flagged) fail(`${rel}: block without commands is flagged`);
  }

  // A page whose title is exactly a switchable command switches too, or the
  // heading contradicts the block directly beneath it. setup is included now
  // that it installs on cursor and codex, so its title switches like the rest.
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/.exec(html);
  if (h1) {
    const titleText = h1[1].replace(/<[^>]*>/g, '').trim();
    if (wholeLabelCommand(titleText) && !/data-cmd=/.test(h1[1])) {
      fail(`${rel}: command page title is not switchable`);
    }
  }

  // A flagged block carries a tablist in its bar; a plain one keeps its
  // language label instead.
  for (const frame of html.match(/<div class="code">[\s\S]*?<\/pre><\/div>/g) ?? []) {
    const flagged = /data-has-cmd/.test(frame);
    const tabbed = /role="tablist"/.test(frame);
    if (flagged && !tabbed) fail(`${rel}: command block has no tablist`);
    if (!flagged && tabbed) fail(`${rel}: plain block should not have a tablist`);
  }
}

// The assertions above only inspect markup that exists, so they pass vacuously
// when nothing is marked at all. This one is the positive expectation: a page
// whose source mentions a switchable command must carry the markup for it.
const sources = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p);
    else if (entry.endsWith('.md')) sources.push(p);
  }
})(content);

let expected = 0;
for (const src of sources) {
  const slug = relative(content, src).replace(/\.md$/, '').split(sep).join('/');
  if (slug === 'changelog') continue;

  // Frontmatter titles are whole-label commands handled separately from prose.
  const body = readFileSync(src, 'utf8').replace(/^---\n[\s\S]*?\n---\n/, '');
  COMMAND_RE.lastIndex = 0;
  if (!COMMAND_RE.test(body)) continue;
  expected += 1;

  const built = join(root, slug, 'index.html');
  const html = readFileSync(built, 'utf8');
  if (!/data-cmd=/.test(html)) {
    fail(`${slug}: source mentions a switchable command but nothing is marked`);
  }
}

// The landing page is an .astro template, so the rehype plugin never sees it.
// It carries the command cards and the two terminal replays, which is the first
// thing most readers see.
const home = readFileSync(join(root, 'index.html'), 'utf8');
if (!/data-cmd=/.test(home)) {
  fail('landing page: command names are not switchable');
}

// Codex invokes with $, so the terminal mock's own $ prompt would read as a
// typo — "$ $slashforge-code". The prompt is marked so CSS can drop it for
// that target alone.
if (!/class="t-prompt"/.test(home)) {
  fail('landing page: terminal prompts are not marked, so Codex renders "$ $slashforge-code"');
}

console.log(`checked ${pages.length} pages, ${expected} with switchable commands`);
if (bad) {
  console.error(`${bad} problem(s)`);
  process.exit(1);
}
console.log('per-target command markup is correct');
