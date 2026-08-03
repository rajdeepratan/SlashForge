/**
 * Facts the site publishes about the package, read from the package itself.
 *
 * The version used to be written by hand in two places — the hero chips and the
 * shared footer — and both froze at v4.0.1 while npm served 4.3.1. Deriving it
 * removes the class of bug rather than the instance.
 *
 * Read with `node:fs` rather than `import`: the manifest sits outside docs/, and
 * Vite's serving allow-list rejects imports from outside the project root, which
 * would pass the build and fail `npm run dev`. Frontmatter and src modules run in
 * Node at build time, so this never enters the module graph.
 *
 * Anchored to `process.cwd()`, not `import.meta.url`. Astro bundles this module
 * into dist/slashforge/.prerender/ before running it, so a URL relative to the
 * module resolves inside dist/ and the read fails. npm scripts always run with
 * cwd set to the package directory, so cwd is docs/ for both build and dev.
 *
 * Same shape as `src/nav.ts` — a shared build-time module at src/ root.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const pkg = JSON.parse(
  readFileSync(join(process.cwd(), '..', 'package.json'), 'utf8')
);

/** The published version, e.g. "4.3.1". */
export const version: string = pkg.version;

/** The engines floor as a display string: ">=16" -> "16+", ">=18.0.0" -> "18+". */
export const nodeFloor: string =
  `${pkg.engines.node.replace(/[^0-9.]/g, '').split('.')[0]}+`;
