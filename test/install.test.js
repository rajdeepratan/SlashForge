const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  isNewerVersion,
  parseFrontmatter,
  validateTemplates,
  assertTemplatesExist,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  commandName,
  toSkillFrontmatter,
  commandPath,
  GUIDE_FILES,
  REMOVED_GUIDE_FILES,
  ASSET_FILES,
  SKILL_FILES,
  COMMAND_FILES,
  LEGACY_COMMAND_FILES,
  TARGETS,
  resolveTargetName,
  skillDirName,
  parseTargetArg,
  plannedWrites,
  stripTargetBlocks,
  findTargetBlockErrors,
  blockNamesFor,
  toHostCommandRefs,
} = require('../bin/install.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const BIN = path.join(__dirname, '..', 'bin', 'install.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'csk-test-'));
}

// Guides a given target actually receives. Not every target gets every guide:
// the entry-file and subagent guides are vendor-specific splits, so a test that
// walks GUIDE_FILES blindly asserts a file the install deliberately skipped.
function guidesFor(target) {
  const omit = target.omit || [];
  return GUIDE_FILES.filter((g) => !omit.includes(g));
}

// A command that ships as a dispatcher plus a workflow file is read by the agent
// as one instruction, so a guarantee it makes may be carried by either half.
// These tests assert against the concatenation rather than against whichever file
// happens to hold a given line today.
const WORKFLOW_COMPANION = {
  'review-pr.md': 'slashforge-workflow-review-pr.md',
  'investigate.md': 'slashforge-workflow-investigation.md',
};

function commandInstruction(file) {
  const parts = [path.join(TEMPLATES_DIR, 'slashforge', file)];
  if (WORKFLOW_COMPANION[file]) parts.push(path.join(TEMPLATES_DIR, WORKFLOW_COMPANION[file]));
  return parts.map((p) => fs.readFileSync(p, 'utf8')).join('\n');
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
  for (const g of guidesFor(target)) {
    assert.ok(fs.existsSync(path.join(target.guidesDir, g)), `guide ${g} missing`);
  }
  for (const c of COMMAND_FILES) {
    const body = fs.readFileSync(commandPath(target, c), 'utf8');
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

// A guide may point at a sibling by absolute path — slashforge-workflow-review-pr.md
// names slashforge-report-shell.html that way. If guides were copied rather than
// rendered, the installed guide would carry a literal {{INSTALL_PATH}} and the
// agent would splice against a path that does not exist.
test('guide files are rendered, leaving no unsubstituted placeholders', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  for (const g of guidesFor(target)) {
    const body = fs.readFileSync(path.join(target.guidesDir, g), 'utf8');
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(body), `guide ${g} shipped an unrendered placeholder`);
  }
  // Both flows splice through the shipped script, and both name it by absolute path.
  for (const flow of ['slashforge-workflow-review-pr.md', 'slashforge-workflow-investigation.md']) {
    const body = fs.readFileSync(path.join(target.guidesDir, flow), 'utf8');
    assert.ok(
      body.includes(`${target.installPath}/slashforge-splice.js`),
      `${flow} must resolve the splice script to a real installed path`,
    );
  }
});

test('the report shell carries both substitution markers and stays self-contained', () => {
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'slashforge-report-shell.html'), 'utf8');
  assert.ok(shell.includes('<!--TITLE-->'), 'shell missing TITLE marker');
  assert.ok(shell.includes('<!--CONTENT-->'), 'shell missing CONTENT marker');
  // The offline guarantee: no scripts, no remote anything.
  assert.ok(!/<script/i.test(shell), 'shell must not contain <script>');
  assert.ok(!/https?:\/\//i.test(shell), 'shell must not reference a remote URL');
  assert.ok(!/<link[^>]+stylesheet/i.test(shell), 'shell must not link an external stylesheet');
});

test('splicing a fragment into the shell survives $-sequences', () => {
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'slashforge-report-shell.html'), 'utf8');
  // A fragment containing regex substitution patterns must land verbatim — this
  // is why the command uses function-form replace rather than a string.
  const body = "<p>cost: $& and $' and $` and $1</p>";
  const out = shell
    .replace('<!--TITLE-->', () => 'symptom (2026-08-02)')
    .replace('<!--CONTENT-->', () => body);
  assert.ok(out.includes(body), '$-sequences in the fragment were corrupted');
  assert.ok(out.includes('<title>symptom (2026-08-02)</title>'), 'shell must not hardcode a title prefix');
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
  const body = fs.readFileSync(path.join(target.commandsDir, 'slashforge-setup.md'), 'utf8');
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
    assert.ok(!fs.existsSync(commandPath(target, c)));
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
  // Default target is claude, which omits the vendor entry-file guide.
  for (const g of guidesFor(resolveTarget({ project: true, cwd: tmpRepo }))) {
    assert.ok(fs.existsSync(path.join(guidesDir, g)), `guide file ${g} should be installed`);
  }
  for (const c of COMMAND_FILES) {
    assert.ok(fs.existsSync(path.join(commandsDir, 'slashforge-' + path.basename(c))), `command file ${c} should be installed`);
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
    assert.ok(!fs.existsSync(path.join(commandsDir, 'slashforge-' + path.basename(c))), `command file ${c} should be removed`);
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

test('CLI --dry-run reports every file a real install would write, including skills and assets', () => {
  const tmpRepo = tmp();
  const stdout = execFileSync('node', [BIN, '--project', '--dry-run'], {
    cwd: tmpRepo,
    encoding: 'utf8',
  });

  for (const f of SKILL_FILES) {
    assert.ok(
      stdout.includes(path.basename(f)),
      `dry-run output should mention skill file ${f}, got: ${stdout}`,
    );
  }
  for (const f of ASSET_FILES) {
    assert.ok(
      stdout.includes(f),
      `dry-run output should mention asset file ${f}, got: ${stdout}`,
    );
  }

  assert.ok(!fs.existsSync(path.join(tmpRepo, '.claude')), '--dry-run must not create any files');
});

test('commandName maps a namespaced file to its slash invocation', () => {
  assert.equal(commandName(path.join('slashforge', 'setup.md')), '/slashforge-setup');
  assert.equal(commandName(path.join('slashforge', 'code.md')), '/slashforge-code');
});

test('commands install as flat prefixed files', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  assert.ok(!fs.existsSync(path.join(target.commandsDir, 'slashforge')), 'no 4.x namespace dir');
  // Derived, not hardcoded — a new command should not require editing this test.
  for (const c of COMMAND_FILES) {
    assert.ok(fs.existsSync(commandPath(target, c)), `${c} should be installed`);
  }
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(meta.commands, COMMAND_FILES.map(commandName));
  assert.ok(meta.commands.includes('/slashforge-review-pr'));
});

test('/slashforge:code dispatches lean mode and ships the override guide', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const body = fs.readFileSync(path.join(target.commandsDir, 'slashforge-code.md'), 'utf8');
  assert.ok(body.includes('-quick'), 'code command should document the -quick flag');
  assert.ok(body.includes('slashforge-workflow-quick.md'), 'should point at the lean override guide');
  assert.ok(
    fs.existsSync(path.join(target.guidesDir, 'slashforge-workflow-quick.md')),
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

test('uninstall leaves user-owned files in the commands dir alone', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const mine = path.join(target.commandsDir, 'slashforge-mine.md');
  fs.writeFileSync(mine, 'user command');

  uninstallFiles(target, {});

  assert.ok(fs.existsSync(mine), 'a user command named like the kit\'s must survive uninstall');
  assert.ok(!fs.existsSync(path.join(target.commandsDir, 'slashforge-code.md')));
});

// Discipline skills install as flat slashforge-<name>.md files like the entry-point
// commands, which is what gives them a `/slashforge-` invocation. They
// are deliberately NOT in COMMAND_FILES: that list drives meta.json.commands and
// the status output, and folding skills in turns a three-command report into one
// that lists every internal discipline.
test('skills install as flat files with tokens rendered', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  for (const s of SKILL_FILES) {
    const dest = commandPath(target, s);
    assert.ok(fs.existsSync(dest), `skill ${s} missing`);
    const body = fs.readFileSync(dest, 'utf8');
    assert.ok(!body.includes('{{INSTALL_PATH}}'), `${s} not rendered`);
  }
});

test('skills carry an invocation name and are excluded from meta.json commands', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(
    meta.commands,
    COMMAND_FILES.map(commandName),
    'meta.commands must list only the entry-point commands, not discipline skills',
  );
  for (const s of SKILL_FILES) {
    assert.ok(!meta.commands.includes(commandName(s)), `${s} leaked into meta.commands`);
  }
  // Still prefixed, though, so the kit's skills never collide with a user's own.
  assert.ok(commandName(SKILL_FILES[0]).startsWith('/slashforge-'));
});

test('skills are frontmatter-validated, unlike assets', () => {
  assert.doesNotThrow(() => validateTemplates(SKILL_FILES, TEMPLATES_DIR));
  assert.throws(
    () => parseFrontmatter('no frontmatter here', 'bad-skill.md'),
    /missing opening/,
  );
});

test('uninstall removes skills and leaves no namespace dir behind', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  uninstallFiles(target, {});
  for (const s of SKILL_FILES) {
    assert.ok(!fs.existsSync(commandPath(target, s)), `skill ${s} survived uninstall`);
  }
  assert.ok(!fs.existsSync(path.join(target.commandsDir, 'slashforge')), 'no namespace dir');
});

test('a user file in the 4.x namespace dir survives uninstall', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const ns = path.join(target.commandsDir, 'slashforge');
  fs.mkdirSync(ns, { recursive: true });
  const mine = path.join(ns, 'mine.md');
  fs.writeFileSync(mine, 'user command');
  uninstallFiles(target, {});
  assert.ok(fs.existsSync(mine), 'user-authored command must survive');
  assert.ok(fs.existsSync(ns), 'dir must not be pruned while it holds a user file');
});

// Every discipline now ships with SlashForge, so no template should invoke a
// superpowers skill at all. Attribution comments are fine — they are a licence
// obligation — but an invocation means a dependency crept back in.
test('no template invokes a superpowers skill', () => {
  const ALLOWED = new Set();
  const found = new Map();
  for (const f of [...GUIDE_FILES, ...SKILL_FILES, ...COMMAND_FILES]) {
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8');
    for (const m of body.matchAll(/superpowers:[a-z][a-z-]+/g)) {
      if (!ALLOWED.has(m[0])) {
        found.set(m[0], (found.get(m[0]) || []).concat(f));
      }
    }
  }
  assert.deepEqual(
    [...found.keys()],
    [],
    `superpowers skills referenced:\n  ${[...found].map(([k, v]) => `${k} in ${[...new Set(v)].join(', ')}`).join('\n  ')}`,
  );
});

// v4.3.0 removed the preflight entirely: with every discipline shipped, the
// Superpowers Check had nothing left to detect and the file read cost ~630
// tokens a run for a no-op.
test('no command declares a preflight and the guide is gone', () => {
  assert.ok(
    !fs.existsSync(path.join(TEMPLATES_DIR, 'forge-preflight.md')),
    'forge-preflight.md should no longer ship',
  );
  assert.ok(!GUIDE_FILES.includes('forge-preflight.md'), 'and should be out of GUIDE_FILES');
  assert.ok(
    REMOVED_GUIDE_FILES.includes('forge-preflight.md'),
    'it must be listed for cleanup, or upgrades leave it behind',
  );
  for (const c of [...COMMAND_FILES, ...SKILL_FILES]) {
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, c), 'utf8');
    assert.ok(!/^preflight:/m.test(body), `${c} still declares a preflight`);
    assert.ok(!/forge-preflight/.test(body), `${c} still reads the preflight guide`);
  }
});

test('upgrading clears a guide file that was dropped', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  // Simulate an older install that still has the file.
  const stale = path.join(target.guidesDir, 'forge-preflight.md');
  fs.writeFileSync(stale, '---\nname: x\ndescription: y\n---\n');
  installFiles(target, {});
  assert.ok(!fs.existsSync(stale), 'a dropped guide must be removed on re-install');
});


// The whole reason docs/superpowers/ appeared is that an artefact-writing skill
// was left to pick its own destination. SlashForge's own skills must not repeat
// it: any skill that writes an artefact names the path inside its own body.
test('SlashForge skills that write artefacts name their own destination', () => {
  const expected = {
    'brainstorm.md': 'docs/slashforge/specs/',
    'plan.md': 'docs/slashforge/plans/',
  };
  for (const [file, dest] of Object.entries(expected)) {
    const skill = SKILL_FILES.find((s) => s.endsWith(file));
    assert.ok(skill, `${file} is not in SKILL_FILES`);
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, skill), 'utf8');
    assert.ok(body.includes(dest), `${file} must name ${dest} as its write location`);
  }
});

// Three skills now write HTML through one shell. The shell must not assume which
// kind of document it is wrapping — it did, with a hardcoded "Investigation — "
// prefix that would have titled every design spec as an investigation.
test('the shell is document-agnostic and all three writers use it', () => {
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'slashforge-report-shell.html'), 'utf8');
  assert.ok(
    /<title><!--TITLE--><\/title>/.test(shell),
    'the shell must not prefix the title — the caller supplies the whole thing',
  );

  const writers = {
    'investigate.md': 'docs/slashforge/investigations',
    'brainstorm.md': 'docs/slashforge/specs',
    'plan.md': 'docs/slashforge/plans',
  };
  for (const [file, dir] of Object.entries(writers)) {
    const body = commandInstruction(file);
    assert.ok(body.includes(`mkdir -p ${dir}`), `${file} must create ${dir}`);
    assert.ok(body.includes('slashforge-splice.js'), `${file} must splice through the shipped script`);
  }
});

