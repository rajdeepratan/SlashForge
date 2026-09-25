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
  toSkillCommandRefs,
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
  'review-pr.md': 'forge-workflow-review-pr.md',
  'investigate.md': 'forge-workflow-investigation.md',
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

// A guide may point at a sibling by absolute path — forge-workflow-review-pr.md
// names forge-report-shell.html that way. If guides were copied rather than
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
  for (const flow of ['forge-workflow-review-pr.md', 'forge-workflow-investigation.md']) {
    const body = fs.readFileSync(path.join(target.guidesDir, flow), 'utf8');
    assert.ok(
      body.includes(`${target.installPath}/forge-splice.js`),
      `${flow} must resolve the splice script to a real installed path`,
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
  // Default target is claude, which omits the vendor entry-file guide.
  for (const g of guidesFor(resolveTarget({ project: true, cwd: tmpRepo }))) {
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
  // Derived, not hardcoded — a new command should not require editing this test.
  for (const c of COMMAND_FILES) {
    assert.ok(fs.existsSync(path.join(target.commandsDir, c)), `${c} should be installed`);
  }
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(meta.commands, COMMAND_FILES.map(commandName));
  assert.ok(meta.commands.includes('/slashforge:review-pr'));
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

// Discipline skills install into the same slashforge/ namespace dir as the three
// entry-point commands, which is what gives them a `slashforge:` invocation. They
// are deliberately NOT in COMMAND_FILES: that list drives meta.json.commands and
// the status output, and folding skills in turns a three-command report into one
// that lists every internal discipline.
test('skills install into the namespace dir with tokens rendered', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  for (const s of SKILL_FILES) {
    const dest = path.join(target.commandsDir, s);
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
  // Still namespaced, though — that is the whole point of the location.
  assert.ok(commandName(SKILL_FILES[0]).startsWith('/slashforge:'));
});

test('skills are frontmatter-validated, unlike assets', () => {
  assert.doesNotThrow(() => validateTemplates(SKILL_FILES, TEMPLATES_DIR));
  assert.throws(
    () => parseFrontmatter('no frontmatter here', 'bad-skill.md'),
    /missing opening/,
  );
});

test('uninstall removes skills and still prunes the emptied namespace dir', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  uninstallFiles(target, {});
  for (const s of SKILL_FILES) {
    assert.ok(!fs.existsSync(path.join(target.commandsDir, s)), `skill ${s} survived uninstall`);
  }
  assert.ok(
    !fs.existsSync(path.join(target.commandsDir, 'slashforge')),
    'emptied namespace dir should be pruned',
  );
});

test('a user file in the namespace dir survives uninstall alongside skills', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home });
  installFiles(target, {});
  const mine = path.join(target.commandsDir, 'slashforge', 'mine.md');
  fs.writeFileSync(mine, 'user command');
  uninstallFiles(target, {});
  assert.ok(fs.existsSync(mine), 'user-authored command must survive');
  assert.ok(fs.existsSync(path.join(target.commandsDir, 'slashforge')), 'dir must not be pruned');
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
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'forge-report-shell.html'), 'utf8');
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
    assert.ok(body.includes('forge-splice.js'), `${file} must splice through the shipped script`);
  }
});

