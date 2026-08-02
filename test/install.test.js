const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  parseFrontmatter,
  validateTemplates,
  assertTemplatesExist,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  commandName,
  GUIDE_FILES,
  ASSET_FILES,
  COMMAND_FILES,
  LEGACY_COMMAND_FILES,
} = require('../bin/install.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const BIN = path.join(__dirname, '..', 'bin', 'install.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'csk-test-'));
}

test('parseFrontmatter parses valid frontmatter', () => {
  const fm = parseFrontmatter('---\nname: x\ndescription: y\n---\nbody', 'f');
  assert.equal(fm.name, 'x');
  assert.equal(fm.description, 'y');
});

test('parseFrontmatter throws on missing opening fence', () => {
  assert.throws(() => parseFrontmatter('name: x\n', 'f'), /opening/);
});

test('parseFrontmatter throws on missing closing fence', () => {
  assert.throws(() => parseFrontmatter('---\nname: x\n', 'f'), /closing/);
});

test('parseFrontmatter throws on missing required field', () => {
  assert.throws(() => parseFrontmatter('---\nname: x\n---\n', 'f'), /description/);
});

test('validateTemplates passes for all real templates', () => {
  assert.doesNotThrow(() => validateTemplates(GUIDE_FILES, TEMPLATES_DIR));
  assert.doesNotThrow(() => validateTemplates(COMMAND_FILES, TEMPLATES_DIR));
});

test('renderTemplate replaces all three tokens', () => {
  const out = renderTemplate('{{INSTALL_PATH}} {{KIT_VERSION}} {{KIT_PACKAGE}}', {
    installPath: 'P',
    version: 'V',
    pkgName: 'N',
  });
  assert.equal(out, 'P V N');
  assert.ok(!out.includes('{{'));
});

test('resolveTarget global uses homeDir and absolute installPath', () => {
  const t = resolveTarget({ homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.mode, 'global');
  assert.equal(t.guidesDir, path.join('/home/u', '.claude', 'setup', 'slashforge'));
  assert.equal(t.commandsDir, path.join('/home/u', '.claude', 'commands'));
  assert.equal(t.installPath, '/home/u/.claude/setup/slashforge');
});

test('resolveTarget project uses cwd and repo-relative installPath', () => {
  const t = resolveTarget({ project: true, homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.mode, 'project');
  assert.equal(t.guidesDir, path.join('/repo', '.claude', 'setup', 'slashforge'));
  assert.equal(t.commandsDir, path.join('/repo', '.claude', 'commands'));
  assert.equal(t.installPath, '.claude/setup/slashforge');
});

test('installFiles global writes guides, rendered commands, and meta', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  const written = installFiles(target, {});
  for (const g of GUIDE_FILES) {
    assert.ok(fs.existsSync(path.join(target.guidesDir, g)), `guide ${g} missing`);
  }
  for (const c of COMMAND_FILES) {
    const body = fs.readFileSync(path.join(target.commandsDir, c), 'utf8');
    assert.ok(!body.includes('{{INSTALL_PATH}}'), `${c} not rendered`);
    assert.ok(body.includes(target.installPath), `${c} missing installPath`);
  }
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.equal(meta.mode, 'global');
  assert.ok(Array.isArray(meta.commands));
  assert.ok(written.length > GUIDE_FILES.length);
});

test('asset files install verbatim alongside the guides', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  for (const a of ASSET_FILES) {
    const dest = path.join(target.guidesDir, a);
    assert.ok(fs.existsSync(dest), `asset ${a} missing`);
    assert.equal(
      fs.readFileSync(dest, 'utf8'),
      fs.readFileSync(path.join(TEMPLATES_DIR, a), 'utf8'),
      `asset ${a} was not copied verbatim`,
    );
  }
});

