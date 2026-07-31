#!/usr/bin/env node
/**
 * Generates docs/src/content/docs/changelog.md from the repo's CHANGELOG.md.
 *
 * The changelog is NOT maintained in two places. CHANGELOG.md is the single
 * source of truth; this copies it in at build time with the frontmatter
 * Starlight needs. The generated file is gitignored so there is never a second
 * copy in git to drift out of sync.
 *
 * Runs automatically via the `predev` and `prebuild` npm scripts.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', '..', 'CHANGELOG.md');
const dest = join(here, '..', 'src', 'content', 'docs', 'changelog.md');

let body;
try {
  body = readFileSync(source, 'utf8');
} catch (err) {
  console.error(`sync-changelog: cannot read ${source}\n${err.message}`);
  process.exit(1);
}

// Drop the source's own H1 — Starlight renders the title from frontmatter, so
// keeping it would show the heading twice.
body = body.replace(/^#\s+.*\n+/, '');

const frontmatter = `---
title: Changelog
description: Release history for SlashForge.
editUrl: false
---

<!-- GENERATED FILE — do not edit. Edit /CHANGELOG.md instead. -->

`;

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(dest, frontmatter + body);

const version = (body.match(/##\s+\[([\d.]+)\]/) || [])[1] ?? 'unknown';
console.log(`sync-changelog: wrote changelog.md (latest release: ${version})`);