// Opening a document must never be able to fail the run that produced it, and the
// three writers must share one copy of the platform detection rather than each
// carrying its own — divergent copies are how the mangled-tag bug happened.
test('the open helper is shared, guarded, and always exits 0', () => {
  const helper = path.join(TEMPLATES_DIR, 'forge-open.sh');
  assert.ok(fs.existsSync(helper), 'forge-open.sh must ship');

  for (const f of ['investigate.md', 'brainstorm.md', 'plan.md']) {
    const body = commandInstruction(f);
    assert.ok(body.includes('forge-open.sh'), `${f} must call the shared helper`);
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

// forge-splice.js is what actually builds every document, so the tests run the
// shipped file rather than a copy of it, from a folder laid out like an install
// (the script finds the shell next to itself).
function spliceScript() {
  const dir = tmp();
  for (const f of ['forge-splice.js', 'forge-report-shell.html']) {
    fs.copyFileSync(path.join(TEMPLATES_DIR, f), path.join(dir, f));
  }
  return path.join(dir, 'forge-splice.js');
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
  const script = path.join(TEMPLATES_DIR, 'forge-review-payload.js');

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

test('resolveTarget agents global uses ~/.agents and the skills layout', () => {
  const t = resolveTarget({ target: 'agents', homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.guidesDir, path.join('/home/u', '.agents', 'setup', 'slashforge'));
  assert.equal(t.commandsDir, path.join('/home/u', '.agents', 'skills'));
  assert.equal(t.installPath, '/home/u/.agents/setup/slashforge');
  assert.equal(t.layout, 'skills');
  assert.equal(t.namePrefix, 'slashforge-');
});

test('resolveTarget agents project uses cwd', () => {
  const t = resolveTarget({ target: 'agents', project: true, homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.commandsDir, path.join('/repo', '.agents', 'skills'));
  assert.equal(t.installPath, '.agents/setup/slashforge');
  assert.equal(t.mode, 'project');
});

test('cursor and codex are distinct targets, still case- and space-insensitive', () => {
  for (const [name, expected] of [
    ['cursor', 'cursor'], ['codex', 'codex'], ['CURSOR', 'cursor'], [' codex ', 'codex'],
  ]) {
    assert.equal(resolveTarget({ target: name, homeDir: '/h', cwd: '/r' }).target, expected);
  }
});

test('claude stays the default and keeps the commands layout', () => {
  const t = resolveTarget({ homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.target, 'claude');
  assert.equal(t.layout, 'commands');
  assert.equal(t.namePrefix, '');
  assert.equal(t.commandsDir, path.join('/home/u', '.claude', 'commands'));
});

test('only the claude target carries a legacy guides dir', () => {
  assert.ok(resolveTarget({ homeDir: '/h', cwd: '/r' }).legacyGuidesDir);
  assert.equal(resolveTarget({ target: 'cursor', homeDir: '/h', cwd: '/r' }).legacyGuidesDir, null);
});

test('unknown target throws with the valid names listed', () => {
  assert.throws(() => resolveTarget({ target: 'vscode' }), /claude, cursor, codex, agents/);
});

test('resolveTargetName normalises aliases and rejects unknowns', () => {
  assert.equal(resolveTargetName('cursor'), 'cursor');
  assert.equal(resolveTargetName('codex'), 'codex');
  assert.equal(resolveTargetName('agents'), 'agents');
  assert.equal(resolveTargetName(undefined), 'claude');
  assert.equal(resolveTargetName(null), 'claude');
  assert.throws(() => resolveTargetName('emacs'), /Unknown target/);
});

test('agents target omits setup, claude omits no command', () => {
  assert.ok(TARGETS.agents.omit.includes(path.join('slashforge', 'setup.md')));
  // claude omits only the vendor entry-file guide, never a command.
  assert.deepEqual(TARGETS.claude.omit, ['forge-agents-md.md', 'forge-agents-codex.md']);
  assert.ok(!TARGETS.claude.omit.some((o) => o.includes('slashforge')));
});

test('agents install writes SKILL.md dirs with a rewritten name', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});
  const body = fs.readFileSync(
    path.join(home, '.agents', 'skills', 'slashforge-code', 'SKILL.md'), 'utf8');
  assert.match(body, /^name: slashforge-code$/m);
  assert.ok(!body.includes('/slashforge:code'), 'the Claude command form must be rewritten');
});

test('every installed SKILL.md name is valid and matches its parent dir', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});
  const root = path.join(home, '.agents', 'skills');
  const dirs = fs.readdirSync(root);
  assert.equal(dirs.length, COMMAND_FILES.length + SKILL_FILES.length,
    'setup installs on cursor, so every command and skill is present');
  for (const dir of dirs) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(root, dir, 'SKILL.md'), 'utf8'), dir);
    assert.match(fm.name, /^[a-z0-9-]+$/, `${dir}: name must be lowercase-hyphen only`);
    assert.equal(fm.name, dir, `${dir}: name must match its parent directory`);
  }
});

test('setup is omitted on the vendor-neutral target but present elsewhere', () => {
  const home = tmp();
  installFiles(resolveTarget({ target: 'agents', homeDir: home, cwd: home }), {});
  assert.ok(!fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-setup')),
    'no host is known on the agents target');

  const home3 = tmp();
  installFiles(resolveTarget({ target: 'cursor', homeDir: home3, cwd: home3 }), {});
  assert.ok(fs.existsSync(path.join(home3, '.agents', 'skills', 'slashforge-setup')),
    'but cursor knows its host');

  const home2 = tmp();
  installFiles(resolveTarget({ homeDir: home2, cwd: home2 }), {});
  assert.ok(fs.existsSync(path.join(home2, '.claude', 'commands', 'slashforge', 'setup.md')));
});

test('agents skills render with no leftover placeholder', () => {
  const home = tmp();
  installFiles(resolveTarget({ target: 'cursor', homeDir: home, cwd: home }), {});
  const body = fs.readFileSync(
    path.join(home, '.agents', 'skills', 'slashforge-code', 'SKILL.md'), 'utf8');
  assert.ok(!body.includes('{{INSTALL_PATH}}'));
  assert.ok(body.includes('.agents/setup/slashforge'));
});

test('agents guides are installed alongside the skills', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});
  for (const f of guidesFor(target)) {
    assert.ok(fs.existsSync(path.join(target.guidesDir, f)), `missing guide ${f}`);
  }
  for (const f of ASSET_FILES) {
    assert.ok(fs.existsSync(path.join(target.guidesDir, f)), `missing asset ${f}`);
  }
});

test('meta.json records the target and installed command names', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'codex', homeDir: home, cwd: home });
  installFiles(target, {});
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.equal(meta.target, 'codex');
  // codex fixture: Codex invokes skills with `$`, so meta.json records that form.
  assert.deepEqual(meta.commands,
    ['$slashforge-setup', '$slashforge-code', '$slashforge-investigate', '$slashforge-review-pr']);
});

test('claude meta.json keeps the colon command names', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.equal(meta.target, 'claude');
  assert.ok(meta.commands.includes('/slashforge:setup'));
});

test('skillDirName maps a template path to a prefixed dir name', () => {
  assert.equal(skillDirName(path.join('slashforge', 'code.md'), 'slashforge-'), 'slashforge-code');
  assert.equal(skillDirName(path.join('slashforge', 'code.md')), 'code');
});

test('skills layout rewrites in-body command references to the hyphen form', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});

  const skill = fs.readFileSync(
    path.join(home, '.agents', 'skills', 'slashforge-investigate', 'SKILL.md'), 'utf8');
  assert.ok(skill.includes('/slashforge-code'), 'hand-off must name the hyphenated command');
  assert.ok(!skill.includes('/slashforge:'), 'no colon form may survive on this target');

  const guide = fs.readFileSync(path.join(target.guidesDir, 'forge-workflow.md'), 'utf8');
  assert.ok(!guide.includes('/slashforge:'), 'guides must be rewritten too');
});

