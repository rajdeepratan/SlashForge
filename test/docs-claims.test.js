const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// Historical records. They describe what was true at the time and must not be
// rewritten when the present changes.
const HISTORICAL = new Set(['CHANGELOG.md', 'changelog.md']);

// Claims that were accurate before Cursor and Codex shipped. Any of these
// surviving in a user-facing surface means a page froze while the product moved
// — which is how the landing page kept advertising "planned" support for a
// target that had already shipped.
const STALE = [
  /Cursor and Codex targets are planned/i,
  /Currently supports \*{0,2}Claude Code/i,
  /Cursor and Codex (?:support )?(?:is|are) planned/i,
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(md|mdx|astro|ts|js)$/.test(entry.name) && !HISTORICAL.has(entry.name)) out.push(full);
  }
  return out;
}

test('no user-facing surface still advertises Cursor or Codex as planned', () => {
  const files = [path.join(ROOT, 'README.md'), ...walk(path.join(ROOT, 'docs', 'src'))];
  const offenders = [];

  for (const file of files) {
    const body = fs.readFileSync(file, 'utf8');
    body.split(/\r?\n/).forEach((line, i) => {
      for (const pattern of STALE) {
        if (pattern.test(line)) {
          offenders.push(`${path.relative(ROOT, file)}:${i + 1}  ${line.trim()}`);
        }
      }
    });
  }

  assert.deepEqual(offenders, [],
    `stale support claim(s) found:\n  ${offenders.join('\n  ')}`);
});