// Opening a document must never be able to fail the run that produced it, and the
// three writers must share one copy of the platform detection rather than each
// carrying its own — divergent copies are how the mangled-tag bug happened.
test('the open helper is shared, guarded, and always exits 0', () => {
  const helper = path.join(TEMPLATES_DIR, 'slashforge-open.sh');
  assert.ok(fs.existsSync(helper), 'slashforge-open.sh must ship');

  for (const f of ['investigate.md', 'brainstorm.md', 'plan.md']) {
    const body = commandInstruction(f);
    assert.ok(body.includes('slashforge-open.sh'), `${f} must call the shared helper`);
    assert.ok(
      !/case "\$\(uname -s\)"/.test(body),
      `${f} must not carry its own copy of the platform detection`,
    );
  }

  const run = (env, arg) => {
    const r = require('child_process').spawnSync('sh', [helper, arg], {
      env: { ...process.env, ...env },
      encoding: 'utf8',
    });
    return r.status;
  };
  // Remote session: must bail out cleanly rather than opening anything.
  assert.equal(run({ SSH_CONNECTION: '1.2.3.4 22 5.6.7.8 22' }, '/tmp/nope.html'), 0);
  // No argument at all.
  assert.equal(run({ SSH_CONNECTION: '1' }, ''), 0);
  // A path that does not exist, on a machine that may well have a browser.
  assert.equal(run({}, '/tmp/definitely-does-not-exist-slashforge.html'), 0);
});

test('every SlashForge skill carries its MIT attribution', () => {
  const missing = SKILL_FILES.filter((s) => {
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, s), 'utf8');
    return !(body.includes('MIT License') && body.includes('Jesse Vincent'));
  });
  // Skills install to ~/.claude/ detached from this repo, so a root NOTICE would
  // not travel with them — the notice has to live in each file.
  assert.deepEqual(missing, [], `adapted skills missing attribution:\n  ${missing.join('\n  ')}`);
});

// The path may be named — the override instructions have to say what they are
// overriding, or a later maintainer strips them as noise. What it may never be is
// mentioned *without* the replacement alongside it, which is what a regression to
// the upstream default would look like.
test('docs/superpowers is only ever named next to the path replacing it', () => {
  const offenders = [];
  for (const f of [...GUIDE_FILES, ...ASSET_FILES, ...COMMAND_FILES]) {
    const lines = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8').split('\n');
    lines.forEach((line, i) => {
      if (!line.includes('docs/superpowers')) return;
      if (line.includes('docs/slashforge/specs/') || line.includes('docs/slashforge/plans/')) return;
      offenders.push(`${f}:${i + 1} -> ${line.trim().slice(0, 80)}`);
    });
  }
  assert.deepEqual(
    offenders,
    [],
    `docs/superpowers named without its replacement:\n  ${offenders.join('\n  ')}`,
  );
});

// slashforge-splice.js is what actually builds every document, so the tests run the
// shipped file rather than a copy of it, from a folder laid out like an install
// (the script finds the shell next to itself).
function spliceScript() {
  const dir = tmp();
  for (const f of ['slashforge-splice.js', 'slashforge-report-shell.html']) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, f), path.join(dir, f));
  }
  return path.join(dir, 'slashforge-splice.js');
}