test('the report shell carries both substitution markers and stays self-contained', () => {
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'forge-report-shell.html'), 'utf8');
  assert.ok(shell.includes('<!--TITLE-->'), 'shell missing TITLE marker');
  assert.ok(shell.includes('<!--CONTENT-->'), 'shell missing CONTENT marker');
  // The offline guarantee: no scripts, no remote anything.
  assert.ok(!/<script/i.test(shell), 'shell must not contain <script>');
  assert.ok(!/https?:\/\//i.test(shell), 'shell must not reference a remote URL');
  assert.ok(!/<link[^>]+stylesheet/i.test(shell), 'shell must not link an external stylesheet');
});

test('splicing a fragment into the shell survives $-sequences', () => {
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'forge-report-shell.html'), 'utf8');
  // A fragment containing regex substitution patterns must land verbatim — this
  // is why the command uses function-form replace rather than a string.
  const body = "<p>cost: $& and $' and $` and $1</p>";
  const out = shell
    .replace('<!--TITLE-->', () => 'symptom (2026-08-02)')
    .replace('<!--CONTENT-->', () => body);
  assert.ok(out.includes(body), '$-sequences in the fragment were corrupted');
  assert.ok(out.includes('<title>Investigation — symptom (2026-08-02)</title>'));
  assert.ok(!out.includes('<!--CONTENT-->'), 'CONTENT marker not consumed');
});

test('assertTemplatesExist refuses an install when an asset is missing', () => {
  assert.throws(
    () => assertTemplatesExist(['does-not-exist.html'], TEMPLATES_DIR),
    /Refusing to install/,
  );
});

test('installFiles project renders repo-relative installPath into commands', () => {
  const repo = tmp();
  const target = resolveTarget({ project: true, cwd: repo, homeDir: repo });
  installFiles(target, {});
  const body = fs.readFileSync(path.join(target.commandsDir, 'slashforge', 'setup.md'), 'utf8');
  assert.ok(body.includes('.claude/setup/slashforge'));
  assert.ok(!body.includes('{{'));
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.equal(meta.mode, 'project');
});

test('uninstallFiles removes installed files and is idempotent', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const removed = uninstallFiles(target, {});
  assert.ok(removed.length > 0);
  assert.ok(!fs.existsSync(target.guidesDir));
  for (const c of COMMAND_FILES) {
    assert.ok(!fs.existsSync(path.join(target.commandsDir, c)));
  }
  const again = uninstallFiles(target, {});
  assert.deepEqual(again, []);
});

// ---------------------------------------------------------------------------
// CLI integration tests (drive the actual binary via child_process)
// ---------------------------------------------------------------------------

test('CLI --project --yes install writes guide files, command files, and meta.json with mode=project', () => {
  const tmpRepo = tmp();
  execFileSync('node', [BIN, '--project', '--yes'], { cwd: tmpRepo });

  const guidesDir = path.join(tmpRepo, '.claude', 'setup', 'slashforge');
  const commandsDir = path.join(tmpRepo, '.claude', 'commands');

  assert.ok(fs.existsSync(guidesDir), 'guidesDir should exist after install');
  for (const g of GUIDE_FILES) {
    assert.ok(fs.existsSync(path.join(guidesDir, g)), `guide file ${g} should be installed`);
  }
  for (const c of COMMAND_FILES) {
    assert.ok(fs.existsSync(path.join(commandsDir, c)), `command file ${c} should be installed`);
  }
  const meta = JSON.parse(fs.readFileSync(path.join(guidesDir, 'meta.json'), 'utf8'));
  assert.equal(meta.mode, 'project');
});

test('CLI uninstall --project --yes round-trip removes guides dir and command files', () => {
  const tmpRepo = tmp();
  execFileSync('node', [BIN, '--project', '--yes'], { cwd: tmpRepo });

  const guidesDir = path.join(tmpRepo, '.claude', 'setup', 'slashforge');
  const commandsDir = path.join(tmpRepo, '.claude', 'commands');

  assert.ok(fs.existsSync(guidesDir), 'guidesDir should exist after install');

  execFileSync('node', [BIN, 'uninstall', '--project', '--yes'], { cwd: tmpRepo });

  assert.ok(!fs.existsSync(guidesDir), 'guidesDir should not exist after uninstall');
  for (const c of COMMAND_FILES) {
    assert.ok(!fs.existsSync(path.join(commandsDir, c)), `command file ${c} should be removed`);
  }
});

