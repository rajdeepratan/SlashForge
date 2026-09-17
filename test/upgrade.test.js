const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  installFiles,
  uninstallFiles,
  resolveTarget,
  REMOVED_GUIDE_FILES,
  LEGACY_COMMAND_FILES,
} = require('../bin/install.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'csk-upgrade-'));
}

// When a user upgrades from an older version, REMOVED_GUIDE_FILES must be
// deleted from the guides dir. Without this cleanup stale files keep being read
// by the agent on every run.

test('forge-preflight.md is removed when upgrading from a prior install', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });

  installFiles(target, {});

  const stale = path.join(target.guidesDir, 'forge-preflight.md');
  fs.writeFileSync(stale, '---\nname: x\ndescription: y\n---\nold preflight');
  assert.ok(fs.existsSync(stale), 'pre-condition: stale file must exist before upgrade');

  // Re-install simulates an upgrade.
  installFiles(target, {});

  assert.ok(
    !fs.existsSync(stale),
    'forge-preflight.md must be removed from guidesDir on upgrade',
  );
});

test('all entries in REMOVED_GUIDE_FILES are deleted on re-install', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });

  installFiles(target, {});

  for (const f of REMOVED_GUIDE_FILES) {
    fs.writeFileSync(
      path.join(target.guidesDir, f),
      '---\nname: x\ndescription: y\n---\nstale',
    );
  }

  installFiles(target, {});

  for (const f of REMOVED_GUIDE_FILES) {
    assert.ok(
      !fs.existsSync(path.join(target.guidesDir, f)),
      `${f} must be absent after re-install`,
    );
  }
});

// LEGACY_COMMAND_FILES (v2 flat commands + v3 forge/ namespace) are cleaned up
// by uninstallFiles, not installFiles — the upgrade path is: install writes the
// new layout, user runs uninstall or the next fresh install later clears legacy.

test('all LEGACY_COMMAND_FILES are removed on uninstall', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });

  installFiles(target, {});

  // Pre-seed every legacy command file alongside the current install.
  for (const c of LEGACY_COMMAND_FILES) {
    const p = path.join(target.commandsDir, c);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, 'old command content');
  }

  for (const c of LEGACY_COMMAND_FILES) {
    assert.ok(
      fs.existsSync(path.join(target.commandsDir, c)),
      `pre-condition: legacy file ${c} must exist before uninstall`,
    );
  }

  uninstallFiles(target, {});

  for (const c of LEGACY_COMMAND_FILES) {
    assert.ok(
      !fs.existsSync(path.join(target.commandsDir, c)),
      `legacy command file ${c} must be removed by uninstall`,
    );
  }
});

test('combined upgrade: REMOVED_GUIDE_FILES cleared by re-install, legacy commands cleared by uninstall', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });

  installFiles(target, {});

  // Simulate the messy state left by an upgrade from an old release.
  for (const f of REMOVED_GUIDE_FILES) {
    fs.writeFileSync(
      path.join(target.guidesDir, f),
      '---\nname: x\ndescription: y\n---\nstale',
    );
  }
  for (const c of LEGACY_COMMAND_FILES) {
    const p = path.join(target.commandsDir, c);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, 'old');
  }

  // Phase 1: re-install clears the removed guide files.
  installFiles(target, {});

  for (const f of REMOVED_GUIDE_FILES) {
    assert.ok(
      !fs.existsSync(path.join(target.guidesDir, f)),
      `${f} must be gone after re-install`,
    );
  }
  // Legacy command files are NOT removed by installFiles — they persist until
  // an explicit uninstall.
  for (const c of LEGACY_COMMAND_FILES) {
    assert.ok(
      fs.existsSync(path.join(target.commandsDir, c)),
      `legacy ${c} should still exist before uninstall`,
    );
  }

  // Phase 2: uninstall clears the legacy command files.
  uninstallFiles(target, {});

  for (const c of LEGACY_COMMAND_FILES) {
    assert.ok(
      !fs.existsSync(path.join(target.commandsDir, c)),
      `legacy ${c} must be gone after uninstall`,
    );
  }
});

// --- Task 4: target-aware stale-guide cleanup ---

// A 4.4.3 cursor install received every guide, including the Claude-only ones.
// After upgrading, those are no longer written — and nothing used to delete them,
// so the agent kept reading a guide describing a layout it cannot write.
test('upgrading a cursor install removes guides it no longer receives', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  fs.mkdirSync(target.guidesDir, { recursive: true });
  fs.writeFileSync(path.join(target.guidesDir, 'forge-memory.md'), 'stale\n');
  fs.writeFileSync(path.join(target.guidesDir, 'forge-claude-md.md'), 'stale\n');
  target.omit = ['forge-memory.md', 'forge-claude-md.md'];
  installFiles(target, {});
  assert.ok(!fs.existsSync(path.join(target.guidesDir, 'forge-memory.md')));
  assert.ok(!fs.existsSync(path.join(target.guidesDir, 'forge-claude-md.md')));
  assert.ok(fs.existsSync(path.join(target.guidesDir, 'forge-rules.md')),
    'a guide this target does receive must survive');
});

// The sweep deletes files on real machines, so prove what it cannot touch.
test('the stale sweep never removes meta.json or the assets', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  target.omit = ['forge-memory.md'];
  installFiles(target, {});
  assert.ok(fs.existsSync(target.metaFile), 'meta.json must survive');
  for (const asset of ['forge-open.sh', 'forge-report-shell.html']) {
    assert.ok(fs.existsSync(path.join(target.guidesDir, asset)), `${asset} must survive`);
  }
});

// Files that are not kit guides share the directory on a project-mode install.
test('the stale sweep leaves non-guide files alone', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});
  const keepers = ['notes.md', 'README.md', 'forge-notes.txt'];
  for (const f of keepers) fs.writeFileSync(path.join(target.guidesDir, f), 'mine\n');
  installFiles(target, {});
  for (const f of keepers) {
    assert.ok(fs.existsSync(path.join(target.guidesDir, f)), `${f} must not be swept`);
  }
});