// The title is plain text from a user-supplied symptom. Substituted raw it can
// break out of <title> entirely (`</title>` ends the element and the remainder
// leaks in as markup), and entity-shaped text like `&amp;` or `&#65;` is decoded
// so the title shows something the symptom never said.
test('the documented splice escapes the title', () => {
  const script = spliceScript();
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
    execFileSync('node', [script, frag, out, title]);
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
  const script = spliceScript();
  const dir = tmp();
  const frag = path.join(dir, 'frag.html');
  const out = path.join(dir, 'out.html');
  // The body is HTML and must NOT be escaped — only the title is plain text.
  // Also guards the $-sequence behaviour that function-form replace protects.
  const body = '<h1>heading</h1><p>cost: $& and $` and $1</p>';
  fs.writeFileSync(frag, body);

  execFileSync('node', [script, frag, out, 'plain title']);

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
  // (line 73 of slashforge-graph-summary.md did). Reporting per-occurrence keeps the
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

// review-pr writes to GitHub, which is public and attributed to the user. The
// command must never post without an explicit confirmation, and must never pick
// request-changes (which blocks a merge) on the user's behalf.
test('review-pr gates every GitHub write behind an explicit choice', () => {
  const body = commandInstruction('review-pr.md');

  assert.ok(/Nothing is posted to GitHub before this point/i.test(body), 'must state the gate');
  assert.ok(/exact text that will appear on GitHub/i.test(body), 'must show verbatim text first');
  assert.ok(/never infer the choice/i.test(body), 'must not infer the review event');

  for (const ev of ['APPROVE', 'COMMENT', 'REQUEST_CHANGES']) {
    assert.ok(body.includes(ev), `must document the ${ev} event`);
  }
  // The failure modes that would otherwise strand a review at the last step.
  assert.ok(/own pull request/i.test(body), 'must handle self-authored PRs');
  assert.ok(/422/.test(body), 'must handle the 422 from an out-of-diff line comment');
  assert.ok(/review-requested/.test(body), 'must default to review-requested, not assignee');
  assert.ok(/No open PRs/i.test(body), 'must handle the zero-PR case');
});

// The discovery flags are SlashForge's own, not gh's. A user pasting gh syntax
// should not silently get a different query than they asked for.
test('review-pr documents its discovery flags and their consequences', () => {
  const body = commandInstruction('review-pr.md');
  for (const flag of ['--assigned', '--mine', '--all']) {
    assert.ok(body.includes(flag), `must document ${flag}`);
  }
  assert.ok(
    /Do not pass them through to `gh`/.test(body),
    'must state the flags are not gh flags',
  );
  // --mine is the one with a consequence: self-approval is impossible.
  assert.ok(
    /approve` is unavailable for every PR in this set/.test(body),
    '--mine must withdraw approve up front, not at the gate',
  );
});

// Findings are model-written prose: quotes, backticks, newlines and backslashes
// are normal in them. Interpolating that into JSON by hand corrupts the payload,
// so the documented assembly keeps prose in plain-text files and lets
// JSON.stringify escape it. This runs the shipped script itself — a copy here
// could drift from what the instruction calls and still pass.
test('the documented review payload escapes hostile prose', () => {
  const script = path.join(TEMPLATES_DIR, 'slashforge-review-payload.js');

  const d = tmp();
  const body = 'Summary with "quotes", a $var, a `backtick`,\nand a backslash \\ here.\n';
  const c1 = 'Finding: `code`, "quotes",\na newline, 100% and a \\ backslash.\n';
  fs.writeFileSync(path.join(d, 'body.txt'), body);
  fs.writeFileSync(path.join(d, 'c1.txt'), c1);
  fs.writeFileSync(
    path.join(d, 'anchors.json'),
    JSON.stringify([{ path: 'src/x.js', line: 42, side: 'RIGHT', bodyFile: 'c1.txt' }]),
  );

  const out = path.join(d, 'payload.json');
  execFileSync('node', [script, d, 'REQUEST_CHANGES', out]);

  const payload = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(payload.event, 'REQUEST_CHANGES');
  assert.equal(payload.body, body, 'summary must round-trip byte for byte');
  assert.equal(payload.comments[0].body, c1, 'finding must round-trip byte for byte');
  assert.equal(payload.comments[0].line, 42);
  assert.equal(payload.comments[0].side, 'RIGHT');

  // An approval carries no line comments.
  fs.writeFileSync(path.join(d, 'anchors.json'), '[]');
  execFileSync('node', [script, d, 'APPROVE', out]);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')).comments, []);
});

// The update warning is unsolicited, so a false positive is worse than a missed
// one: anything this cannot parse with certainty must compare as "not newer".
test('isNewerVersion only fires on a certainly-newer release', () => {
  assert.equal(isNewerVersion('4.3.1', '4.2.0'), true, 'minor bump');
  assert.equal(isNewerVersion('4.2.1', '4.2.0'), true, 'patch bump');
  assert.equal(isNewerVersion('5.0.0', '4.9.9'), true, 'major bump');
  assert.equal(isNewerVersion('4.10.0', '4.9.0'), true, 'numeric, not lexical');

  assert.equal(isNewerVersion('4.3.1', '4.3.1'), false, 'same version');
  assert.equal(isNewerVersion('4.2.0', '4.3.1'), false, 'older than installed');

  // A registry that answers with something unexpected must not produce a
  // warning telling the user to reinstall.
  for (const junk of [null, undefined, '', 'latest', '4.3', '4.3.1-beta.1', 'v4.3.1', {}, 4.31]) {
    assert.equal(isNewerVersion(junk, '4.2.0'), false, `junk candidate: ${JSON.stringify(junk)}`);
  }
  assert.equal(isNewerVersion('4.3.1', 'unknown'), false, 'junk current');
});

// ---------------------------------------------------------------------------
// Install targets (Cursor / Codex)
// ---------------------------------------------------------------------------

test('claude keeps the commands layout', () => {
  const t = resolveTarget({ homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.target, 'claude');
  assert.equal(t.commandsDir, path.join('/home/u', '.claude', 'commands'));
});

test('only the claude target carries a legacy guides dir', () => {
  assert.ok(resolveTarget({ homeDir: '/h', cwd: '/r' }).legacyGuidesDir);
  assert.ok(!('legacyGuidesDir' in resolveAgents({ homeDir: '/h', cwd: '/r' })));
});

test('claude omits no command', () => {
  // claude omits only the vendor entry-file guides, never a command.
  assert.deepEqual(TARGETS.claude.omit, ['slashforge-agents-md.md', 'slashforge-agents-codex.md']);
  assert.ok(!TARGETS.claude.omit.some((o) => [...COMMAND_FILES, ...SKILL_FILES].includes(o)));
});

test('agents install writes SKILL.md dirs with a rewritten name', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const body = fs.readFileSync(path.join(a.skillsDir, 'slashforge-code', 'SKILL.md'), 'utf8');
  assert.match(body, /^name: slashforge-code$/m);
  assert.ok(!body.includes('/slashforge:code'), 'the Claude command form must be rewritten');
});

test('every installed SKILL.md name is valid and matches its parent dir', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const dirs = fs.readdirSync(a.skillsDir);
  assert.equal(dirs.length, COMMAND_FILES.length + SKILL_FILES.length, 'every command and skill, setup included');
  for (const dir of dirs) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(a.skillsDir, dir, 'SKILL.md'), 'utf8'), dir);
    assert.match(fm.name, /^[a-z0-9-]+$/, `${dir}: name must be lowercase-hyphen only`);
    assert.equal(fm.name, dir, `${dir}: name must match its parent directory`);
  }
});

test('agents skills render with no leftover placeholder', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const body = fs.readFileSync(path.join(a.skillsDir, 'slashforge-code', 'SKILL.md'), 'utf8');
  assert.ok(!/\{\{[A-Z_]+\}\}/.test(body), 'a mustache placeholder survived');
  assert.ok(body.includes('.agents/setup/slashforge/<host>/'), 'the one intended leftover is <host>');
});

test('agents guides are installed alongside the skills', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  for (const h of a.hosts) {
    for (const f of GUIDE_FILES.filter((g) => !h.omit.includes(g))) {
      assert.ok(fs.existsSync(path.join(h.guidesDir, f)), `${h.host}: missing guide ${f}`);
    }
    for (const f of ASSET_FILES) {
      assert.ok(fs.existsSync(path.join(h.guidesDir, f)), `${h.host}: missing asset ${f}`);
    }
  }
});

test('claude meta.json records the hyphen command names', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.equal(meta.target, 'claude');
  assert.ok(meta.commands.includes('/slashforge-setup'));
});

test('skillDirName maps a template path to a prefixed dir name', () => {
  assert.equal(skillDirName(path.join('slashforge', 'code.md'), 'slashforge-'), 'slashforge-code');
  assert.equal(skillDirName(path.join('slashforge', 'code.md')), 'code');
});

test('skills layout rewrites in-body command references to the hyphen form', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const skill = fs.readFileSync(path.join(a.skillsDir, 'slashforge-investigate', 'SKILL.md'), 'utf8');
  assert.ok(skill.includes('/slashforge-code'), 'hand-off must name the hyphenated command');
  assert.ok(!skill.includes('/slashforge:'), 'no colon form may survive in a skill');
  for (const h of a.hosts) {
    const guide = fs.readFileSync(path.join(h.guidesDir, 'slashforge-workflow.md'), 'utf8');
    assert.ok(!guide.includes('/slashforge:'), `${h.host} guides must be rewritten too`);
  }
});

test('claude guides name commands in the hyphen form', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const guide = fs.readFileSync(path.join(target.guidesDir, 'slashforge-workflow.md'), 'utf8');
  assert.ok(guide.includes('/slashforge-code'), 'the hyphen form is what Claude Code lists');
  assert.ok(!guide.includes('/slashforge:code'));
});

test('uninstall removes only slashforge dirs from the shared skills root', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const foreign = path.join(a.skillsDir, 'someone-elses-skill');
  fs.mkdirSync(foreign, { recursive: true });
  fs.writeFileSync(path.join(foreign, 'SKILL.md'), '---\nname: someone-elses-skill\ndescription: x\n---\n');
  uninstallAgentsFiles(a, {});
  assert.ok(fs.existsSync(foreign), 'a foreign skill must survive uninstall');
  assert.ok(!fs.existsSync(path.join(a.skillsDir, 'slashforge-code')));
  assert.ok(!fs.existsSync(a.root), 'guides must be removed');
});

test('uninstall prunes the skills root only when it is left empty', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  uninstallAgentsFiles(a, {});
  assert.ok(!fs.existsSync(a.skillsDir), 'an emptied skills root should be pruned');
});

test('uninstall on the agents target never touches .claude', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  installFiles(claude, {});
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  uninstallAgentsFiles(a, {});
  assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'slashforge-code.md')),
    'the Claude install must be untouched');
  assert.ok(fs.existsSync(claude.guidesDir));
});

// --- Task 1: per-target prose blocks -----------------------------------------

test('stripTargetBlocks keeps the matching block and drops the other', () => {
  const src = [
    'line A',
    '<!--target:claude-->',
    'claude line',
    '<!--/target-->',
    '<!--target:agents-->',
    'agents line',
    '<!--/target-->',
    'line B',
    '',
  ].join('\n');
  assert.equal(stripTargetBlocks(src, 'claude'), 'line A\nclaude line\nline B\n');
  assert.equal(stripTargetBlocks(src, 'agents'), 'line A\nagents line\nline B\n');
});

test('stripTargetBlocks leaves a file with no markers byte-identical', () => {
  const src = 'nothing to see\nhere at all\n';
  assert.equal(stripTargetBlocks(src, 'claude'), src);
  assert.equal(stripTargetBlocks(src, 'agents'), src);
});

test('stripTargetBlocks handles a block at end of file with no trailing newline', () => {
  const src = 'a\n<!--target:agents-->\nb\n<!--/target-->';
  assert.equal(stripTargetBlocks(src, 'agents'), 'a\nb\n');
  assert.equal(stripTargetBlocks(src, 'claude'), 'a\n');
});

test('stripTargetBlocks removes multi-line bodies entirely', () => {
  const src = 'x\n<!--target:claude-->\n1\n2\n3\n<!--/target-->\ny\n';
  assert.equal(stripTargetBlocks(src, 'agents'), 'x\ny\n');
});

// --- Task 2: malformed markers fail the install closed ------------------------

test('findTargetBlockErrors accepts a well-formed file', () => {
  const ok = 'a\n<!--target:claude-->\nb\n<!--/target-->\nc\n';
  assert.deepEqual(findTargetBlockErrors(ok, 'x.md'), []);
});

test('findTargetBlockErrors rejects an unclosed block', () => {
  const errs = findTargetBlockErrors('<!--target:claude-->\nb\n', 'x.md');
  assert.equal(errs.length, 1);
  assert.match(errs[0], /x\.md/);
  assert.match(errs[0], /unclosed/i);
});

test('findTargetBlockErrors rejects an orphan close', () => {
  const errs = findTargetBlockErrors('b\n<!--/target-->\n', 'x.md');
  assert.equal(errs.length, 1);
  assert.match(errs[0], /unopened|no open block/i);
});

test('findTargetBlockErrors rejects a nested block', () => {
  const src = '<!--target:claude-->\n<!--target:agents-->\nb\n<!--/target-->\n<!--/target-->\n';
  const errs = findTargetBlockErrors(src, 'x.md');
  assert.ok(errs.some((e) => /nested/i.test(e)), 'expected a nested-block error');
});

test('findTargetBlockErrors rejects an unknown target name', () => {
  // 'cursor' and 'codex' are real targets now, so an unknown name has to be one
  // no target declares — otherwise this asserts the opposite of what it means.
  const errs = findTargetBlockErrors('<!--target:vscode-->\nb\n<!--/target-->\n', 'x.md');
  assert.equal(errs.length, 1);
  assert.match(errs[0], /vscode/);
});

test('validateTemplates refuses a template with a malformed target block', () => {
  const dir = tmp();
  fs.writeFileSync(
    path.join(dir, 'bad.md'),
    '---\nname: bad\ndescription: d\n---\n\n<!--target:claude-->\nunclosed\n'
  );
  assert.throws(() => validateTemplates(['bad.md'], dir), /Refusing to install/);
});

// --- Task 3: stripping is wired into rendering --------------------------------

const TEMPLATES = path.join(__dirname, '..', 'templates');

function renderAll(targetName) {
  const out = {};
  const walk = (dir, rel = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full, path.join(rel, e.name));
      else if (e.name.endsWith('.md')) {
        out[path.join(rel, e.name)] = renderTemplate(fs.readFileSync(full, 'utf8'), {
          installPath: '/p', version: '0.0.0', pkgName: 'slashforge', targetName,
        });
      }
    }
  };
  walk(TEMPLATES);
  return out;
}

test('renderTemplate strips target blocks for the given target', () => {
  const src = 'a\n<!--target:claude-->\nC\n<!--/target-->\n<!--target:agents-->\nA\n<!--/target-->\n';
  const opts = { installPath: '/p', version: '0.0.0', pkgName: 'slashforge' };
  assert.equal(renderTemplate(src, { ...opts, targetName: 'claude' }), 'a\nC\n');
  assert.equal(renderTemplate(src, { ...opts, targetName: 'agents' }), 'a\nA\n');
});

test('no target marker survives into any rendered file', () => {
  for (const targetName of ['claude', 'agents']) {
    for (const [file, body] of Object.entries(renderAll(targetName))) {
      assert.ok(!body.includes('<!--target:'), `${file} kept an open marker on ${targetName}`);
      assert.ok(!body.includes('<!--/target-->'), `${file} kept a close marker on ${targetName}`);
    }
  }
});

// The real regression guard for Claude Code: rendering may only ever delete
// whole lines, never rewrite one. If a claude-variant line is reworded rather
// than fenced, this fails.
test('rendering only removes whole lines, never rewrites them', () => {
  for (const targetName of ['claude', 'agents']) {
    for (const [file, body] of Object.entries(renderAll(targetName))) {
      const src = fs.readFileSync(path.join(TEMPLATES, file), 'utf8')
        .replace(/\{\{INSTALL_PATH\}\}/g, '/p')
        .replace(/\{\{KIT_VERSION\}\}/g, '0.0.0')
        .replace(/\{\{KIT_PACKAGE\}\}/g, 'slashforge')
        .split('\n');
      let i = 0;
      for (const line of body.split('\n')) {
        while (i < src.length && src[i] !== line) i += 1;
        assert.ok(i < src.length, `${file} (${targetName}): rendered line not in source: ${line}`);
        i += 1;
      }
    }
  }
});

// --- Task 4: core workflow guides ---------------------------------------------

test('core workflow guides keep agent dispatch on the claude target', () => {
  const rendered = renderAll('claude');
  assert.match(rendered['slashforge-workflow.md'], /Invoke the `git` agent to push/);
  assert.match(rendered['slashforge-workflow.md'], /`code-reviewer` agent/);
  assert.match(rendered['slashforge-workflow-agents.md'], /\.claude\/agents\//);
});

// Frontmatter is YAML, so a fenced description is only valid once the
// non-matching block is stripped. Validation therefore has to check each
// target's rendered frontmatter, not the raw source.
test('validateTemplates accepts a fenced frontmatter description', () => {
  const dir = tmp();
  fs.writeFileSync(
    path.join(dir, 'ok.md'),
    [
      '---',
      'name: /slashforge:thing',
      '<!--target:claude-->',
      'description: the claude wording',
      '<!--/target-->',
      '<!--target:agents-->',
      'description: the agents wording',
      '<!--/target-->',
      '---',
      '',
      'body',
      '',
    ].join('\n')
  );
  assert.doesNotThrow(() => validateTemplates(['ok.md'], dir));
});

test('validateTemplates still rejects frontmatter broken for one target only', () => {
  const dir = tmp();
  fs.writeFileSync(
    path.join(dir, 'half.md'),
    [
      '---',
      '<!--target:claude-->',
      'name: /slashforge:thing',
      'description: only claude gets a name',
      '<!--/target-->',
      '---',
      '',
      'body',
      '',
    ].join('\n')
  );
  assert.throws(() => validateTemplates(['half.md'], dir), /Refusing to install/);
});

// --- Task 5: remaining guides and code.md -------------------------------------

// --- Task 6: parallel.md, and the whole-feature sweep -------------------------

test('no skill dispatches an agent', () => {
  const banned = [
    /\bdispatch(?:ing|es)? (?:one |a |an )?(?:fresh )?agents?\b/i,
    /`code-reviewer` agent/,
    /the `git` agent/,
    /\.claude\/agents\//,
    /create it on the fly/i,
    /create it silently/i,
  ];
  // The shared skill set cannot assume either host's subagent system. The setup
  // procedure is host-specific and lives in the per-host guides instead.
  for (const [file, body] of Object.entries(renderAll('skills'))) {
    if (!file.startsWith('slashforge' + path.sep) || file === path.join('slashforge', 'setup.md')) continue;
    for (const re of banned) {
      assert.ok(!re.test(body), `${file} still matches ${re}`);
    }
  }
});

test('parallel.md keeps its independence test and review discipline on both targets', () => {
  for (const targetName of ['claude', 'agents']) {
    const body = renderAll(targetName)[path.join('slashforge', 'parallel.md')];
    assert.match(body, /The test for "independent"/);
    assert.match(body, /Reviewing between tasks/);
  }
});

// --- Task 1: target block inheritance ---

test('blockNamesFor gives each vendor the shared agents blocks plus its own', () => {
  assert.deepEqual(blockNamesFor('claude'), ['claude']);
  assert.deepEqual(blockNamesFor('skills'), ['agents', 'neutral']);
  assert.deepEqual(blockNamesFor('cursor'), ['agents', 'cursor']);
  assert.deepEqual(blockNamesFor('codex'), ['agents', 'codex']);
});

test('a cursor render keeps agents blocks and its own, drops the rest', () => {
  const src = [
    'shared',
    '<!--target:agents-->', 'both vendors', '<!--/target-->',
    '<!--target:cursor-->', 'cursor only', '<!--/target-->',
    '<!--target:codex-->', 'codex only', '<!--/target-->',
    '<!--target:claude-->', 'claude only', '<!--/target-->',
    'end',
  ].join('\n') + '\n';
  assert.equal(stripTargetBlocks(src, 'cursor'), 'shared\nboth vendors\ncursor only\nend\n');
  assert.equal(stripTargetBlocks(src, 'codex'), 'shared\nboth vendors\ncodex only\nend\n');
  assert.equal(stripTargetBlocks(src, 'agents'), 'shared\nboth vendors\nend\n');
  assert.equal(stripTargetBlocks(src, 'claude'), 'shared\nclaude only\nend\n');
});

test('cursor and codex are accepted block names', () => {
  const src = '<!--target:cursor-->\nx\n<!--/target-->\n';
  assert.deepEqual(findTargetBlockErrors(src, 'f.md'), []);
});

test('cursor and codex share one skill set but keep their own guides', () => {
  const a = resolveAgents({ homeDir: '/home/u', cwd: '/repo' });
  assert.equal(a.skillsDir, path.join('/home/u', '.agents', 'skills'));
  assert.equal(a.root, path.join('/home/u', '.agents', 'setup', 'slashforge'));
  assert.deepEqual(a.hosts.map((h) => h.guidesDir), [
    path.join('/home/u', '.agents', 'setup', 'slashforge', 'cursor'),
    path.join('/home/u', '.agents', 'setup', 'slashforge', 'codex'),
  ]);
  assert.equal(a.hosts[0].installPath, '/home/u/.agents/setup/slashforge/cursor');
});

test('every vendor target renders every template cleanly', () => {
  for (const name of ['claude', 'agents', 'cursor', 'codex']) {
    const rendered = renderAll(name);
    assert.ok(Object.keys(rendered).length > 0, name + ' rendered nothing');
    for (const [file, body] of Object.entries(rendered)) {
      assert.ok(!body.includes('<!--target:'), name + '/' + file + ' kept a marker');
      assert.ok(!body.includes('<!--/target-->'), name + '/' + file + ' kept a close marker');
    }
  }
});

// --- Task 3: per-target guide omission ---

test('a guide in the target omit list is not installed', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  target.omit = ['slashforge-memory.md'];
  installFiles(target, {});
  assert.ok(!fs.existsSync(path.join(target.guidesDir, 'slashforge-memory.md')),
    'an omitted guide must not be written');
  assert.ok(fs.existsSync(path.join(target.guidesDir, 'slashforge-rules.md')),
    'guides not in the omit list still install');
});

test('omitting a guide does not omit the commands', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  target.omit = ['slashforge-memory.md'];
  installFiles(target, {});
  assert.ok(fs.existsSync(path.join(target.commandsDir, 'slashforge-code.md')));
});

test('the install summary does not list an omitted guide', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  target.omit = ['slashforge-memory.md'];
  const written = installFiles(target, {});
  assert.ok(!written.some((w) => w.endsWith('slashforge-memory.md')),
    'a skipped guide must not appear in the written list');
});

test('plannedWrites agrees with installFiles about omitted guides', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  target.omit = ['slashforge-memory.md'];
  const planned = plannedWrites(target).map((w) => w.dest);
  const actual = installFiles(target, {});
  assert.ok(!planned.some((d) => d.endsWith('slashforge-memory.md')),
    'the dry-run must not promise a guide the install skips');
  // Everything the plan promises is actually written (meta aside, which both include).
  for (const d of planned) {
    assert.ok(actual.includes(d), `planned but not written: ${d}`);
  }
});

// --- Task 6: entry-file guide split ---

test('each target receives only its own entry-file guide', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  installFiles(claude, {});
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const dirs = { claude: claude.guidesDir, cursor: a.hosts[0].guidesDir, codex: a.hosts[1].guidesDir };
  const cases = {
    claude: ['slashforge-claude-md.md', 'slashforge-agents-md.md'],
    cursor: ['slashforge-agents-md.md', 'slashforge-claude-md.md'],
    codex: ['slashforge-agents-md.md', 'slashforge-claude-md.md'],
  };
  for (const [name, [present, absent]] of Object.entries(cases)) {
    assert.ok(fs.existsSync(path.join(dirs[name], present)), `${name} needs ${present}`);
    assert.ok(!fs.existsSync(path.join(dirs[name], absent)), `${name} must not get ${absent}`);
  }
});

test('the AGENTS.md guide never names a foreign vendor directory', () => {
  for (const [name, bad] of [['cursor', /\.codex\//], ['codex', /\.cursor\//]]) {
    const body = renderAll(name)['slashforge-agents-md.md'];
    assert.ok(body, `${name} should render the guide`);
    assert.ok(!bad.test(body), `${name} render leaks ${bad}`);
    assert.ok(!/CLAUDE\.md is the entry point/.test(body), 'must not describe CLAUDE.md as the entry');
  }
});

// slashforge-instructions.md's first golden rule caps every .md at 200 lines, and the
// design decision for multi-target rendering is that the cap applies to the RENDERED
// output — what an agent actually loads — not to the source, which carries every
// target's branches.
//
// Two files predate that decision and break it. They are listed here rather than
// silently skipped so the debt stays visible; the guard's job is to stop NEW files
// joining them. Shrinking these two is its own change.
const OVERSIZE_GUIDES = new Set([
  'slashforge-graph.md',              // 217 rendered
  'slashforge-workflow-review-pr.md', // 303 rendered
]);

test('no new rendered guide breaks the 200-line golden rule', () => {
  for (const name of ['claude', 'agents', 'cursor', 'codex']) {
    for (const [file, body] of Object.entries(renderAll(name))) {
      if (OVERSIZE_GUIDES.has(path.basename(file))) continue;
      const lines = body.split('\n').length;
      assert.ok(lines <= 200, `${name}/${file} is ${lines} lines, over the 200-line cap`);
    }
  }
});

test('the oversize list contains only files that are actually oversize', () => {
  // Keeps the exception list honest: shrink a file and the entry must go.
  for (const stale of OVERSIZE_GUIDES) {
    const worst = ['claude', 'agents', 'cursor', 'codex']
      .map((n) => (renderAll(n)[stale] || '').split('\n').length)
      .reduce((a, b) => Math.max(a, b), 0);
    assert.ok(worst > 200, `${stale} now renders at ${worst} lines — remove it from OVERSIZE_GUIDES`);
  }
});

// --- Task 7: subagent guide split ---

test('codex gets the TOML subagent guide, the others get the markdown one', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  installFiles(claude, {});
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const codex = a.hosts[1].guidesDir;
  const body = fs.readFileSync(path.join(codex, 'slashforge-agents-codex.md'), 'utf8');
  assert.match(body, /developer_instructions/, 'must document the TOML field');
  assert.match(body, /\.codex\/agents\//);
  assert.match(body, /\.toml/);
  assert.ok(!fs.existsSync(path.join(codex, 'slashforge-agents.md')), 'codex must not receive the markdown subagent guide');
  for (const [name, dir] of [['claude', claude.guidesDir], ['cursor', a.hosts[0].guidesDir]]) {
    assert.ok(fs.existsSync(path.join(dir, 'slashforge-agents.md')), `${name} needs slashforge-agents.md`);
    assert.ok(!fs.existsSync(path.join(dir, 'slashforge-agents-codex.md')), `${name} must not receive the codex guide`);
  }
});

test('the markdown subagent guide names the right directory per target', () => {
  const claude = renderAll('claude')['slashforge-agents.md'];
  assert.match(claude, /\.claude\/agents\//);
  assert.ok(!/\.cursor\//.test(claude), 'claude render must not mention .cursor');

  const cursor = renderAll('cursor')['slashforge-agents.md'];
  assert.match(cursor, /\.cursor\/agents\//);
  assert.ok(!/CLAUDE\.md/.test(cursor), 'cursor render must not cite CLAUDE.md');
  // One mention of .claude/agents/ is correct here: Cursor reads it too, and the
  // guide has to say .cursor/ wins. What it must never do is send you there.
  assert.ok(!/→ \.claude\//.test(cursor), 'cursor render must not target .claude in an example');
  assert.ok(!/Read `\.claude\//.test(cursor), 'cursor render must not send you to read .claude');
  assert.equal((cursor.match(/\.claude\//g) || []).length, 1,
    'exactly one .claude mention, the precedence note');
});

// A neutral block is the vendor-neutral fallback. It must NOT be inherited by the
// vendors — that is the whole reason it exists rather than reusing 'agents'.
test('a neutral block renders only in the skills profile', () => {
  const src = [
    'shared',
    '<!--target:neutral-->', 'generic wording', '<!--/target-->',
    '<!--target:cursor-->', 'cursor wording', '<!--/target-->',
    '<!--target:claude-->', 'claude wording', '<!--/target-->',
  ].join('\n') + '\n';
  assert.equal(stripTargetBlocks(src, 'skills'), 'shared\ngeneric wording\n');
  assert.equal(stripTargetBlocks(src, 'cursor'), 'shared\ncursor wording\n');
  assert.equal(stripTargetBlocks(src, 'codex'), 'shared\n');
  assert.equal(stripTargetBlocks(src, 'claude'), 'shared\nclaude wording\n');
});

test('neutral is a block name but never an install target', () => {
  assert.ok(TARGETS.skills.blocks.includes('neutral'));
  assert.ok(!('agents' in TARGETS), 'the agents target is gone');
  const src = '<!--target:neutral-->\nx\n<!--/target-->\n';
  assert.deepEqual(findTargetBlockErrors(src, 'f.md'), [], 'but it is a valid marker');
});

// --- Task 5: setup on the vendor targets ---

test('setup installs as a skill for cursor and codex', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const skill = path.join(a.skillsDir, 'slashforge-setup', 'SKILL.md');
  assert.ok(fs.existsSync(skill), 'setup should install as a skill');
  assert.match(fs.readFileSync(skill, 'utf8'), /^name: slashforge-setup$/m);
});

// The strongest guard on the read list: a guide named in the rendered setup must
// be a guide this target actually receives, or the agent is sent to read a file
// that is not on disk.
test('every guide setup tells you to read is installed for that host', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  installFiles(claude, {});
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const cases = [
    ['claude', commandPath(claude, path.join('slashforge', 'setup.md')), claude.guidesDir],
    ...a.hosts.map((h) => [h.host, path.join(h.guidesDir, 'slashforge-setup-flow.md'), h.guidesDir]),
  ];
  for (const [name, file, dir] of cases) {
    const body = fs.readFileSync(file, 'utf8');
    // Guide names only: setup also names command files, which live elsewhere.
    const referenced = [...body.matchAll(/slashforge-[a-z0-9-]+\.md/g)].map((m) => m[0])
      .filter((g) => GUIDE_FILES.includes(g));
    assert.ok(referenced.length > 5, `${name}: expected a real read list`);
    for (const guide of new Set(referenced)) {
      assert.ok(fs.existsSync(path.join(dir, guide)), `${name}: setup reads ${guide}, which is not installed here`);
    }
  }
});

test('rendered setup names each target own layout', () => {
  const cursor = renderAll('cursor')[path.join('slashforge', 'setup.md')];
  assert.match(cursor, /\.cursor\/rules\//);
  assert.match(cursor, /\.mdc/);
  assert.ok(!/\.claude\//.test(cursor), 'cursor setup must not write .claude');
  assert.ok(!/forge-claude-md\.md/.test(cursor), 'cursor setup must not read the CLAUDE.md guide');

  const codex = renderAll('codex')[path.join('slashforge', 'setup.md')];
  assert.match(codex, /\.codex\/agents\//);
  assert.match(codex, /\.toml/);
  assert.match(codex, /AGENTS\.md/);
  assert.ok(!/\.claude\//.test(codex), 'codex setup must not write .claude');
  assert.ok(!/forge-agents\.md/.test(codex), 'codex setup must read the TOML subagent guide');
});

// graphify has a native integration per host — `graphify cursor install` writes
// .cursor/rules/graphify.mdc, `graphify codex install` appends the AGENTS.md section
// and registers a PreToolUse hook. So the hook-in phase exists everywhere and the
// kit must never author that section itself.
test('every target keeps the graphify hook-in phase and its own install command', () => {
  const expected = {
    claude: 'graphify claude install',
    cursor: 'graphify cursor install',
    codex: 'graphify codex install',
  };
  for (const [name, cmd] of Object.entries(expected)) {
    const body = renderAll(name)[path.join('slashforge', 'setup.md')];
    assert.match(body, /Phase 5 — Verify/, `${name} keeps five phases`);
    assert.match(body, /Phase 4 — Graphify hook-in/, `${name} keeps the hook-in phase`);
    assert.ok(body.includes(cmd), `${name} should run ${cmd}`);
    for (const other of Object.values(expected)) {
      if (other !== cmd) {
        assert.ok(!body.includes(other), `${name} must not run ${other}`);
      }
    }
  }
});

test('setup never tells the kit to write the graphify section itself', () => {
  for (const name of ['claude', 'cursor', 'codex']) {
    const body = renderAll(name)[path.join('slashforge', 'setup.md')];
    assert.ok(!/including the `## graphify` section/.test(body),
      `${name}: graphify writes its own section — the kit must not duplicate it`);
  }
});

test('every target runs setup in five phases', () => {
  for (const name of ['claude', 'cursor', 'codex']) {
    const body = renderAll(name)[path.join('slashforge', 'setup.md')];
    assert.match(body, /five phases/, `${name} should say five phases`);
    assert.ok(!/four phases/.test(body), `${name} must not claim four`);
  }
});

// --- Task 8: master instructions guide ---

test('rendered instructions name only the running target layout', () => {
  const claude = renderAll('claude')['slashforge-instructions.md'];
  assert.match(claude, /CLAUDE\.md/);
  assert.match(claude, /\.claude\/rules\//);
  assert.ok(!/\.cursor\/|\.codex\//.test(claude), 'claude render leaks a vendor dir');

  const cursor = renderAll('cursor')['slashforge-instructions.md'];
  assert.match(cursor, /AGENTS\.md/);
  assert.match(cursor, /\.cursor\/rules\/\*\.mdc/);
  assert.ok(!/\.claude\/|\.codex\//.test(cursor), 'cursor render leaks a foreign dir');

  const codex = renderAll('codex')['slashforge-instructions.md'];
  assert.match(codex, /AGENTS\.md/);
  assert.match(codex, /\.codex\/agents\/\*\.toml/);
  assert.ok(!/\.claude\/|\.cursor\//.test(codex), 'codex render leaks a foreign dir');
});

test('every target keeps all seven golden rules and the core sections', () => {
  for (const name of ['claude', 'cursor', 'codex']) {
    const body = renderAll(name)['slashforge-instructions.md'];
    for (const section of [
      'Golden Rules', 'File Structure', 'Generated File Markers', 'Creation Order',
      'Step 1', 'Step 2', 'Updating an Existing Setup', 'When to Split a File',
    ]) {
      assert.ok(body.includes(section), `${name}: lost the "${section}" section`);
    }
    assert.match(body, /under 200 lines/, `${name}: lost the 200-line rule`);
    assert.match(body, /generated_by/, `${name}: lost the marker rule`);
    assert.match(body, /actual patterns in this codebase/, `${name}: lost the no-generic rule`);
    assert.match(body, /never specific file paths|never specific files/,
      `${name}: lost the directories-not-paths rule`);
  }
});

// --- Task 9: rules, skills, commands, hooks ---

test('no rendered guide names a foreign target directory', () => {
  // Covers both the config directory AND the entry-file name: a guide that says
  // "after the kit's CLAUDE.md is written" is just as wrong on Codex as one naming
  // .claude/, and the directory pattern alone does not catch it.
  const foreign = {
    claude: /\.cursor\/|\.codex\//,
    cursor: /\.claude\/|\.codex\/|CLAUDE\.md/,
    codex: /\.claude\/|\.cursor\/|CLAUDE\.md/,
    skills: /\.claude\/|\.cursor\/|\.codex\/|CLAUDE\.md/,
  };
  // slashforge-agents.md legitimately cites .claude/agents/ once on cursor, to say
  // .cursor/ wins on a name conflict. That precedence note is the only exemption.
  const exempt = new Set([
    'slashforge-agents.md',
    // Name CLAUDE.md on purpose: the coexistence instruction tells the vendor
    // setup not to rewrite a Claude Code setup's entry file without asking.
    'slashforge-agents-md.md',
    path.join('slashforge', 'setup.md'),
  ]);
  for (const [name, bad] of Object.entries(foreign)) {
    // Only guides this target actually receives. A vendor-specific split names its
    // own vendor throughout — that is the point of it — and it is never installed
    // anywhere else, so rendering it for another target proves nothing.
    const omit = TARGETS[name].omit || [];
    for (const [file, body] of Object.entries(renderAll(name))) {
      const base = path.basename(file);
      if (exempt.has(base) || exempt.has(file)) continue;
      if (omit.includes(base) || omit.includes(file)) continue;
      // The skills profile renders only commands and skills; guides render per host.
      if (name === 'skills' && !file.startsWith('slashforge' + path.sep) && !file.startsWith('agents' + path.sep)) continue;
      if (name !== 'skills' && file.startsWith('agents' + path.sep)) continue;
      assert.ok(!bad.test(body), `${name}/${file} names a foreign target directory`);
    }
  }
});

test('the rules guide carries each host real rules mechanism', () => {
  const cursor = renderAll('cursor')['slashforge-rules.md'];
  assert.match(cursor, /\.mdc/, 'cursor rules are .mdc');
  assert.match(cursor, /silently ignored|is ignored/, 'must warn that a plain .md is ignored');
  assert.match(cursor, /alwaysApply/, 'must document the frontmatter');
  assert.match(cursor, /globs/);

  const codex = renderAll('codex')['slashforge-rules.md'];
  assert.match(codex, /nested `AGENTS\.md`/, 'codex rules are nested AGENTS.md');
  assert.match(codex, /no rules directory/, 'must say there is no rules dir');
  assert.ok(!/\.mdc/.test(codex), 'codex has no .mdc');
});

test('the commands guide tells codex not to create commands', () => {
  const codex = renderAll('codex')['slashforge-commands.md'];
  assert.match(codex, /deprecated/, 'must say prompts are deprecated');
  assert.match(codex, /skill/i, 'must redirect to skills');

  const cursor = renderAll('cursor')['slashforge-commands.md'];
  assert.match(cursor, /\.cursor\/commands\//);
});

test('the hooks guide carries each host hook file and gate', () => {
  const cursor = renderAll('cursor')['slashforge-hooks.md'];
  assert.match(cursor, /\.cursor\/hooks\.json/);

  const codex = renderAll('codex')['slashforge-hooks.md'];
  assert.match(codex, /\.codex\/hooks\.json/);
  // Hooks left beta: on by default, behind `[features] hooks`, not `codex_hooks`.
  assert.match(codex, /hooks = true/, 'must name the feature flag');
  assert.doesNotMatch(codex, /codex_hooks/, 'the old beta flag name is gone');
});

// The event names, config shape and exit codes used to be shared by every target,
// which gave Cursor Claude Code's hook model: a .cursor/hooks.json with PostToolUse
// and a nested hooks array, which Cursor never fires.
test('the cursor hooks guide describes Cursor\'s schema, not Claude Code\'s', () => {
  const cursor = renderAll('cursor')['slashforge-hooks.md'];
  for (const claudeOnly of ['PostToolUse', 'PreToolUse', 'SessionStart', 'UserPromptSubmit',
    'settings.json', '$CLAUDE_PROJECT_DIR', 'disableAllHooks', '/update-config', '"type": "http"']) {
    assert.ok(!cursor.includes(claudeOnly), `cursor render still names Claude Code's ${claudeOnly}`);
  }
  for (const event of ['afterFileEdit', 'beforeShellExecution', 'beforeReadFile', 'stop', 'sessionStart']) {
    assert.ok(cursor.includes(`\`${event}\``), `cursor render should name ${event}`);
  }
  assert.match(cursor, /failClosed/);
  assert.match(cursor, /"permission": "deny"/);

  // The example config must be one Cursor would actually load.
  const m = cursor.match(/```json\n([\s\S]*?)```/);
  assert.ok(m, 'no example hooks.json');
  const config = JSON.parse(m[1]);
  assert.equal(config.version, 1, 'Cursor requires "version": 1');
  for (const [event, entries] of Object.entries(config.hooks)) {
    assert.match(event, /^[a-z]/, `${event}: Cursor events are camelCase`);
    for (const e of entries) {
      assert.equal(typeof e.command, 'string', `${event}: each entry needs a command`);
      assert.ok(!('hooks' in e), `${event}: Cursor entries are flat, not nested`);
    }
  }
});

test('the claude hooks guide keeps Claude Code\'s schema', () => {
  const claude = renderAll('claude')['slashforge-hooks.md'];
  for (const s of ['PostToolUse', 'settings.json', '$CLAUDE_PROJECT_DIR', 'disableAllHooks']) {
    assert.ok(claude.includes(s), `claude render lost ${s}`);
  }
  assert.ok(!claude.includes('beforeShellExecution'));
});

test('the codex hooks guide uses Codex\'s handler types and a git-root path', () => {
  const codex = renderAll('codex')['slashforge-hooks.md'];
  assert.match(codex, /mcp_tool/);
  assert.ok(!codex.includes('"type": "http"') && !/\| `agent` \|/.test(codex), 'Codex has no http or agent hooks');
  assert.match(codex, /git rev-parse --show-toplevel/);
  const m = codex.match(/```json\n([\s\S]*?)```/);
  assert.ok(m && JSON.parse(m[1]).hooks, 'the codex example must parse');
});

test('the skills guide names each host skills directory', () => {
  assert.match(renderAll('cursor')['slashforge-skills.md'], /\.cursor\/skills\//);
  assert.match(renderAll('codex')['slashforge-skills.md'], /\.agents\/skills\//);
  for (const name of ['cursor', 'codex']) {
    assert.match(renderAll(name)['slashforge-skills.md'], /must match the parent|match its parent/,
      `${name}: both vendors require name to match the directory`);
  }
});

// --- Task 10: graphify per host ---

test('the graphify guide names each host own install command', () => {
  const expected = {
    claude: 'graphify claude install',
    cursor: 'graphify cursor install',
    codex: 'graphify codex install',
  };
  for (const [name, cmd] of Object.entries(expected)) {
    const body = renderAll(name)['slashforge-graph.md'];
    assert.ok(body.includes(cmd), `${name} should run ${cmd}`);
    for (const other of Object.values(expected)) {
      if (other !== cmd) assert.ok(!body.includes(other), `${name} must not run ${other}`);
    }
  }
});

test('the graphify guide states what each host integration writes', () => {
  const cursor = renderAll('cursor')['slashforge-graph.md'];
  assert.match(cursor, /\.cursor\/rules\/graphify\.mdc/, 'cursor gets a rule file');

  const codex = renderAll('codex')['slashforge-graph.md'];
  assert.match(codex, /AGENTS\.md/, 'codex gets an AGENTS.md section');
  assert.match(codex, /hooks\.json|PreToolUse/, 'and a PreToolUse hook');
});

test('the ordering rule survives on every target', () => {
  for (const name of ['claude', 'cursor', 'codex']) {
    const body = renderAll(name)['slashforge-graph.md'];
    assert.match(body, /Hook-in/, `${name}: the hook-in half must still exist`);
    assert.match(body, /LAST|last/, `${name}: and must still run last`);
  }
});

// --- Codex invocation sigil ---

// Codex invokes skills with `$`, not `/` — docs-targets.test.js asserts
// commandForm('code','codex') === '$slashforge-code'. The installed prose has to
// agree, or the guide names a form the host does not accept.
test('codex cross-references use the $ sigil, cursor keeps /', () => {
  assert.equal(toHostCommandRefs('see /slashforge-code now', 'codex'), 'see $slashforge-code now');
  assert.equal(toHostCommandRefs('see /slashforge-code now', 'cursor'), 'see /slashforge-code now');
  assert.equal(toHostCommandRefs('see /slashforge-code now', 'skills'), 'see /slashforge-code now');
});

test('installed codex guides never name the slash form of a command', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const codex = a.hosts[1].guidesDir;
  for (const f of fs.readdirSync(codex)) {
    if (!f.endsWith('.md')) continue;
    const body = fs.readFileSync(path.join(codex, f), 'utf8');
    // A path segment like …/codex/slashforge-workflow.md is a file, not a command.
    assert.ok(!/(?<![\w./~-])\/slashforge-[a-z]/.test(body), `${f}: names /slashforge-* but Codex invokes skills with $`);
  }
  // The shared skills name the / form; the preamble tells Codex to use $.
});

test('meta.json and status report the host invocation form', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const meta = JSON.parse(fs.readFileSync(a.metaFile, 'utf8'));
  assert.deepEqual(meta.commands, ['/slashforge-setup', '/slashforge-code', '/slashforge-investigate', '/slashforge-review-pr']);
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  const out = execFileSync('node', [BIN, 'status'], { env, encoding: 'utf8' });
  assert.match(out, /\$slashforge-code/, 'status shows the Codex form');
  assert.match(out, /\/slashforge-code/, 'status shows the Cursor form');
});

// --- Findings from the SlashForge 4.4.3 course audit ---

// The dry run used to be a second list that drifted from the real install. Both
// now come from plannedWrites, but only a two-way comparison stops the drift from
// coming back: the old bug was a file the install wrote and the preview never named.
test('plannedWrites and installFiles name exactly the same files, global and project', () => {
  for (const project of [false, true]) {
    const home = tmp();
    const target = resolveTarget({ project, homeDir: home, cwd: home });
    const planned = plannedWrites(target).map((w) => w.dest).sort();
    const actual = installFiles(target, {}).slice().sort();
    assert.deepEqual(planned, actual, `${project ? 'project' : 'global'}: dry run and install disagree`);
  }
});

test('neutral blocks live only in command and skill templates', () => {
  for (const f of GUIDE_FILES) {
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8');
    assert.ok(!body.includes('<!--target:neutral-->'), `${f}: guides never render neutral`);
  }
});

// Guides have been rendered since 4.4.1, so a dry run that says "copy" for them
// describes an install that no longer exists. Only the assets are copied.
test('the dry run labels rendered guides as render and copied assets as copy', () => {
  const home = tmp();
  const stdout = execFileSync('node', [BIN, '--dry-run'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' },
  });
  assert.match(stdout, /render\s+slashforge-workflow\.md/);
  assert.doesNotMatch(stdout, /copy\s+forge-[a-z-]+\.md/, 'a guide is still labelled copy');
  for (const a of ASSET_FILES) {
    assert.match(stdout, new RegExp(`copy\\s+${a.replace('.', '\\.')}`), `${a} should be labelled copy`);
  }
});

// --yes switches on by itself without a terminal, which is right for the update
// prompt and wrong for uninstall: a script that runs `uninstall` by mistake should
// not remove the kit without anyone having said yes.
test('uninstall without a terminal refuses unless --yes is given', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  delete env.SLASHFORGE_YES;
  execFileSync('node', [BIN, '--yes'], { env, stdio: 'ignore' });
  const target = resolveTarget({ homeDir: home, cwd: home });

  const r = require('child_process').spawnSync('node', [BIN, 'uninstall'], {
    env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.notEqual(r.status, 0, 'uninstall without a terminal should fail, not succeed silently');
  assert.match(r.stderr + r.stdout, /--yes/, 'the refusal should say how to confirm');
  assert.ok(fs.existsSync(target.guidesDir), 'nothing may be removed without a yes');

  execFileSync('node', [BIN, 'uninstall', '--yes'], { env, stdio: 'ignore' });
  assert.ok(!fs.existsSync(target.guidesDir), 'an explicit --yes still uninstalls');
});

test('parseFrontmatter accepts a folded or literal YAML description', () => {
  const folded = parseFrontmatter('---\nname: x\ndescription: >\n  one\n  two\n---\n', 'f');
  assert.equal(folded.description, 'one two');
  const literal = parseFrontmatter('---\nname: x\ndescription: |\n  one\n  two\n---\n', 'f');
  assert.equal(literal.description, 'one\ntwo');
  const plain = parseFrontmatter('---\nname: x\ndescription: one\n  two\n---\n', 'f');
  assert.equal(plain.description, 'one two');
});

test('parseFrontmatter finds a closing fence with trailing whitespace', () => {
  const fm = parseFrontmatter('---\nname: x\ndescription: y\n---  \nbody', 'f');
  assert.equal(fm.description, 'y');
});

test('parseFrontmatter still refuses an indented line with no key above it', () => {
  assert.throws(() => parseFrontmatter('---\n  stray\nname: x\ndescription: y\n---\n', 'f'), /invalid/);
});

// The two guides the model reads during setup must agree on where a skill lives.
test('forge-instructions names the SKILL.md folder form for Claude skills', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const guide = fs.readFileSync(path.join(target.guidesDir, 'slashforge-instructions.md'), 'utf8');
  assert.ok(guide.includes('| Skills | `.claude/skills/<name>/SKILL.md` |'), 'skills row still the flat form');
  assert.ok(!guide.includes('.claude/skills/*.md'), 'the flat skills form is still named');
  const skills = fs.readFileSync(path.join(target.guidesDir, 'slashforge-skills.md'), 'utf8');
  assert.ok(/500 lines/.test(guide) && /500 lines/.test(skills), 'the SKILL.md limit must match in both guides');
});

// Setup's Step 9 is the only thing that checks the size rule. It used a ** glob,
// which bash without globstar treats as one folder deep, so SKILL.md was never
// counted. The test runs the rendered command itself, under bash.
function verifyScript(targetName) {
  const home = tmp();
  let dir;
  if (targetName === 'claude') {
    const t = resolveTarget({ homeDir: home, cwd: home });
    installFiles(t, {});
    dir = t.guidesDir;
  } else {
    const a = resolveAgents({ homeDir: home, cwd: home });
    installAgentsFiles(a, {});
    dir = a.hosts.find((h) => h.host === targetName).guidesDir;
  }
  const guide = fs.readFileSync(path.join(dir, 'slashforge-instructions.md'), 'utf8');
  const step9 = guide.slice(guide.indexOf('## Step 9'));
  const m = step9.match(/```bash\n([\s\S]*?)```/);
  assert.ok(m, `no Step 9 bash block for ${targetName}`);
  const sizeCheck = m[1].split('\n\n')[0];
  assert.ok(!sizeCheck.includes('**'), 'the size check must not rely on a ** glob');
  return sizeCheck;
}

function runIn(dir, script) {
  return require('child_process').spawnSync('bash', ['-c', script], { cwd: dir, encoding: 'utf8' });
}

function lines(n) {
  return Array.from({ length: n }, (_, i) => `line ${i}`).join('\n') + '\n';
}

test('setup verify step fails on an oversized SKILL.md in a skill folder (claude)', () => {
  const script = verifyScript('claude');
  const repo = tmp();
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), lines(10));
  fs.mkdirSync(path.join(repo, '.claude', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.claude', 'rules', 'api.md'), lines(6));
  const skill = path.join(repo, '.claude', 'skills', 'add-endpoint');
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), lines(300));
  // A project install of the kit itself carries long guides; they are not the repo's files.
  const kit = resolveTarget({ project: true, cwd: repo, homeDir: tmp() });
  installFiles(kit, {});

  assert.equal(runIn(repo, script).status, 0, 'a 300-line SKILL.md is within its 500-line limit');
  fs.writeFileSync(path.join(skill, 'SKILL.md'), lines(600));
  const over = runIn(repo, script);
  assert.notEqual(over.status, 0, 'a 600-line SKILL.md must fail the check');
  assert.match(over.stdout, /SKILL\.md/);
  fs.writeFileSync(path.join(skill, 'SKILL.md'), lines(10));
  fs.writeFileSync(path.join(repo, '.claude', 'rules', 'api.md'), lines(250));
  assert.notEqual(runIn(repo, script).status, 0, 'a 250-line rule must fail the check');
});

test('setup verify step fails on oversized files for cursor and codex', () => {
  const cursor = verifyScript('cursor');
  let repo = tmp();
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), lines(10));
  fs.mkdirSync(path.join(repo, '.cursor', 'rules'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.cursor', 'rules', 'api.mdc'), lines(6));
  assert.equal(runIn(repo, cursor).status, 0);
  fs.writeFileSync(path.join(repo, '.cursor', 'rules', 'api.mdc'), lines(250));
  assert.notEqual(runIn(repo, cursor).status, 0, 'a 250-line .mdc rule must fail');

  const codex = verifyScript('codex');
  repo = tmp();
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), lines(10));
  const kit = resolveTarget({ target: 'codex', project: true, cwd: repo, homeDir: tmp() });
  installFiles(kit, {});
  assert.equal(runIn(repo, codex).status, 0, 'the kit\'s own skills are not the repo\'s files');
  fs.mkdirSync(path.join(repo, 'pkg'));
  fs.writeFileSync(path.join(repo, 'pkg', 'AGENTS.md'), lines(250));
  assert.notEqual(runIn(repo, codex).status, 0, 'a 250-line nested AGENTS.md must fail');
});

// The old assertion ("exits 0 on a missing file") could not fail: the helper
// exits 0 on every path. And on a desktop it really opened something. Stub the
// openers on PATH instead, so the test proves which one ran, with what, and that
// a failing opener still leaves the run alone.
test('the open helper hands the path to the platform opener and survives its failure', () => {
  if (process.platform === 'win32') return; // Git Bash's `start` is a shell builtin wrapper; covered by review.
  const helper = path.join(TEMPLATES_DIR, 'slashforge-open.sh');
  const bin = tmp();
  const log = path.join(bin, 'calls.log');
  for (const opener of ['open', 'xdg-open', 'wslview']) {
    const stub = path.join(bin, opener);
    fs.writeFileSync(stub, `#!/bin/sh\necho "${opener} $*" >> "${log}"\nexit "\${STUB_EXIT:-0}"\n`);
    fs.chmodSync(stub, 0o755);
  }
  const run = (extra) => require('child_process').spawnSync('sh', [helper, '/tmp/report.html'], {
    env: { PATH: `${bin}:/usr/bin:/bin`, DISPLAY: ':0', ...extra },
    encoding: 'utf8',
  });

  assert.equal(run({}).status, 0);
  const calls = fs.readFileSync(log, 'utf8');
  assert.match(calls, /^(open|xdg-open|wslview) \/tmp\/report\.html$/m, `no opener was given the path: ${calls}`);

  fs.writeFileSync(log, '');
  assert.equal(run({ STUB_EXIT: '1' }).status, 0, 'a failing opener must not fail the run');
  assert.notEqual(fs.readFileSync(log, 'utf8'), '', 'the opener should still have been tried');

  fs.writeFileSync(log, '');
  assert.equal(run({ SSH_CONNECTION: '1.2.3.4 22 5.6.7.8 22' }).status, 0);
  assert.equal(fs.readFileSync(log, 'utf8'), '', 'a remote session must not try to open anything');
});

// Every document the kit writes went through an inline `node -e '<script>'`. A
// permission rule matches Bash by prefix, so allowing it meant allowing any node
// script at all. Shipped as files, each can be allowed by its own path.
test('no template runs an inline node script', () => {
  const offenders = [];
  for (const f of [...GUIDE_FILES, ...COMMAND_FILES, ...SKILL_FILES]) {
    const body = fs.readFileSync(path.join(TEMPLATES_DIR, f), 'utf8');
    if (/node -e '/.test(body)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], `inline node -e still in:\n  ${offenders.join('\n  ')}`);
});

test('every document writer calls the shipped splice script', () => {
  for (const f of ['investigate.md', 'brainstorm.md', 'plan.md', 'review-pr.md']) {
    assert.ok(
      commandInstruction(f).includes('node "{{INSTALL_PATH}}/slashforge-splice.js"'),
      `${f} must splice through slashforge-splice.js`,
    );
  }
  assert.ok(
    commandInstruction('review-pr.md').includes('node "{{INSTALL_PATH}}/slashforge-review-payload.js"'),
    'review-pr must assemble its payload through slashforge-review-payload.js',
  );
});

test('slashforge-review-payload.js builds the review JSON from the files', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'body.txt'), 'Top "level" $& body');
  fs.writeFileSync(path.join(d, 'c1.txt'), 'first\nfinding');
  fs.writeFileSync(path.join(d, 'anchors.json'), JSON.stringify([
    { path: 'src/x.js', line: 42, bodyFile: 'c1.txt' },
  ]));
  const out = path.join(d, 'payload.json');
  execFileSync('node', [path.join(TEMPLATES_DIR, 'slashforge-review-payload.js'), d, 'COMMENT', out]);
  assert.deepEqual(JSON.parse(fs.readFileSync(out, 'utf8')), {
    event: 'COMMENT',
    body: 'Top "level" $& body',
    comments: [{ path: 'src/x.js', line: 42, side: 'RIGHT', body: 'first\nfinding' }],
  });
});

// With the kit both in ~/.claude and in the repo, Claude Code runs the personal
// copy ("personal over project"), so the committed version silently does nothing.
test('status and a project install warn when a global install shadows the project one', () => {
  const home = tmp();
  const repo = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  execFileSync('node', [BIN, '--yes'], { env, stdio: 'ignore' });
  const installOut = execFileSync('node', [BIN, '--project', '--yes'], { env, cwd: repo, encoding: 'utf8' });
  assert.match(installOut, /global install.*runs instead/is);
  const statusOut = execFileSync('node', [BIN, 'status', '--project'], { env, cwd: repo, encoding: 'utf8' });
  assert.match(statusOut, /global install.*runs instead/is);

  const quiet = tmp();
  const alone = execFileSync('node', [BIN, 'status', '--project'], {
    env: { ...env, HOME: quiet, USERPROFILE: quiet }, cwd: repo, encoding: 'utf8',
  });
  assert.doesNotMatch(alone, /runs instead/i, 'no warning without a global install');
});

// The refusal is about not removing things unasked. With nothing installed there
// is nothing to ask about, so a cleanup script must keep its old, quiet exit 0.
test('uninstall without a terminal is still a quiet no-op when nothing is installed', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  delete env.SLASHFORGE_YES;
  const r = require('child_process').spawnSync('node', [BIN, 'uninstall'], {
    env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Nothing to remove/);
});

// #82: the commands dir was already careful — only named files go, and the folder
// only once empty. The guides dir was removed recursively, taking any file a user
// had put there with it. It now gets the same care as the commands dir.
test('uninstall keeps user files in the guides dir and removes only the kit', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const mine = path.join(target.guidesDir, 'my-notes.md');
  fs.writeFileSync(mine, 'mine');
  // A guide an older version shipped and this one no longer lists.
  fs.writeFileSync(path.join(target.guidesDir, 'forge-preflight.md'), 'old');

  uninstallFiles(target, {});

  assert.ok(fs.existsSync(mine), 'a user file in setup/slashforge/ must survive uninstall');
  assert.deepEqual(fs.readdirSync(target.guidesDir), ['my-notes.md'], 'every kit file must be gone');
});

test('uninstall still removes the guides dir when only kit files were in it', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  fs.writeFileSync(path.join(target.guidesDir, 'forge-preflight.md'), 'old');
  uninstallFiles(target, {});
  assert.ok(!fs.existsSync(target.guidesDir));
});

test('a guides dir holding only user files does not count as an install', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  execFileSync('node', [BIN, '--yes'], { env, stdio: 'ignore' });
  const target = resolveTarget({ homeDir: home, cwd: home });
  fs.writeFileSync(path.join(target.guidesDir, 'my-notes.md'), 'mine');

  const out = execFileSync('node', [BIN, 'uninstall', '--yes'], { env, encoding: 'utf8' });
  assert.match(out, /kept .*my-notes\.md|my-notes\.md.*kept/is, 'uninstall should say what it left and why');

  const status = execFileSync('node', [BIN, 'status'], { env, encoding: 'utf8' });
  assert.match(status, /not installed/, 'leftover user files are not an install');
  const again = execFileSync('node', [BIN, 'uninstall', '--yes'], { env, encoding: 'utf8' });
  assert.match(again, /Nothing to remove/);
});

// The same check as a user would do it: run the CLI dry run, then the install,
// and compare what was announced with what landed on disk.
test('the CLI dry run announces every file the install then writes', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  const stdout = execFileSync('node', [BIN, '--dry-run'], { env, encoding: 'utf8' });
  const announced = stdout.split('\n').filter((l) => l.includes('→')).map((l) => l.split('→ ')[1].trim()).sort();
  assert.deepEqual(fs.readdirSync(home), [], 'the dry run wrote something');

  execFileSync('node', [BIN, '--yes'], { env, stdio: 'ignore' });
  const written = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else written.push(p);
    }
  })(home);
  assert.deepEqual(announced, written.sort());
});