test('CLI status --project exits 0 and reports installed state', () => {
  const tmpRepo = tmp();
  execFileSync('node', [BIN, '--project', '--yes'], { cwd: tmpRepo });

  const stdout = execFileSync('node', [BIN, 'status', '--project'], { cwd: tmpRepo, encoding: 'utf8' });

  assert.ok(stdout.includes('slashforge status'), 'status output should include "slashforge status"');
});

test('CLI uninstall --project --yes is a graceful no-op when nothing is installed', () => {
  const tmpRepo = tmp();
  const stdout = execFileSync('node', [BIN, 'uninstall', '--project', '--yes'], {
    cwd: tmpRepo,
    encoding: 'utf8',
  });

  assert.ok(
    stdout.includes('not installed at this location'),
    '"not installed at this location" message expected in: ' + stdout,
  );
});

test('commandName maps a namespaced file to its slash invocation', () => {
  assert.equal(commandName(path.join('slashforge', 'setup.md')), '/slashforge:setup');
  assert.equal(commandName(path.join('slashforge', 'code.md')), '/slashforge:code');
  assert.equal(commandName('investigate.md'), '/investigate');
});

test('commands install into the slashforge namespace directory', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const nsDir = path.join(target.commandsDir, 'slashforge');
  assert.ok(fs.existsSync(nsDir), 'slashforge/ namespace dir should exist');
  assert.ok(fs.existsSync(path.join(nsDir, 'setup.md')));
  assert.ok(fs.existsSync(path.join(nsDir, 'code.md')));
  assert.ok(fs.existsSync(path.join(nsDir, 'investigate.md')));
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(meta.commands, ['/slashforge:setup', '/slashforge:code', '/slashforge:investigate']);
});

test('/slashforge:code dispatches lean mode and ships the override guide', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const body = fs.readFileSync(path.join(target.commandsDir, 'slashforge', 'code.md'), 'utf8');
  assert.ok(body.includes('-quick'), 'code command should document the -quick flag');
  assert.ok(body.includes('forge-workflow-quick.md'), 'should point at the lean override guide');
  assert.ok(
    fs.existsSync(path.join(target.guidesDir, 'forge-workflow-quick.md')),
    'lean override guide must be installed'
  );
});

test('uninstall cleans up a v2 install (legacy commands and guides dir)', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  // Simulate what slashforge 2.x left on disk.
  fs.mkdirSync(target.commandsDir, { recursive: true });
  fs.mkdirSync(target.legacyGuidesDir, { recursive: true });
  fs.writeFileSync(path.join(target.legacyGuidesDir, 'claude-setup-workflow.md'), 'old');
  for (const c of LEGACY_COMMAND_FILES) {
    const p = path.join(target.commandsDir, c);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, 'old');
  }

  uninstallFiles(target, {});

  for (const c of LEGACY_COMMAND_FILES) {
    assert.ok(
      !fs.existsSync(path.join(target.commandsDir, c)),
      `legacy command ${c} should be removed`
    );
  }
  assert.ok(!fs.existsSync(target.legacyGuidesDir), 'legacy guides dir should be removed');
});

test('uninstall leaves user-owned files in the slashforge namespace alone', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const mine = path.join(target.commandsDir, 'slashforge', 'mine.md');
  fs.writeFileSync(mine, 'user command');

  uninstallFiles(target, {});

  assert.ok(fs.existsSync(mine), 'a user command in slashforge/ must survive uninstall');
  assert.ok(!fs.existsSync(path.join(target.commandsDir, 'slashforge', 'code.md')));
});

