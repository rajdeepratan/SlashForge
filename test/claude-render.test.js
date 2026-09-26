const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveTarget, installFiles } = require('../bin/install.js');

// Regenerate with scripts/snapshot-claude-render.js, and only on purpose.
const FIX = path.join(__dirname, 'fixtures', 'claude-render');

function mdFiles(dir, rel = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? mdFiles(path.join(dir, e.name), path.join(rel, e.name))
      : e.name.endsWith('.md') ? [path.join(rel, e.name)] : []);
}

// Adding Cursor and Codex must not change a single byte Claude Code reads.
test('the Claude install is byte-identical to the pinned render', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-'));
  const pinned = resolveTarget({ homeDir: '/HOME', cwd: '/HOME' });
  const real = resolveTarget({ homeDir: home, cwd: home });
  installFiles({ ...real, installPath: pinned.installPath }, { version: '0.0.0' });
  const root = path.join(home, '.claude');
  const got = mdFiles(root).sort();
  assert.deepEqual(got, mdFiles(FIX).sort(), 'the set of Claude files changed');
  for (const f of got) {
    assert.equal(fs.readFileSync(path.join(root, f), 'utf8'),
      fs.readFileSync(path.join(FIX, f), 'utf8'), `${f} changed`);
  }
});