// --- One install: the ~/.agents/ location ---
const {
  resolveAgents, installAgentsFiles, plannedAgentsWrites, uninstallAgentsFiles, SKILL_PREAMBLE, AGENT_HOSTS,
} = require('../bin/install.js');

function agentsTree(root) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(p);
    }
  })(root);
  return out.sort();
}

test('resolveAgents lays out one skills dir and a guide folder per host', () => {
  const a = resolveAgents({ homeDir: '/h', cwd: '/r' });
  assert.equal(a.skillsDir, path.join('/h', '.agents', 'skills'));
  assert.deepEqual(a.hosts.map((h) => h.host), ['cursor', 'codex']);
  assert.equal(a.hosts[0].guidesDir, path.join('/h', '.agents', 'setup', 'slashforge', 'cursor'));
  const p = resolveAgents({ project: true, homeDir: '/h', cwd: '/r' });
  assert.equal(p.skillInstallPath, '.agents/setup/slashforge/<host>');
  assert.equal(p.hosts[1].installPath, '.agents/setup/slashforge/codex');
});

// Review Focus 2: paths inside a skill are always forward-slashed.
test('skill guide paths use / and a literal <host>, on every platform', () => {
  const a = resolveAgents({ homeDir: 'C:\\Users\\me', cwd: 'C:\\r' });
  assert.ok(!a.skillInstallPath.includes('\\'), a.skillInstallPath);
  assert.ok(a.skillInstallPath.endsWith('/<host>'));
});