test('claude layout leaves command references untouched', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const guide = fs.readFileSync(path.join(target.guidesDir, 'forge-workflow.md'), 'utf8');
  assert.ok(guide.includes('/slashforge:code'), 'the colon form is correct on Claude Code');
  assert.ok(!guide.includes('/slashforge-code'));
});

test('uninstall removes only slashforge dirs from the shared skills root', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});

  const foreign = path.join(home, '.agents', 'skills', 'someone-elses-skill');
  fs.mkdirSync(foreign, { recursive: true });
  fs.writeFileSync(path.join(foreign, 'SKILL.md'), '---\nname: someone-elses-skill\ndescription: x\n---\n');

  uninstallFiles(target, {});

  assert.ok(fs.existsSync(foreign), 'a foreign skill must survive uninstall');
  assert.ok(!fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-code')));
  assert.ok(!fs.existsSync(target.guidesDir), 'guides must be removed');
});

test('uninstall prunes the skills root only when it is left empty', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(target, {});
  uninstallFiles(target, {});
  assert.ok(!fs.existsSync(path.join(home, '.agents', 'skills')),
    'an emptied skills root should be pruned');
});

test('uninstall on the agents target never touches .claude', () => {
  const home = tmp();
  const claude = resolveTarget({ homeDir: home, cwd: home });
  installFiles(claude, {});
  const agents = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  installFiles(agents, {});

  uninstallFiles(agents, {});

  assert.ok(fs.existsSync(path.join(home, '.claude', 'commands', 'slashforge', 'code.md')),
    'the Claude install must be untouched');
  assert.ok(fs.existsSync(claude.guidesDir));
});

test('parseTargetArg reads both flag forms and defaults to claude', () => {
  assert.equal(parseTargetArg(['--target', 'cursor']), 'cursor');
  assert.equal(parseTargetArg(['--target=codex']), 'codex');
  assert.equal(parseTargetArg(['--project']), 'claude');
  assert.equal(parseTargetArg([]), 'claude');
});

test('plannedWrites for the agents target names skill paths and skips setup', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'agents', homeDir: home, cwd: home });
  const writes = plannedWrites(target, {});
  assert.ok(writes.some((w) => w.dest.endsWith(path.join('slashforge-code', 'SKILL.md'))));
  assert.ok(!writes.some((w) => w.dest.includes('slashforge-setup')));
  assert.ok(writes.some((w) => w.kind === 'asset'), 'assets must be listed');
  assert.ok(writes.some((w) => w.kind === 'meta'));
});

test('dry-run with --target cursor writes nothing', () => {
  const home = tmp();
  const out = execFileSync(process.execPath, [BIN, '--dry-run', '--target', 'cursor'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' },
  });
  assert.match(out, /slashforge-code/);
  assert.match(out, /slashforge-setup/, 'setup installs on cursor');
  assert.ok(!fs.existsSync(path.join(home, '.agents')), 'dry-run must not create files');
});

test('an unknown target exits 1 with the valid names', () => {
  assert.throws(
    () => execFileSync(process.execPath, [BIN, '--target', 'vscode'], {
      encoding: 'utf8', stdio: 'pipe',
      env: { ...process.env, SLASHFORGE_YES: '1', SLASHFORGE_NO_UPDATE_CHECK: '1' },
    }),
    (err) => {
      assert.equal(err.status, 1);
      assert.match(err.stderr, /claude, cursor, codex, agents/);
      return true;
    });
});

test('status reports the vendor target after installing to it', () => {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_YES: '1', SLASHFORGE_NO_UPDATE_CHECK: '1' };
  execFileSync(process.execPath, [BIN, '--target', 'cursor'], { encoding: 'utf8', env });
  const out = execFileSync(process.execPath, [BIN, 'status', '--target', 'cursor'], { encoding: 'utf8', env });
  // Names the vendor the user asked for, not the install layout it shares with codex.
  assert.match(out, /Target:\s+cursor/);
  assert.match(out, /\/slashforge-code/);
  assert.ok(!out.includes('/slashforge:code'));
});

test('install summary lists the paths it actually wrote', () => {
  const home = tmp();
  const out = execFileSync(process.execPath, [BIN, '--target', 'cursor'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_YES: '1', SLASHFORGE_NO_UPDATE_CHECK: '1' },
  });
  const listed = out.split('\n').filter((l) => l.startsWith('✓ Command:'));
  assert.ok(listed.length > 0, 'commands should be listed');
  for (const line of listed) {
    const p = line.replace('✓ Command:', '').trim();
    assert.ok(fs.existsSync(p), `summary names a path that was not written: ${p}`);
  }
  assert.ok(out.includes('slashforge-setup'), 'setup is installed on cursor and must be listed');
});

