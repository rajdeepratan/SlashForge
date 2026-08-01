import { execFileSync } from 'node:child_process';

/**
 * The date a docs page last changed, from git.
 *
 * Starlight's `lastUpdated: true` did this before the rebuild; it reads the
 * commit date rather than the file's mtime because mtime is set to checkout
 * time on a fresh clone, which would stamp every page with the CI run's date.
 *
 * Runs at build time only — these are static pages, so the result is baked in.
 */
const cache = new Map<string, string>();

export function lastModified(filePath: string | undefined): string {
  if (!filePath) return today();
  const hit = cache.get(filePath);
  if (hit) return hit;

  let date: string;
  try {
    // %cs is the committer date as a bare YYYY-MM-DD.
    date =
      execFileSync('git', ['log', '-1', '--format=%cs', '--', filePath], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim() || today();
  } catch {
    // Not a git checkout (a tarball build, say) — the build date is the most
    // honest thing left to say.
    date = today();
  }

  cache.set(filePath, date);
  return date;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}