test('installAgentsFiles writes per-host guides, neutral skills and one meta', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  for (const h of a.hosts) {
    assert.ok(fs.existsSync(path.join(h.guidesDir, 'slashforge-workflow.md')), `${h.host} guides`);
    assert.ok(fs.existsSync(path.join(h.guidesDir, 'slashforge-setup-flow.md')), `${h.host} setup flow`);
    assert.ok(fs.existsSync(path.join(h.guidesDir, 'slashforge-splice.js')), `${h.host} assets`);
    // The guides read meta.json from their own folder (slashforge-instructions.md says so).
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(h.guidesDir, 'meta.json'), 'utf8')).hosts, ['cursor', 'codex']);
  }
  assert.ok(fs.existsSync(path.join(a.hosts[0].guidesDir, 'slashforge-agents.md')), 'cursor: markdown subagents');
  assert.ok(fs.existsSync(path.join(a.hosts[1].guidesDir, 'slashforge-agents-codex.md')), 'codex: TOML subagents');
  assert.ok(!fs.existsSync(path.join(a.hosts[1].guidesDir, 'slashforge-agents.md')));
  const meta = JSON.parse(fs.readFileSync(a.metaFile, 'utf8'));
  assert.deepEqual(meta.hosts, ['cursor', 'codex']);
  assert.ok(meta.commands.includes('/slashforge-code'));
  for (const c of [...COMMAND_FILES, ...SKILL_FILES]) {
    assert.ok(fs.existsSync(path.join(a.skillsDir, 'slashforge-' + path.basename(c, '.md'), 'SKILL.md')), c);
  }
});

