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
} = require('../bin/install.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const BIN = path.join(__dirname, '..', 'bin', 'install.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'csk-test-'));
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

// A guide may point at a sibling by absolute path — forge-workflow-review-pr.md
// names forge-report-shell.html that way. If guides were copied rather than
// rendered, the installed guide would carry a literal {{INSTALL_PATH}} and the
// agent would splice against a path that does not exist.
test('guide files are rendered, leaving no unsubstituted placeholders', () => {
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  for (const g of GUIDE_FILES) {
    const body = fs.readFileSync(path.join(target.guidesDir, g), 'utf8');
    assert.ok(!/\{\{[A-Z_]+\}\}/.test(body), `guide ${g} shipped an unrendered placeholder`);
  }
  // Both flows splice through the shared shell, and both name it by absolute path.
  for (const flow of ['forge-workflow-review-pr.md', 'forge-workflow-investigation.md']) {
    const body = fs.readFileSync(path.join(target.guidesDir, flow), 'utf8');
    assert.ok(
      body.includes(path.join(target.installPath, 'forge-report-shell.html')),
      `${flow} must resolve the report shell to a real installed path`,
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
    assert.ok(body.includes('forge-report-shell.html'), `${file} must splice into the shell`);
    assert.ok(body.includes(`mkdir -p ${dir}`), `${file} must create ${dir}`);
    assert.ok(body.includes('() => esc(title)'), `${file} must escape the title`);
    assert.ok(body.includes('() => body'), `${file} must splice the body verbatim`);
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

// The splice command documented in the investigate instruction is what actually
// builds every report, so the test runs THAT script rather than a copy of it — a
// copy could drift from the template and still pass. It lives in Phase I3 of the
// workflow file, which commandInstruction pulls in alongside the command.
function spliceScriptFromTemplate() {
  const md = commandInstruction('investigate.md');
  const m = md.match(/node -e '\n([\s\S]*?)\n'/);
  assert.ok(m, 'could not find the node splice script in the investigate instruction');
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
// JSON.stringify escape it. This runs the script out of the template itself — a
// copy here could drift from the shipped instruction and still pass.
test('the documented review payload escapes hostile prose', () => {
  const md = commandInstruction('review-pr.md');
  const m = md.match(/node -e '\n(const fs = require\("fs"\), path[\s\S]*?)\n'/);
  assert.ok(m, 'could not find the payload assembly script in the review-pr instruction');

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
  execFileSync('node', ['-e', m[1], d, 'REQUEST_CHANGES', out]);

  const payload = JSON.parse(fs.readFileSync(out, 'utf8'));
  assert.equal(payload.event, 'REQUEST_CHANGES');
  assert.equal(payload.body, body, 'summary must round-trip byte for byte');
  assert.equal(payload.comments[0].body, c1, 'finding must round-trip byte for byte');
  assert.equal(payload.comments[0].line, 42);
  assert.equal(payload.comments[0].side, 'RIGHT');

  // An approval carries no line comments.
  fs.writeFileSync(path.join(d, 'anchors.json'), '[]');
  execFileSync('node', ['-e', m[1], d, 'APPROVE', out]);
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

test('cursor and codex are aliases for the agents target', () => {
  for (const name of ['cursor', 'codex', 'CURSOR', ' codex ']) {
    assert.equal(resolveTarget({ target: name, homeDir: '/h', cwd: '/r' }).target, 'agents');
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
  assert.equal(resolveTargetName('cursor'), 'agents');
  assert.equal(resolveTargetName(undefined), 'claude');
  assert.equal(resolveTargetName(null), 'claude');
  assert.throws(() => resolveTargetName('emacs'), /Unknown target/);
});

test('agents target omits setup', () => {
  assert.ok(TARGETS.agents.omit.includes(path.join('slashforge', 'setup.md')));
  assert.deepEqual(TARGETS.claude.omit, []);
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
  assert.equal(dirs.length, COMMAND_FILES.length + SKILL_FILES.length - 1, 'setup is omitted');
  for (const dir of dirs) {
    const fm = parseFrontmatter(fs.readFileSync(path.join(root, dir, 'SKILL.md'), 'utf8'), dir);
    assert.match(fm.name, /^[a-z0-9-]+$/, `${dir}: name must be lowercase-hyphen only`);
    assert.equal(fm.name, dir, `${dir}: name must match its parent directory`);
  }
});

test('setup is omitted on the agents target but present on claude', () => {
  const home = tmp();
  installFiles(resolveTarget({ target: 'cursor', homeDir: home, cwd: home }), {});
  assert.ok(!fs.existsSync(path.join(home, '.agents', 'skills', 'slashforge-setup')));

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
  for (const f of GUIDE_FILES) {
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
  assert.equal(meta.target, 'agents');
  assert.deepEqual(meta.commands,
    ['/slashforge-code', '/slashforge-investigate', '/slashforge-review-pr']);
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
