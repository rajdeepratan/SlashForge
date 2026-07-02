const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  parseFrontmatter,
  validateTemplates,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  GUIDE_FILES,
  COMMAND_FILES,
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
  assert.equal(t.guidesDir, path.join('/home/u', '.claude', 'setup', 'claude-setup'));
  assert.equal(t.commandsDir, path.join('/home/u', '.claude', 'commands'));
  assert.equal(t.installPath, '/home/u/.claude/setup/claude-setup');
});

test('resolveTarget project uses cwd and repo-relative installPath', () => {
  const t = resolveTarget({ project: true, homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.mode, 'project');
  assert.equal(t.guidesDir, path.join('/repo', '.claude', 'setup', 'claude-setup'));
  assert.equal(t.commandsDir, path.join('/repo', '.claude', 'commands'));
  assert.equal(t.installPath, '.claude/setup/claude-setup');
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

test('installFiles project renders repo-relative installPath into commands', () => {
  const repo = tmp();
  const target = resolveTarget({ project: true, cwd: repo, homeDir: repo });
  installFiles(target, {});
  const body = fs.readFileSync(path.join(target.commandsDir, 'setup-claude.md'), 'utf8');
  assert.ok(body.includes('.claude/setup/claude-setup'));
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

  const guidesDir = path.join(tmpRepo, '.claude', 'setup', 'claude-setup');
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

  const guidesDir = path.join(tmpRepo, '.claude', 'setup', 'claude-setup');
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

  assert.ok(stdout.includes('claude-setup-kit status'), 'status output should include "claude-setup-kit status"');
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