test('every skill is host-neutral: preamble, <host> paths, / form, no host blocks', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  for (const dir of fs.readdirSync(a.skillsDir)) {
    const body = fs.readFileSync(path.join(a.skillsDir, dir, 'SKILL.md'), 'utf8');
    assert.ok(body.includes(SKILL_PREAMBLE), `${dir}: preamble`);
    assert.match(body, new RegExp(`^---\\nname: ${dir}\\n`), `${dir}: name matches dir`);
    assert.ok(!/\/slashforge:[a-z]/.test(body), `${dir}: colon form left`);
    assert.ok(!body.replace(SKILL_PREAMBLE, '').includes('$slashforge-'), `${dir}: Codex form belongs in the preamble only`);
    assert.ok(!/<!--\/?target/.test(body), `${dir}: marker left`);
    // Every guide the skill names exists in both host folders.
    for (const m of body.matchAll(/setup\/slashforge\/<host>\/([\w.-]+)/g)) {
      for (const h of a.hosts) {
        assert.ok(fs.existsSync(path.join(h.guidesDir, m[1])), `${dir} → ${h.host}/${m[1]}`);
      }
    }
  }
});

test('the setup skill dispatches to the per-host setup flow', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const skill = fs.readFileSync(path.join(a.skillsDir, 'slashforge-setup', 'SKILL.md'), 'utf8');
  assert.match(skill, /<host>\/slashforge-setup-flow\.md/);
  const cursor = fs.readFileSync(path.join(a.hosts[0].guidesDir, 'slashforge-setup-flow.md'), 'utf8');
  const codex = fs.readFileSync(path.join(a.hosts[1].guidesDir, 'slashforge-setup-flow.md'), 'utf8');
  assert.match(cursor, /\.cursor\//);
  assert.ok(!cursor.includes('.codex/agents'), 'cursor flow names Codex layout');
  assert.match(codex, /\.codex\/agents/);
  assert.match(codex, /\$slashforge-/, 'codex guides use the $ form');
});