// The splice command documented in investigate.md is what actually builds every
// report, so the test runs THAT script rather than a copy of it — a copy could
// drift from the template and still pass.
function spliceScriptFromTemplate() {
  const md = fs.readFileSync(path.join(TEMPLATES_DIR, 'slashforge', 'investigate.md'), 'utf8');
  const m = md.match(/node -e '\n([\s\S]*?)\n'/);
  assert.ok(m, 'could not find the node splice script in investigate.md');
  return m[1];
}

// The title is plain text from a user-supplied symptom. Substituted raw it can
// break out of <title> entirely (`</title>` ends the element and the remainder
// leaks in as markup), and entity-shaped text like `&amp;` or `&#65;` is decoded
// so the title shows something the symptom never said.
test('the documented splice escapes the title', () => {
  const script = spliceScriptFromTemplate();
  const dir = tmp();
  const frag = path.join(dir, 'frag.html');
  const out = path.join(dir, 'out.html');
  fs.writeFileSync(frag, '<h1>body</h1>');

  const cases = [
    'x </title><meta http-equiv=refresh> y',
    'literal &amp; in symptom',
    'escape &lt;div&gt; shows wrong',
    'numeric &#65; ref',
  ];

  for (const title of cases) {
    execFileSync('node', [
      '-e', script,
      path.join(TEMPLATES_DIR, 'forge-report-shell.html'), frag, out, title,
    ]);
    const html = fs.readFileSync(out, 'utf8');
    const inTitle = html.match(/<title>([\s\S]*?)<\/title>/);

    assert.ok(inTitle, `title element destroyed by: ${title}`);
    assert.ok(
      !/<meta/i.test(inTitle[1]),
      `title broke out, leaking markup: ${title}`,
    );
    // Round-trip: unescaping what landed must return the original symptom.
    const decoded = inTitle[1]
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    assert.ok(
      decoded.endsWith(title),
      `title not round-trippable.\n  want ends with: ${title}\n  got: ${decoded}`,
    );
  }
});

test('the documented splice leaves the body fragment as raw HTML', () => {
  const script = spliceScriptFromTemplate();
  const dir = tmp();
  const frag = path.join(dir, 'frag.html');
  const out = path.join(dir, 'out.html');
  // The body is HTML and must NOT be escaped — only the title is plain text.
  // Also guards the $-sequence behaviour that function-form replace protects.
  const body = '<h1>heading</h1><p>cost: $& and $` and $1</p>';
  fs.writeFileSync(frag, body);

  execFileSync('node', [
    '-e', script,
    path.join(TEMPLATES_DIR, 'forge-report-shell.html'), frag, out, 'plain title',
  ]);

  const html = fs.readFileSync(out, 'utf8');
  assert.ok(html.includes(body), 'body fragment must be spliced verbatim as HTML');
  assert.ok(!html.includes('<!--CONTENT-->'), 'CONTENT marker not consumed');
  assert.ok(!html.includes('<!--TITLE-->'), 'TITLE marker not consumed');
});

// A namespace rename done as a bare find-replace rewrites HTML closing tags:
// `</code>` contains the substring `/code`, so renaming the `/code` command to
// `/forge:code` turned it into `</forge:code>`. Opening tags have no slash and
// survive, so only the closing half of each pair breaks — and browsers render it
// silently, swallowing everything after the never-closed element.
// The invariant: template HTML never contains namespaced end tags.
test('no template contains a namespaced HTML end tag', () => {
  // Global, and matchAll rather than match: a single line can carry more than one
  // (line 73 of forge-graph-summary.md did). Reporting per-occurrence keeps the
  // failure count honest instead of collapsing to one hit per line.
  const NAMESPACED_END_TAG = /<\/[a-z][\w-]*:[\w-]+>/g;
  const offenders = [];
  for (const f of [...GUIDE_FILES, ...ASSET_FILES, ...COMMAND_FILES]) {
    const lines = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(NAMESPACED_END_TAG)) {
        offenders.push(`${f}:${i + 1} -> ${m[0]}`);
      }
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `namespaced end tags found — a rename likely rewrote HTML closing tags:\n  ${offenders.join('\n  ')}`,
  );
});
