// Regenerates test/fixtures/claude-render from the current templates. Run it only
// when a change to what Claude Code reads is intended, and review the diff.
//
// Only the rendered .md files are pinned: the assets are copied verbatim (another
// test checks that), and a .js file under test/ would be run by `node --test`.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { resolveTarget, installFiles } = require('../bin/install.js');

const out = path.join(__dirname, '..', 'test', 'fixtures', 'claude-render');
fs.rmSync(out, { recursive: true, force: true });
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'snap-'));
// Render with a fixed fake home, so no machine-specific path lands in a fixture.
const pinned = resolveTarget({ homeDir: '/HOME', cwd: '/HOME' });
const real = resolveTarget({ homeDir: home, cwd: home });
installFiles({ ...real, installPath: pinned.installPath }, { version: '0.0.0' });
const root = path.join(home, '.claude');
(function copy(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { copy(p); continue; }
    if (!e.name.endsWith('.md')) continue;
    const dest = path.join(out, path.relative(root, p));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(p, dest);
  }
})(root);
console.log('wrote', out);