// Review Focus 1: an earlier per-target build left guides at the root.
test('installAgentsFiles clears kit files an old layout left at the root', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  fs.mkdirSync(a.root, { recursive: true });
  fs.writeFileSync(path.join(a.root, 'slashforge-workflow.md'), 'old');
  fs.writeFileSync(path.join(a.root, 'slashforge-splice.js'), 'old');
  fs.writeFileSync(path.join(a.root, 'notes.md'), 'mine');
  installAgentsFiles(a, {});
  assert.deepEqual(fs.readdirSync(a.root).sort(), ['codex', 'cursor', 'meta.json', 'notes.md']);
});

// Review Focus 3: a second install writes the same set, nothing more.
test('installing twice leaves exactly the same files', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const first = agentsTree(path.join(home, '.agents'));
  installAgentsFiles(a, {});
  assert.deepEqual(agentsTree(path.join(home, '.agents')), first);
});

test('plannedAgentsWrites and installAgentsFiles name the same files', () => {
  for (const project of [false, true]) {
    const home = tmp();
    const a = resolveAgents({ project, homeDir: home, cwd: home });
    const planned = plannedAgentsWrites(a).map((w) => w.dest).sort();
    assert.deepEqual(planned, installAgentsFiles(a, {}).slice().sort());
  }
});

// --- One install: the CLI ---
function cliEnv() {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  delete env.SLASHFORGE_YES;
  return { home, env };
}
const cli = (args, env, cwd) => require('child_process').spawnSync('node', [BIN, ...args], {
  env, cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});

test('one install sets up both locations and names all three forms', () => {
  const { home, env } = cliEnv();
  const r = cli([], env);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'slashforge-code.md')));
  assert.ok(fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-code', 'SKILL.md')));
  assert.ok(fs.existsSync(path.join(home, '.agents', 'setup', 'slashforge', 'codex', 'slashforge-workflow.md')));
  for (const form of ['/slashforge-code', '$slashforge-code']) {
    assert.ok(r.stdout.includes(form), `closing message should show ${form}`);
  }
});

test('the dry run lists both locations and writes nothing', () => {
  const { home, env } = cliEnv();
  const r = cli(['--dry-run'], env);
  assert.equal(r.status, 0, r.stderr);
  const announced = r.stdout.split('\n').filter((l) => l.includes('→')).map((l) => l.split('→ ')[1].trim()).sort();
  assert.deepEqual(fs.readdirSync(home), []);
  assert.ok(announced.some((p) => p.includes(path.join('.agents', 'skills', 'slashforge-code'))), 'the .agents location is announced');
  cli(['--yes'], env);
  const written = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else written.push(p);
    }
  })(home);
  assert.deepEqual(announced, written.sort());
});

test('status reports both locations and flags a missing one', () => {
  const { home, env } = cliEnv();
  cli([], env);
  const both = cli(['status'], env).stdout;
  assert.match(both, /Claude Code/);
  assert.match(both, /Cursor \+ Codex/);
  assert.match(both, /\$slashforge-code/);
  fs.rmSync(path.join(home, '.agents'), { recursive: true });
  const one = cli(['status'], env).stdout;
  assert.match(one, /Cursor \+ Codex:\s+not installed/);
});

test('uninstall removes both locations and keeps user files in each', () => {
  const { home, env } = cliEnv();
  cli([], env);
  const mineC = path.join(home, '.claude', 'setup', 'slashforge', 'notes.md');
  const mineA = path.join(home, '.agents', 'setup', 'slashforge', 'cursor', 'notes.md');
  fs.writeFileSync(mineC, 'x');
  fs.writeFileSync(mineA, 'x');
  const r = cli(['uninstall', '--yes'], env);
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(mineC) && fs.existsSync(mineA), 'user files survive');
  assert.match(r.stdout, /kept .*cursor/s);
  assert.ok(!fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-code')));
  assert.match(cli(['status'], env).stdout, /not installed/);
});

// Review Focus 4: other tools' skills in the shared folder are untouched.
test('install and uninstall leave other tools\' skills alone', () => {
  const { home, env } = cliEnv();
  const foreign = path.join(home, '.agents', 'skills', 'other-tool', 'SKILL.md');
  fs.mkdirSync(path.dirname(foreign), { recursive: true });
  fs.writeFileSync(foreign, 'x');
  cli([], env);
  assert.ok(fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-code')), 'install wrote beside it');
  cli(['uninstall', '--yes'], env);
  assert.equal(fs.readFileSync(foreign, 'utf8'), 'x');
});

test('uninstall without a terminal still needs --yes; updates still do not', () => {
  const { home, env } = cliEnv();
  assert.equal(cli([], env).status, 0);
  assert.equal(cli([], env).status, 0, 'a second install updates without a flag');
  const r = cli(['uninstall'], env);
  assert.equal(r.status, 1);
  assert.ok(fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-code')));
});

// Spec, failure handling: one location failing must not undo the other.
test('a failure in one location is reported and the other stays installed', () => {
  const { home, env } = cliEnv();
  fs.writeFileSync(path.join(home, '.agents'), 'not a directory');
  const r = cli([], env);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Cursor \+ Codex:/);
  assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'slashforge-code.md')), 'Claude install kept');
  // The output must not claim the failed location is installed.
  assert.doesNotMatch(r.stdout, /✓ Cursor \+ Codex/, 'a failed location is not reported as installed');
  assert.doesNotMatch(r.stdout, /In Cursor the same commands/, 'no usage lines for a location that failed');
  assert.doesNotMatch(r.stdout, /✓ v[\d.]+ installed/, 'a partial install is not reported as a full one');
  assert.match(r.stdout, /partially installed/);
});

test('a project install notes a global .agents install as well', () => {
  const { home, env } = cliEnv();
  const repo = tmp();
  cli([], env);
  const r = cli(['--project'], env, repo);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /global install.*runs instead/is, 'Claude Code shadow warning');
  assert.match(r.stdout, /Cursor and Codex may list both copies/);
  assert.ok(fs.existsSync(path.join(repo, '.agents', 'skills', 'slashforge-code', 'SKILL.md')));
});

// --- 5.0: the same command names on every host ---

test('no installed file names a command in the colon form', () => {
  const home = tmp();
  installFiles(resolveTarget({ homeDir: home, cwd: home }), {});
  installAgentsFiles(resolveAgents({ homeDir: home, cwd: home }), {});
  const hits = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.md$/.test(e.name) && /(^|[^\w./~-])\/?slashforge:[a-z]/.test(fs.readFileSync(p, 'utf8'))) hits.push(p);
    }
  })(home);
  assert.deepEqual(hits, [], `colon form left in:\n  ${hits.join('\n  ')}`);
});

// Review Focus 4: a bare skill name is the name the host actually has.
test('skill names in running text match the installed skill names', () => {
  const home = tmp();
  const a = resolveAgents({ homeDir: home, cwd: home });
  installAgentsFiles(a, {});
  const body = fs.readFileSync(path.join(a.skillsDir, 'slashforge-code', 'SKILL.md'), 'utf8');
  assert.match(body, /`slashforge-plan`/);
  assert.ok(fs.existsSync(path.join(a.skillsDir, 'slashforge-plan')));
});

// Review Focus 1: the Codex swap leaves paths alone.
test('toHostCommandRefs swaps the sigil for Codex and never touches a path', () => {
  const src = 'Run /slashforge-code, then read ~/.agents/skills/slashforge-code/SKILL.md or .claude/commands/slashforge-plan.md.';
  assert.equal(toHostCommandRefs(src, 'cursor'), src);
  assert.equal(toHostCommandRefs(src, 'claude'), src);
  assert.equal(toHostCommandRefs(src, 'codex'),
    'Run $slashforge-code, then read ~/.agents/skills/slashforge-code/SKILL.md or .claude/commands/slashforge-plan.md.');
});

test('commandName is the hyphenated form', () => {
  assert.equal(commandName(path.join('slashforge', 'code.md')), '/slashforge-code');
});

test('Claude commands install as flat slashforge-<name>.md files', () => {
  const home = tmp();
  const t = resolveTarget({ homeDir: home, cwd: home });
  installFiles(t, {});
  for (const c of [...COMMAND_FILES, ...SKILL_FILES]) {
    assert.ok(fs.existsSync(path.join(t.commandsDir, 'slashforge-' + path.basename(c))), c);
  }
  assert.ok(!fs.existsSync(path.join(t.commandsDir, 'slashforge')), 'no namespace folder');
});

// Review Focus 2: upgrading a 4.x install keeps the user's own command.
test('upgrading from 4.x removes the old commands and keeps user files', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  const ns = path.join(home, '.claude', 'commands', 'slashforge');
  fs.mkdirSync(ns, { recursive: true });
  for (const c of [...COMMAND_FILES, ...SKILL_FILES]) fs.writeFileSync(path.join(ns, path.basename(c)), 'old');
  fs.writeFileSync(path.join(ns, 'mine.md'), 'mine');
  const out = execFileSync('node', [BIN, '--yes'], { env, encoding: 'utf8' });
  assert.deepEqual(fs.readdirSync(ns), ['mine.md']);
  assert.match(out, /4\.x commands/);
  // And with no user file, the folder goes too.
  fs.rmSync(path.join(ns, 'mine.md'));
  for (const c of COMMAND_FILES) fs.writeFileSync(path.join(ns, path.basename(c)), 'old');
  const out2 = execFileSync('node', [BIN, '--yes'], { env, encoding: 'utf8' });
  assert.ok(!fs.existsSync(ns));
  assert.match(out2, new RegExp(`: ${COMMAND_FILES.length} files`), 'the count is files, not the folder too');
});

// Review Focus 3: both layouts present.
test('uninstall removes both the flat files and 4.x leftovers; status lists the new names', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  execFileSync('node', [BIN, '--yes'], { env });
  assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'slashforge-code.md')), 'the flat file is installed');
  const ns = path.join(home, '.claude', 'commands', 'slashforge');
  fs.mkdirSync(ns, { recursive: true });
  fs.writeFileSync(path.join(ns, 'code.md'), 'old');
  const status = execFileSync('node', [BIN, 'status'], { env, encoding: 'utf8' });
  assert.match(status, /• \/slashforge-code/);
  assert.doesNotMatch(status, /• \/slashforge:code/, 'a 4.x leftover is not listed as an installed command');
  assert.match(status, /4\.x commands:\s+1 \(\/slashforge:code\)/, 'it is reported as a leftover instead');
  execFileSync('node', [BIN, 'uninstall', '--yes'], { env });
  assert.ok(!fs.existsSync(ns));
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'commands', 'slashforge-code.md')));
});

