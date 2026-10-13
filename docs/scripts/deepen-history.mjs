#!/usr/bin/env node
/**
 * Deepen a shallow clone so `git log` has per-file history.
 *
 * lastModified.ts stamps each page with the date of the commit that last
 * touched it (`git log -1 --format=%cs -- <file>`). A shallow clone — which is
 * what Vercel's git integration and a default `actions/checkout` produce — has
 * no such history, so every lookup comes back empty and every page falls back
 * to the build date (making stale pages look freshly updated). Fetching the
 * full history before the build restores the real per-page dates.
 *
 * Best-effort by design: a complete clone is left untouched, and any failure
 * (no network, a tarball build with no `.git`, a platform that blocks the
 * fetch) is swallowed so the build still succeeds — lastModified then falls
 * back to the build date, exactly as it did before this script existed.
 */
import { execFileSync } from 'node:child_process';

function git(args, opts = {}) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts });
}

try {
  const shallow = git(['rev-parse', '--is-shallow-repository']).trim() === 'true';
  if (!shallow) {
    console.log('deepen-history: clone already complete, nothing to do');
  } else {
    git(['fetch', '--unshallow', '--quiet'], { stdio: 'ignore' });
    console.log('deepen-history: unshallowed the clone so per-page dates resolve');
  }
} catch {
  console.log('deepen-history: skipped — no git history available; dates fall back to the build date');
}
