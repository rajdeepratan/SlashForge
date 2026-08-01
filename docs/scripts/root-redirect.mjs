#!/usr/bin/env node
/**
 * Writes dist/index.html redirecting to the base path.
 *
 * The build emits into dist/<base>/ so the served URLs exist on disk without
 * host-specific rewrite rules. That leaves dist/ itself without an index, so a
 * host serving dist/ at the domain root would 404 on `/`. This stub fixes that
 * without depending on any host's config format.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const base = process.env.DOCS_BASE_PATH ?? '/slashforge';
const target = base.endsWith('/') ? base : `${base}/`;
const dest = join(here, '..', 'dist', 'index.html');

mkdirSync(dirname(dest), { recursive: true });
writeFileSync(
  dest,
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>SlashForge</title>
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
</head>
<body><p>Redirecting to <a href="${target}">${target}</a></p></body>
</html>
`
);

console.log(`root-redirect: wrote dist/index.html -> ${target}`);