// A repo set up under 4.x has CLAUDE.md and .claude/ files naming /slashforge:code
// and slashforge:tdd, which no longer exist after the 5.0 rename. Installing from
// inside such a repo should say so, and how to fix it.
test('installing inside a repo set up with 4.x warns about the old names', () => {
  const home = tmp();
  const repo = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '| build X | `/slashforge:code` |\n');
  fs.mkdirSync(path.join(repo, '.claude', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(repo, '.claude', 'agents', 'dev.md'), 'Invoke `slashforge:tdd`.\n');
  const out = execFileSync('node', [BIN, '--yes'], { env, cwd: repo, encoding: 'utf8' });
  assert.match(out, /still name(s)? the 4\.x commands/);
  assert.match(out, /CLAUDE\.md/);
  assert.match(out, /\/slashforge-setup/, 'names the fix');

  // A committed 4.x project install in the repo, and a global install run there.
  const repo2 = tmp();
  const ns = path.join(repo2, '.claude', 'commands', 'slashforge');
  fs.mkdirSync(ns, { recursive: true });
  fs.writeFileSync(path.join(ns, 'code.md'), 'old');
  const out2 = execFileSync('node', [BIN, '--yes'], { env, cwd: repo2, encoding: 'utf8' });
  assert.match(out2, /npx slashforge --project/, 'tells them to refresh the project copy');

  // And a clean repo gets no warning.
  const clean = execFileSync('node', [BIN, '--yes'], { env, cwd: tmp(), encoding: 'utf8' });
  assert.doesNotMatch(clean, /4\.x commands/);
});

// --- Deferred minors from the whole-branch reviews ---
function envFor(home) {
  return { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
}
function plantV4(commandsDir) {
  const ns = path.join(commandsDir, 'slashforge');
  fs.mkdirSync(ns, { recursive: true });
  for (const c of [...COMMAND_FILES, ...SKILL_FILES]) fs.writeFileSync(path.join(ns, path.basename(c)), 'old');
  return ns;
}

test('the dry run lists the 4.x files an upgrade will remove, and removes nothing', () => {
  const home = tmp();
  const ns = plantV4(path.join(home, '.claude', 'commands'));
  const out = execFileSync('node', [BIN, '--dry-run'], { env: envFor(home), encoding: 'utf8' });
  assert.match(out, /remove\s+code\.md\s+→ .*slashforge[\\/]code\.md/);
  assert.equal(fs.readdirSync(ns).length, COMMAND_FILES.length + SKILL_FILES.length, 'nothing removed');
});

test('a global 4.x install beside a 5.0 project install is not described as shadowing', () => {
  const home = tmp();
  const repo = tmp();
  plantV4(path.join(home, '.claude', 'commands'));
  const g = path.join(home, '.claude', 'setup', 'slashforge');
  fs.mkdirSync(g, { recursive: true });
  fs.writeFileSync(path.join(g, 'slashforge-workflow.md'), 'old');
  fs.writeFileSync(path.join(g, 'meta.json'), JSON.stringify({ version: '4.5.0' }));
  const out = execFileSync('node', [BIN, '--project', '--yes'], { env: envFor(home), cwd: repo, encoding: 'utf8' });
  assert.doesNotMatch(out, /runs instead/);
  assert.match(out, /4\.x.*both|both.*4\.x/is);
  assert.match(out, /npx slashforge\b(?! --project)/, 'says how to update the global one');
});

test('status counts only kit guides in a host folder', () => {
  const home = tmp();
  execFileSync('node', [BIN, '--yes'], { env: envFor(home) });
  const cursor = path.join(home, '.agents', 'setup', 'slashforge', 'cursor');
  const before = execFileSync('node', [BIN, 'status'], { env: envFor(home), encoding: 'utf8' }).match(/Guide files \(cursor\): (\d+)/)[1];
  fs.writeFileSync(path.join(cursor, 'my-notes.md'), 'mine');
  const after = execFileSync('node', [BIN, 'status'], { env: envFor(home), encoding: 'utf8' }).match(/Guide files \(cursor\): (\d+)/)[1];
  assert.equal(after, before);
});

test('status suggests re-running when a location is older than the package', () => {
  const home = tmp();
  execFileSync('node', [BIN, '--yes'], { env: envFor(home) });
  const meta = path.join(home, '.agents', 'setup', 'slashforge', 'meta.json');
  fs.writeFileSync(meta, JSON.stringify({ ...JSON.parse(fs.readFileSync(meta, 'utf8')), version: '0.0.1' }));
  const out = execFileSync('node', [BIN, 'status'], { env: envFor(home), encoding: 'utf8' });
  assert.match(out, /v0\.0\.1.*update available.*npx slashforge/s);
});

test('uninstall names the user files it kept, never the kit\'s own folders', () => {
  const home = tmp();
  execFileSync('node', [BIN, '--yes'], { env: envFor(home) });
  fs.writeFileSync(path.join(home, '.agents', 'setup', 'slashforge', 'cursor', 'notes.md'), 'mine');
  const out = execFileSync('node', [BIN, 'uninstall', '--yes'], { env: envFor(home), encoding: 'utf8' });
  const kept = out.split('\n').filter((l) => l.includes('kept'));
  assert.equal(kept.length, 1, `one kept line, got:\n${kept.join('\n')}`);
  assert.match(kept[0], /cursor.*notes\.md/);
});

test('a dangling symlink in the .agents guides root does not break the install', () => {
  const home = tmp();
  const root = path.join(home, '.agents', 'setup', 'slashforge');
  fs.mkdirSync(root, { recursive: true });
  fs.symlinkSync(path.join(home, 'nowhere'), path.join(root, 'broken-link'));
  const a = resolveAgents({ homeDir: home, cwd: home });
  assert.doesNotThrow(() => installAgentsFiles(a, {}));
});

test('uninstall leaves no empty folders it created behind', () => {
  const home = tmp();
  execFileSync('node', [BIN, '--yes'], { env: envFor(home) });
  execFileSync('node', [BIN, 'uninstall', '--yes'], { env: envFor(home) });
  assert.ok(!fs.existsSync(path.join(home, '.agents')), '.agents emptied and removed');
  assert.ok(!fs.existsSync(path.join(home, '.claude', 'setup')), '.claude/setup emptied and removed');
});

test('setup\'s size check skips the kit\'s own flat command files in a project install', () => {
  const script = verifyScript('claude');
  const repo = tmp();
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), lines(10));
  installFiles(resolveTarget({ project: true, cwd: repo, homeDir: tmp() }), {});
  fs.appendFileSync(path.join(repo, '.claude', 'commands', 'slashforge-plan.md'), lines(300));
  const r = require('child_process').spawnSync('bash', ['-c', script], { cwd: repo, encoding: 'utf8' });
  assert.equal(r.status, 0, `the kit's files are not the repo's: ${r.stdout}`);
});

test('the Graphify guide names each host\'s own integration', () => {
  assert.match(renderAll('claude')['slashforge-graph.md'], /Claude Code Glob\/Grep hook/);
  for (const host of ['cursor', 'codex']) {
    assert.doesNotMatch(renderAll(host)['slashforge-graph.md'], /Claude Code Glob\/Grep hook/, host);
  }
  assert.match(renderAll('cursor')['slashforge-graph.md'], /\.cursor\/rules\/graphify\.mdc/);
});

// --- Remaining review items on #58 ---
test('toSkillFrontmatter finds a closing fence with trailing whitespace', () => {
  const out = toSkillFrontmatter('---\nname: /slashforge-code\ndescription: d\n---  \nbody\n', 'slashforge-code');
  assert.match(out, /^name: slashforge-code$/m);
});

// The validator and the stripper must agree on what a marker is: one it accepts
// but the stripper cannot see ships to every host as raw text.
test('a target marker that is not on its own line is refused', () => {
  const inline = 'text <!--target:claude-->x<!--/target--> more\n';
  assert.ok(findTargetBlockErrors(inline, 'f.md').length > 0, 'inline marker must be an error');
});

test('a template saved with Windows line endings renders like any other', () => {
  const src = '---\r\nname: x\r\ndescription: d\r\n---\r\nshared\r\n<!--target:claude-->\r\nclaude only\r\n<!--/target-->\r\n<!--target:cursor-->\r\ncursor only\r\n<!--/target-->\r\n';
  assert.deepEqual(findTargetBlockErrors(src, 'f.md'), []);
  const out = renderTemplate(src, { installPath: '/p', version: '0', pkgName: 'x', targetName: 'claude' });
  assert.ok(out.includes('claude only') && !out.includes('cursor only'), out);
  assert.ok(!out.includes('<!--'), 'no marker survives');
});

// --- 5.0: kit files are slashforge-*, not forge-* ---
const OLD_KIT_NAMES = ['forge-workflow.md', 'forge-instructions.md', 'forge-open.sh', 'forge-splice.js',
  'forge-report-shell.html', 'forge-review-payload.js', 'forge-setup-flow.md'];

function allFiles(dir) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else out.push(p);
    }
  })(dir);
  return out;
}

test('every installed kit file is named slashforge-*, none forge-*', () => {
  const home = tmp();
  installFiles(resolveTarget({ homeDir: home, cwd: home }), {});
  installAgentsFiles(resolveAgents({ homeDir: home, cwd: home }), {});
  const bad = allFiles(home).map((p) => path.basename(p)).filter((n) => /^forge-/.test(n));
  assert.deepEqual([...new Set(bad)], [], 'forge-* files installed');
  const guides = fs.readdirSync(path.join(home, '.claude', 'setup', 'slashforge'));
  assert.ok(guides.includes('slashforge-workflow.md') && guides.includes('slashforge-splice.js'));
});

test('no installed file names a forge-* kit file', () => {
  const home = tmp();
  installFiles(resolveTarget({ homeDir: home, cwd: home }), {});
  installAgentsFiles(resolveAgents({ homeDir: home, cwd: home }), {});
  const RE = /(?<![a-z])forge-[a-z0-9-]+\.(md|sh|js|html)\b/;
  const hits = allFiles(home).filter((p) => !p.endsWith('meta.json') && RE.test(fs.readFileSync(p, 'utf8')))
    .map((p) => `${path.relative(home, p)}: ${fs.readFileSync(p, 'utf8').match(RE)[0]}`);
  assert.deepEqual(hits, []);
});

test('upgrading removes the old forge-* kit files and keeps user files', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  const a = resolveAgents({ homeDir: home, cwd: home });
  for (const dir of [claude.guidesDir, ...a.hosts.map((h) => h.guidesDir)]) {
    fs.mkdirSync(dir, { recursive: true });
    for (const n of OLD_KIT_NAMES) fs.writeFileSync(path.join(dir, n), 'old');
    fs.writeFileSync(path.join(dir, 'my-notes.md'), 'mine');
  }
  installFiles(claude, {});
  installAgentsFiles(a, {});
  for (const dir of [claude.guidesDir, ...a.hosts.map((h) => h.guidesDir)]) {
    const left = fs.readdirSync(dir);
    assert.deepEqual(left.filter((n) => /^forge-/.test(n)), [], `${dir} still has forge-* files`);
    assert.ok(left.includes('my-notes.md'), 'user file kept');
  }
});

test('uninstall removes forge-* leftovers as well as slashforge-* files', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  installFiles(claude, {});
  for (const n of OLD_KIT_NAMES) fs.writeFileSync(path.join(claude.guidesDir, n), 'old');
  uninstallFiles(claude, {});
  assert.ok(!fs.existsSync(claude.guidesDir), 'every kit file, old or new, is gone');
});

// status must describe an install made by an older release, not report it as
// empty or absent — the CLI reference promises it recognises earlier layouts.
function statusOf(home) {
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  return execFileSync('node', [BIN, 'status'], { env, encoding: 'utf8' });
}

test('status reports a 4.x install by its old command names', () => {
  const home = tmp();
  const guides = path.join(home, '.claude', 'setup', 'slashforge');
  fs.mkdirSync(guides, { recursive: true });
  fs.writeFileSync(path.join(guides, 'forge-workflow.md'), '---\nname: x\ndescription: y\n---\n');
  fs.writeFileSync(path.join(guides, 'meta.json'), JSON.stringify({ version: '4.5.0' }));
  const cmds = path.join(home, '.claude', 'commands', 'slashforge');
  fs.mkdirSync(cmds, { recursive: true });
  fs.writeFileSync(path.join(cmds, 'code.md'), 'x');
  fs.writeFileSync(path.join(cmds, 'tdd.md'), 'x');
  const out = statusOf(home);
  assert.match(out, /Guide files:\s+1/, 'the forge-* guide is counted');
  assert.match(out, /\/slashforge:code/, 'the 4.x command is named as it is typed');
  assert.match(out, /4\.x/, 'the old commands are labelled as 4.x');
  assert.match(out, /npx slashforge/, 'it says how to upgrade');
});

test('status reports a v2 install rather than "not installed"', () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, '.claude', 'setup', 'claude-setup'), { recursive: true });
  fs.mkdirSync(path.join(home, '.claude', 'commands'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commands', 'setup-claude.md'), 'x');
  const out = statusOf(home);
  assert.doesNotMatch(out, /not installed\./, 'a v2 install is not "not installed"');
  assert.match(out, /v2/, 'it is labelled as v2');
  assert.match(out, /setup-claude/, 'the v2 command is named');
});

test('status reports a v3 install by its forge commands', () => {
  const home = tmp();
  fs.mkdirSync(path.join(home, '.claude', 'commands', 'forge'), { recursive: true });
  fs.writeFileSync(path.join(home, '.claude', 'commands', 'forge', 'code.md'), 'x');
  const out = statusOf(home);
  assert.doesNotMatch(out, /not installed\./);
  assert.match(out, /\/forge:code/, 'the v3 command is named as it is typed');
});
