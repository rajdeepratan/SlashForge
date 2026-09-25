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
  // setup now installs on both vendors and scaffolds each host's own layout.
  /setup.{0,20}is Claude Code only/i,
  /not yet verified end to end/i,
  /aliases for `agents`/i,
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

// --- setup on cursor and codex ---

test('the CLI reference documents setup on both vendor targets', () => {
  const cli = fs.readFileSync(
    path.join(ROOT, 'docs/src/content/docs/reference/cli.md'), 'utf8');
  assert.match(cli, /\$slashforge-setup/, 'must show the Codex spelling');
  assert.match(cli, /\/slashforge-setup/, 'must show the Cursor spelling');
  assert.match(cli, /\.cursor\/rules/, 'must name what Cursor gets');
  assert.match(cli, /\.codex\/agents/, 'must name what Codex gets');
  assert.ok(!/is Claude Code only/i.test(cli), 'the old limitation must be gone');
});

test('the docs table documents each host', () => {
  const cli = fs.readFileSync(path.join(ROOT, 'docs/src/content/docs/reference/cli.md'), 'utf8');
  for (const host of ['Claude Code', 'Cursor', 'Codex']) {
    assert.ok(cli.includes(host), `cli.md should document ${host}`);
  }
});

test('no user-facing doc still tells people to pass --target', () => {
  const files = [
    'README.md',
    'docs/src/content/docs/guides/installation.md',
    'docs/src/content/docs/guides/introduction.md',
    'docs/src/content/docs/reference/cli.md',
    'docs/src/content/docs/reference/troubleshooting.md',
    'docs/src/content/docs/commands/slashforge-setup.md',
    'docs/src/pages/index.astro',
  ];
  for (const f of files) {
    const body = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const lines = body.split('\n').filter((l) => l.includes('--target') && !/no longer needed/.test(l));
    assert.deepEqual(lines, [], `${f} still mentions --target`);
  }
  const pkg = require('../package.json');
  assert.match(pkg.description, /Claude Code, Cursor(,)? and Codex/);
});

test('no user-facing doc names a command in the colon form', () => {
  const files = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.(md|mdx|astro|ts)$/.test(e.name)) files.push(p);
    }
  })(path.join(ROOT, 'docs/src'));
  files.push(path.join(ROOT, 'README.md'));
  const RE = /(?<![\w.~-])\/?slashforge:[a-z]/;
  const hits = files.filter((f) => !f.endsWith('changelog.md') && !f.endsWith('migrating.md')
    && RE.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(hits.map((f) => path.relative(ROOT, f)), []);
});