test('the completion message does not name the wrong vendor', () => {
  const run = (t) => {
    const home = tmp();
    return execFileSync(process.execPath, [BIN, '--target', t], {
      encoding: 'utf8',
      env: { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_YES: '1', SLASHFORGE_NO_UPDATE_CHECK: '1' },
    });
  };
  const codex = run('codex');
  assert.ok(!/Open Cursor/.test(codex), 'a codex install must not tell the user to open Cursor');
  assert.match(codex, /Cursor and Codex/);
  assert.match(run('cursor'), /Cursor and Codex/);
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

test('core workflow guides dispatch no agents on the agents target', () => {
  const rendered = renderAll('agents');
  for (const file of ['forge-workflow.md', 'forge-workflow-agents.md']) {
    const body = rendered[file];
    assert.ok(!/Invoke the `git` agent/.test(body), `${file}: git agent dispatch`);
    assert.ok(!/`code-reviewer` agent/.test(body), `${file}: code-reviewer dispatch`);
    assert.ok(!/\.claude\/agents\//.test(body), `${file}: names .claude/agents/`);
    assert.ok(!/create it on the fly|create it silently/.test(body), `${file}: creates agents`);
  }
});

test('core workflow guides keep agent dispatch on the claude target', () => {
  const rendered = renderAll('claude');
  assert.match(rendered['forge-workflow.md'], /Invoke the `git` agent to push/);
  assert.match(rendered['forge-workflow.md'], /`code-reviewer` agent/);
  assert.match(rendered['forge-workflow-agents.md'], /\.claude\/agents\//);
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

test('remaining guides and code.md dispatch no agents on the agents target', () => {
  const rendered = renderAll('agents');
  const files = [
    'forge-workflow-quick.md',
    'forge-workflow-investigation.md',
    'forge-workflow-review-pr.md',
    path.join('slashforge', 'code.md'),
  ];
  for (const file of files) {
    const body = rendered[file];
    assert.ok(!/`code-reviewer` agent/.test(body), `${file}: code-reviewer dispatch`);
    assert.ok(!/the `git` agent/.test(body), `${file}: git agent dispatch`);
    assert.ok(!/Agent Selection Table/.test(body), `${file}: names the agent table`);
  }
});

// --- Task 6: parallel.md, and the whole-feature sweep -------------------------

test('no rendered file dispatches an agent on the agents target', () => {
  const banned = [
    /\bdispatch(?:ing|es)? (?:one |a |an )?(?:fresh )?agents?\b/i,
    /`code-reviewer` agent/,
    /the `git` agent/,
    /\.claude\/agents\//,
    /create it on the fly/i,
    /create it silently/i,
  ];
  // Scoped to what a model on this target can actually reach. The eight
  // setup-only guides ship unmodified by decision — parity with Claude Code —
  // and nothing on the agents target references them, since setup is omitted.
  // forge-coverage.md is reachable and still Claude-specific; that one is an
  // open question, not an oversight.
  const unreachable = new Set([
    'forge-instructions.md', 'forge-rules.md', 'forge-skills.md', 'forge-agents.md',
    'forge-commands.md', 'forge-hooks.md', 'forge-claude-md.md', 'forge-memory.md',
    'forge-coverage.md',
    // Vendor-specific splits: both are in the agents target's omit list, so they
    // are never installed here and cannot be reached. They describe real subagent
    // systems (Cursor's and Codex's), which is exactly what this target lacks.
    'forge-agents-md.md', 'forge-agents-codex.md',
  ]);
  for (const [file, body] of Object.entries(renderAll('agents'))) {
    if (unreachable.has(file) || file === path.join('slashforge', 'setup.md')) continue;
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
  assert.deepEqual(blockNamesFor('agents'), ['agents', 'neutral']);
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

test('cursor and codex share the agents install location', () => {
  for (const name of ['cursor', 'codex', 'agents']) {
    const t = resolveTarget({ target: name, homeDir: '/home/u', cwd: '/repo' });
    assert.equal(t.guidesDir, path.join('/home/u', '.agents', 'setup', 'slashforge'));
    assert.equal(t.commandsDir, path.join('/home/u', '.agents', 'skills'));
    assert.equal(t.installPath, '/home/u/.agents/setup/slashforge');
    assert.equal(t.layout, 'skills');
    assert.equal(t.namePrefix, 'slashforge-');
    assert.equal(t.legacyGuidesDir, null);
  }
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
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  target.omit = ['forge-memory.md'];
  installFiles(target, {});
  assert.ok(!fs.existsSync(path.join(target.guidesDir, 'forge-memory.md')),
    'an omitted guide must not be written');
  assert.ok(fs.existsSync(path.join(target.guidesDir, 'forge-rules.md')),
    'guides not in the omit list still install');
});

test('omitting a guide does not omit the commands', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  target.omit = ['forge-memory.md'];
  installFiles(target, {});
  assert.ok(fs.existsSync(path.join(target.commandsDir, 'slashforge-code', 'SKILL.md')));
});

test('the install summary does not list an omitted guide', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  target.omit = ['forge-memory.md'];
  const written = installFiles(target, {});
  assert.ok(!written.some((w) => w.endsWith('forge-memory.md')),
    'a skipped guide must not appear in the written list');
});

test('plannedWrites agrees with installFiles about omitted guides', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'cursor', homeDir: home, cwd: home });
  target.omit = ['forge-memory.md'];
  const planned = plannedWrites(target).map((w) => w.dest);
  const actual = installFiles(target, {});
  assert.ok(!planned.some((d) => d.endsWith('forge-memory.md')),
    'the dry-run must not promise a guide the install skips');
  // Everything the plan promises is actually written (meta aside, which both include).
  for (const d of planned) {
    assert.ok(actual.includes(d), `planned but not written: ${d}`);
  }
});

// --- Task 6: entry-file guide split ---

test('each target receives only its own entry-file guide', () => {
  const cases = {
    claude: ['forge-claude-md.md', 'forge-agents-md.md'],
    cursor: ['forge-agents-md.md', 'forge-claude-md.md'],
    codex: ['forge-agents-md.md', 'forge-claude-md.md'],
  };
  for (const [name, [present, absent]] of Object.entries(cases)) {
    const home = tmp();
    const target = resolveTarget({ target: name, homeDir: home, cwd: home });
    installFiles(target, {});
    assert.ok(fs.existsSync(path.join(target.guidesDir, present)), `${name} needs ${present}`);
    assert.ok(!fs.existsSync(path.join(target.guidesDir, absent)), `${name} must not get ${absent}`);
  }

  // The vendor-neutral target ships neither: setup is omitted there, so no flow
  // reaches an entry-file guide, and a Claude-specific one would just go stale.
  const home = tmp();
  const agents = resolveTarget({ target: 'agents', homeDir: home, cwd: home });
  installFiles(agents, {});
  for (const guide of ['forge-claude-md.md', 'forge-agents-md.md']) {
    assert.ok(!fs.existsSync(path.join(agents.guidesDir, guide)),
      `agents must not ship ${guide}`);
  }
});

test('the AGENTS.md guide never names a foreign vendor directory', () => {
  for (const [name, bad] of [['cursor', /\.codex\//], ['codex', /\.cursor\//]]) {
    const body = renderAll(name)['forge-agents-md.md'];
    assert.ok(body, `${name} should render the guide`);
    assert.ok(!bad.test(body), `${name} render leaks ${bad}`);
    assert.ok(!/CLAUDE\.md is the entry point/.test(body), 'must not describe CLAUDE.md as the entry');
  }
});

// forge-instructions.md's first golden rule caps every .md at 200 lines, and the
// design decision for multi-target rendering is that the cap applies to the RENDERED
// output — what an agent actually loads — not to the source, which carries every
// target's branches.
//
// Two files predate that decision and break it. They are listed here rather than
// silently skipped so the debt stays visible; the guard's job is to stop NEW files
// joining them. Shrinking these two is its own change.
const OVERSIZE_GUIDES = new Set([
  'forge-graph.md',              // 217 rendered
  'forge-workflow-review-pr.md', // 303 rendered
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
  const codex = resolveTarget({ target: 'codex', homeDir: home, cwd: home });
  installFiles(codex, {});
  const body = fs.readFileSync(path.join(codex.guidesDir, 'forge-agents-codex.md'), 'utf8');
  assert.match(body, /developer_instructions/, 'must document the TOML field');
  assert.match(body, /\.codex\/agents\//);
  assert.match(body, /\.toml/);
  assert.ok(!fs.existsSync(path.join(codex.guidesDir, 'forge-agents.md')),
    'codex must not receive the markdown subagent guide');

  for (const name of ['claude', 'cursor', 'agents']) {
    const h = tmp();
    const t = resolveTarget({ target: name, homeDir: h, cwd: h });
    installFiles(t, {});
    assert.ok(fs.existsSync(path.join(t.guidesDir, 'forge-agents.md')), `${name} needs forge-agents.md`);
    assert.ok(!fs.existsSync(path.join(t.guidesDir, 'forge-agents-codex.md')),
      `${name} must not receive the codex guide`);
  }
});

test('the markdown subagent guide names the right directory per target', () => {
  const claude = renderAll('claude')['forge-agents.md'];
  assert.match(claude, /\.claude\/agents\//);
  assert.ok(!/\.cursor\//.test(claude), 'claude render must not mention .cursor');

  const cursor = renderAll('cursor')['forge-agents.md'];
  assert.match(cursor, /\.cursor\/agents\//);
  assert.ok(!/CLAUDE\.md/.test(cursor), 'cursor render must not cite CLAUDE.md');
  // One mention of .claude/agents/ is correct here: Cursor reads it too, and the
  // guide has to say .cursor/ wins. What it must never do is send you there.
  assert.ok(!/→ \.claude\//.test(cursor), 'cursor render must not target .claude in an example');
  assert.ok(!/Read `\.claude\//.test(cursor), 'cursor render must not send you to read .claude');
  assert.equal((cursor.match(/\.claude\//g) || []).length, 1,
    'exactly one .claude mention, the precedence note');
});

// forge-coverage.md cites this guide, and coverage is read by forge-workflow.md —
// so the vendor-neutral `agents` target reaches it through /slashforge:code and its
// render has to stand on its own without naming any vendor directory.
test('the markdown subagent guide still reads coherently on the agents target', () => {
  const body = renderAll('agents')['forge-agents.md'];
  assert.ok(!/\.claude\/|\.cursor\/|\.codex\//.test(body), 'agents render must name no vendor dir');
  for (const heading of ['Global Agents', 'Specialist Agents', 'Reference Style', 'File Skeleton']) {
    assert.ok(body.includes(heading), `agents render lost the "${heading}" section`);
  }
  assert.match(body, /code-reviewer/, 'agents render must keep the mandatory reviewer');
});

// A neutral block is the vendor-neutral fallback. It must NOT be inherited by the
// vendors — that is the whole reason it exists rather than reusing 'agents'.
test('a neutral block renders only on the vendor-neutral target', () => {
  const src = [
    'shared',
    '<!--target:neutral-->', 'generic wording', '<!--/target-->',
    '<!--target:cursor-->', 'cursor wording', '<!--/target-->',
    '<!--target:claude-->', 'claude wording', '<!--/target-->',
  ].join('\n') + '\n';
  assert.equal(stripTargetBlocks(src, 'agents'), 'shared\ngeneric wording\n');
  assert.equal(stripTargetBlocks(src, 'cursor'), 'shared\ncursor wording\n');
  assert.equal(stripTargetBlocks(src, 'codex'), 'shared\n');
  assert.equal(stripTargetBlocks(src, 'claude'), 'shared\nclaude wording\n');
});

test('neutral is a block name but never an install target', () => {
  assert.ok(!Object.keys(TARGETS).includes('neutral'), 'nothing may install as neutral');
  assert.throws(() => resolveTarget({ target: 'neutral' }), /Unknown target/);
  const src = '<!--target:neutral-->\nx\n<!--/target-->\n';
  assert.deepEqual(findTargetBlockErrors(src, 'f.md'), [], 'but it is a valid marker');
});

// --- Task 5: setup on the vendor targets ---

test('setup installs as a skill on cursor and codex', () => {
  for (const name of ['cursor', 'codex']) {
    const home = tmp();
    const target = resolveTarget({ target: name, homeDir: home, cwd: home });
    installFiles(target, {});
    const skill = path.join(target.commandsDir, 'slashforge-setup', 'SKILL.md');
    assert.ok(fs.existsSync(skill), `${name} should install setup`);
    assert.match(fs.readFileSync(skill, 'utf8'), /^name: slashforge-setup$/m);
  }
});

test('setup stays omitted on the vendor-neutral agents target', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'agents', homeDir: home, cwd: home });
  installFiles(target, {});
  assert.ok(!fs.existsSync(path.join(target.commandsDir, 'slashforge-setup')),
    'no host is known on this target, so there is no layout to scaffold');
});

// The strongest guard on the read list: a guide named in the rendered setup must
// be a guide this target actually receives, or the agent is sent to read a file
// that is not on disk.
test('every guide setup tells you to read is installed for that target', () => {
  for (const name of ['claude', 'cursor', 'codex']) {
    const home = tmp();
    const target = resolveTarget({ target: name, homeDir: home, cwd: home });
    installFiles(target, {});
    const body = fs.readFileSync(
      target.layout === 'skills'
        ? path.join(target.commandsDir, 'slashforge-setup', 'SKILL.md')
        : path.join(target.commandsDir, 'slashforge', 'setup.md'),
      'utf8');
    const referenced = [...body.matchAll(/forge-[a-z0-9-]+\.md/g)].map((m) => m[0]);
    assert.ok(referenced.length > 5, `${name}: expected a real read list`);
    for (const guide of new Set(referenced)) {
      assert.ok(fs.existsSync(path.join(target.guidesDir, guide)),
        `${name}: setup reads ${guide}, which is not installed here`);
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
  const claude = renderAll('claude')['forge-instructions.md'];
  assert.match(claude, /CLAUDE\.md/);
  assert.match(claude, /\.claude\/rules\//);
  assert.ok(!/\.cursor\/|\.codex\//.test(claude), 'claude render leaks a vendor dir');

  const cursor = renderAll('cursor')['forge-instructions.md'];
  assert.match(cursor, /AGENTS\.md/);
  assert.match(cursor, /\.cursor\/rules\/\*\.mdc/);
  assert.ok(!/\.claude\/|\.codex\//.test(cursor), 'cursor render leaks a foreign dir');

  const codex = renderAll('codex')['forge-instructions.md'];
  assert.match(codex, /AGENTS\.md/);
  assert.match(codex, /\.codex\/agents\/\*\.toml/);
  assert.ok(!/\.claude\/|\.cursor\//.test(codex), 'codex render leaks a foreign dir');
});

// Reachable on the vendor-neutral target through forge-coverage.md, so it has to
// stand on its own there without naming any vendor directory.
test('instructions stay coherent on the vendor-neutral target', () => {
  const body = renderAll('agents')['forge-instructions.md'];
  assert.ok(!/\.claude\/|\.cursor\/|\.codex\//.test(body), 'agents render must name no vendor dir');
  assert.ok(!/CLAUDE\.md/.test(body), 'and must not name a vendor entry file');
});

test('every target keeps all seven golden rules and the core sections', () => {
  for (const name of ['claude', 'agents', 'cursor', 'codex']) {
    const body = renderAll(name)['forge-instructions.md'];
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
    agents: /\.claude\/|\.cursor\/|\.codex\/|CLAUDE\.md/,
  };
  // forge-agents.md legitimately cites .claude/agents/ once on cursor, to say
  // .cursor/ wins on a name conflict. That precedence note is the only exemption.
  const exempt = new Set([
    'forge-agents.md',
    // Name CLAUDE.md on purpose: the coexistence instruction tells the vendor
    // setup not to rewrite a Claude Code setup's entry file without asking.
    'forge-agents-md.md',
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
      assert.ok(!bad.test(body), `${name}/${file} names a foreign target directory`);
    }
  }
});

test('the rules guide carries each host real rules mechanism', () => {
  const cursor = renderAll('cursor')['forge-rules.md'];
  assert.match(cursor, /\.mdc/, 'cursor rules are .mdc');
  assert.match(cursor, /silently ignored|is ignored/, 'must warn that a plain .md is ignored');
  assert.match(cursor, /alwaysApply/, 'must document the frontmatter');
  assert.match(cursor, /globs/);

  const codex = renderAll('codex')['forge-rules.md'];
  assert.match(codex, /nested `AGENTS\.md`/, 'codex rules are nested AGENTS.md');
  assert.match(codex, /no rules directory/, 'must say there is no rules dir');
  assert.ok(!/\.mdc/.test(codex), 'codex has no .mdc');
});

test('the commands guide tells codex not to create commands', () => {
  const codex = renderAll('codex')['forge-commands.md'];
  assert.match(codex, /deprecated/, 'must say prompts are deprecated');
  assert.match(codex, /skill/i, 'must redirect to skills');

  const cursor = renderAll('cursor')['forge-commands.md'];
  assert.match(cursor, /\.cursor\/commands\//);
});

test('the hooks guide carries each host hook file and gate', () => {
  const cursor = renderAll('cursor')['forge-hooks.md'];
  assert.match(cursor, /\.cursor\/hooks\.json/);

  const codex = renderAll('codex')['forge-hooks.md'];
  assert.match(codex, /\.codex\/hooks\.json/);
  // Hooks left beta: on by default, behind `[features] hooks`, not `codex_hooks`.
  assert.match(codex, /hooks = true/, 'must name the feature flag');
  assert.doesNotMatch(codex, /codex_hooks/, 'the old beta flag name is gone');
});

// The event names, config shape and exit codes used to be shared by every target,
// which gave Cursor Claude Code's hook model: a .cursor/hooks.json with PostToolUse
// and a nested hooks array, which Cursor never fires.
test('the cursor hooks guide describes Cursor\'s schema, not Claude Code\'s', () => {
  const cursor = renderAll('cursor')['forge-hooks.md'];
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
  const claude = renderAll('claude')['forge-hooks.md'];
  for (const s of ['PostToolUse', 'settings.json', '$CLAUDE_PROJECT_DIR', 'disableAllHooks']) {
    assert.ok(claude.includes(s), `claude render lost ${s}`);
  }
  assert.ok(!claude.includes('beforeShellExecution'));
});

test('the codex hooks guide uses Codex\'s handler types and a git-root path', () => {
  const codex = renderAll('codex')['forge-hooks.md'];
  assert.match(codex, /mcp_tool/);
  assert.ok(!codex.includes('"type": "http"') && !/\| `agent` \|/.test(codex), 'Codex has no http or agent hooks');
  assert.match(codex, /git rev-parse --show-toplevel/);
  const m = codex.match(/```json\n([\s\S]*?)```/);
  assert.ok(m && JSON.parse(m[1]).hooks, 'the codex example must parse');
});

test('the skills guide names each host skills directory', () => {
  assert.match(renderAll('cursor')['forge-skills.md'], /\.cursor\/skills\//);
  assert.match(renderAll('codex')['forge-skills.md'], /\.agents\/skills\//);
  for (const name of ['cursor', 'codex']) {
    assert.match(renderAll(name)['forge-skills.md'], /must match the parent|match its parent/,
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
    const body = renderAll(name)['forge-graph.md'];
    assert.ok(body.includes(cmd), `${name} should run ${cmd}`);
    for (const other of Object.values(expected)) {
      if (other !== cmd) assert.ok(!body.includes(other), `${name} must not run ${other}`);
    }
  }
});

test('the graphify guide states what each host integration writes', () => {
  const cursor = renderAll('cursor')['forge-graph.md'];
  assert.match(cursor, /\.cursor\/rules\/graphify\.mdc/, 'cursor gets a rule file');

  const codex = renderAll('codex')['forge-graph.md'];
  assert.match(codex, /AGENTS\.md/, 'codex gets an AGENTS.md section');
  assert.match(codex, /hooks\.json|PreToolUse/, 'and a PreToolUse hook');
});

test('the ordering rule survives on every target', () => {
  for (const name of ['claude', 'cursor', 'codex']) {
    const body = renderAll(name)['forge-graph.md'];
    assert.match(body, /Hook-in/, `${name}: the hook-in half must still exist`);
    assert.match(body, /LAST|last/, `${name}: and must still run last`);
  }
});

// --- Codex invocation sigil ---

// Codex invokes skills with `$`, not `/` — docs-targets.test.js asserts
// commandForm('code','codex') === '$slashforge-code'. The installed prose has to
// agree, or the guide names a form the host does not accept.
test('codex cross-references use the $ sigil, cursor keeps /', () => {
  assert.equal(toSkillCommandRefs('see /slashforge:code now', 'slashforge-', 'codex'),
    'see $slashforge-code now');
  assert.equal(toSkillCommandRefs('see /slashforge:code now', 'slashforge-', 'cursor'),
    'see /slashforge-code now');
  assert.equal(toSkillCommandRefs('see /slashforge:code now', 'slashforge-', 'agents'),
    'see /slashforge-code now');
});

test('installed codex guides never name the slash form of a command', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'codex', homeDir: home, cwd: home });
  installFiles(target, {});
  for (const f of fs.readdirSync(target.guidesDir)) {
    if (!f.endsWith('.md')) continue;
    const body = fs.readFileSync(path.join(target.guidesDir, f), 'utf8');
    assert.ok(!/\/slashforge-[a-z]/.test(body),
      `${f}: names /slashforge-* but Codex invokes skills with $`);
  }
  const skill = path.join(target.commandsDir, 'slashforge-code', 'SKILL.md');
  assert.ok(!/\/slashforge-[a-z]/.test(fs.readFileSync(skill, 'utf8')),
    'SKILL.md bodies must use the $ form too');
});

test('meta.json and status report the host invocation form', () => {
  const home = tmp();
  const target = resolveTarget({ target: 'codex', homeDir: home, cwd: home });
  installFiles(target, {});
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(meta.commands,
    ['$slashforge-setup', '$slashforge-code', '$slashforge-investigate', '$slashforge-review-pr']);

  const home2 = tmp();
  const cursor = resolveTarget({ target: 'cursor', homeDir: home2, cwd: home2 });
  installFiles(cursor, {});
  const meta2 = JSON.parse(fs.readFileSync(cursor.metaFile, 'utf8'));
  assert.equal(meta2.commands[1], '/slashforge-code', 'cursor keeps the slash');
});

// --- Findings from the SlashForge 4.4.3 course audit ---

// The dry run used to be a second list that drifted from the real install. Both
// now come from plannedWrites, but only a two-way comparison stops the drift from
// coming back: the old bug was a file the install wrote and the preview never named.
test('plannedWrites and installFiles name exactly the same files, on every target', () => {
  for (const name of Object.keys(TARGETS)) {
    const home = tmp();
    const target = resolveTarget({ target: name, homeDir: home, cwd: home });
    const planned = plannedWrites(target).map((w) => w.dest).sort();
    const actual = installFiles(target, {}).slice().sort();
    assert.deepEqual(planned, actual, `${name}: dry run and install disagree`);
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
  assert.match(stdout, /render\s+forge-workflow\.md/);
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
  const guide = fs.readFileSync(path.join(target.guidesDir, 'forge-instructions.md'), 'utf8');
  assert.ok(guide.includes('| Skills | `.claude/skills/<name>/SKILL.md` |'), 'skills row still the flat form');
  assert.ok(!guide.includes('.claude/skills/*.md'), 'the flat skills form is still named');
  const skills = fs.readFileSync(path.join(target.guidesDir, 'forge-skills.md'), 'utf8');
  assert.ok(/500 lines/.test(guide) && /500 lines/.test(skills), 'the SKILL.md limit must match in both guides');
});

// Setup's Step 9 is the only thing that checks the size rule. It used a ** glob,
// which bash without globstar treats as one folder deep, so SKILL.md was never
// counted. The test runs the rendered command itself, under bash.
function verifyScript(targetName) {
  const home = tmp();
  const target = resolveTarget({ target: targetName, homeDir: home, cwd: home });
  installFiles(target, {});
  const guide = fs.readFileSync(path.join(target.guidesDir, 'forge-instructions.md'), 'utf8');
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
  const helper = path.join(TEMPLATES_DIR, 'forge-open.sh');
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
      commandInstruction(f).includes('node "{{INSTALL_PATH}}/forge-splice.js"'),
      `${f} must splice through forge-splice.js`,
    );
  }
  assert.ok(
    commandInstruction('review-pr.md').includes('node "{{INSTALL_PATH}}/forge-review-payload.js"'),
    'review-pr must assemble its payload through forge-review-payload.js',
  );
});

test('forge-review-payload.js builds the review JSON from the files', () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, 'body.txt'), 'Top "level" $& body');
  fs.writeFileSync(path.join(d, 'c1.txt'), 'first\nfinding');
  fs.writeFileSync(path.join(d, 'anchors.json'), JSON.stringify([
    { path: 'src/x.js', line: 42, bodyFile: 'c1.txt' },
  ]));
  const out = path.join(d, 'payload.json');
  execFileSync('node', [path.join(TEMPLATES_DIR, 'forge-review-payload.js'), d, 'COMMENT', out]);
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

// Cursor and Codex share ~/.agents but render different guides and commands for
// the same files, so installing one over the other replaced it silently: Cursor's
// setup would then follow Codex's instructions (TOML subagents, $-invocation).
// One vendor install per location, and switching it takes an explicit yes.
function agentsEnv() {
  const home = tmp();
  const env = { ...process.env, HOME: home, USERPROFILE: home, SLASHFORGE_NO_UPDATE_CHECK: '1' };
  delete env.SLASHFORGE_YES;
  const guides = path.join(home, '.agents', 'setup', 'slashforge');
  const metaTarget = () => JSON.parse(fs.readFileSync(path.join(guides, 'meta.json'), 'utf8')).target;
  return { home, env, guides, metaTarget };
}
const runCli = (args, env) => require('child_process').spawnSync('node', [BIN, ...args], {
  env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
});

test('installing a different vendor target over another refuses without a yes', () => {
  const { env, guides, metaTarget } = agentsEnv();
  assert.equal(runCli(['--target', 'cursor'], env).status, 0);

  const r = runCli(['--target', 'codex'], env);
  assert.notEqual(r.status, 0, 'switching targets without a terminal must not happen silently');
  assert.match(r.stderr + r.stdout, /cursor/);
  assert.match(r.stderr + r.stdout, /--yes/);
  assert.equal(metaTarget(), 'cursor', 'the cursor install must be left as it was');
  assert.ok(fs.existsSync(path.join(guides, 'forge-agents.md')), "cursor's guide must survive");
});

test('an explicit --yes replaces the other vendor install and says so', () => {
  const { env, guides, metaTarget } = agentsEnv();
  runCli(['--target', 'cursor'], env);
  const r = runCli(['--target', 'codex', '--yes'], env);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /replac/i);
  assert.equal(metaTarget(), 'codex');
  assert.ok(fs.existsSync(path.join(guides, 'forge-agents-codex.md')));
});

test('updating the same vendor target without a terminal still needs no flag', () => {
  const { env, metaTarget } = agentsEnv();
  runCli(['--target', 'codex'], env);
  const r = runCli(['--target', 'codex'], env);
  assert.equal(r.status, 0, r.stderr);
  assert.equal(metaTarget(), 'codex');
});

test('a dry run over another vendor target warns and writes nothing', () => {
  const { env, guides, metaTarget } = agentsEnv();
  runCli(['--target', 'cursor'], env);
  const before = fs.readFileSync(path.join(guides, 'meta.json'), 'utf8');
  const r = runCli(['--target', 'codex', '--dry-run'], env);
  assert.equal(r.status, 0);
  assert.match(r.stdout, /cursor/);
  assert.equal(fs.readFileSync(path.join(guides, 'meta.json'), 'utf8'), before);
  assert.equal(metaTarget(), 'cursor');
});

test('status reports the target actually installed, not the one asked about', () => {
  const { env } = agentsEnv();
  runCli(['--target', 'codex'], env);
  const r = runCli(['status', '--target', 'cursor'], env);
  assert.match(r.stdout, /Target:\s+codex/, 'status must report the installed target');
  assert.match(r.stdout, /cursor/, 'and say it differs from the one asked about');
});

test('the closing message names the installed host and its invocation form', () => {
  const { env } = agentsEnv();
  const cursor = runCli(['--target', 'cursor'], env).stdout;
  assert.match(cursor, /Installed for Cursor/);
  assert.match(cursor, /\/slashforge-code/);
  assert.doesNotMatch(cursor, /\$slashforge-code/);
  const codex = runCli(['--target', 'codex', '--yes'], env).stdout;
  assert.match(codex, /Installed for Codex/);
  assert.match(codex, /\$slashforge-code/);
});
