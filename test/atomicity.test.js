const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { installFiles, resolveTarget } = require('../bin/install.js');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'csk-atomicity-'));
}

// validateTemplates runs before any mkdirSync or writeFileSync call. If it
// throws, the target directory must be completely untouched — no half-written
// install is worse than none.

test('corrupt guide template → installFiles throws → no directories created', () => {
  const home = tmp();
  const fakeTemplates = tmp();

  // Guide with invalid frontmatter — missing required `description` field.
  fs.writeFileSync(
    path.join(fakeTemplates, 'bad-guide.md'),
    '---\nname: x\n---\nbody',
  );

  const target = resolveTarget({ homeDir: home, cwd: home });

  assert.throws(
    () =>
      installFiles(target, {
        templatesDir: fakeTemplates,
        guideFiles: ['bad-guide.md'],
        commandFiles: [],
        skillFiles: [],
        assetFiles: [],
      }),
    /Refusing to install/,
  );

  assert.ok(
    !fs.existsSync(target.guidesDir),
    'guidesDir must not be created when validation fails',
  );
  assert.ok(
    !fs.existsSync(target.metaFile),
    'meta.json must not be created when validation fails',
  );
});

test('corrupt guide template → installFiles throws → zero files written anywhere in target', () => {
  const home = tmp();
  const fakeTemplates = tmp();

  // Missing frontmatter entirely.
  fs.writeFileSync(path.join(fakeTemplates, 'bad-guide.md'), 'no frontmatter at all');

  const target = resolveTarget({ homeDir: home, cwd: home });

  assert.throws(
    () =>
      installFiles(target, {
        templatesDir: fakeTemplates,
        guideFiles: ['bad-guide.md'],
        commandFiles: [],
        skillFiles: [],
        assetFiles: [],
      }),
    /Refusing to install/,
  );

  // The whole .claude subtree must be absent — no directories, no files.
  const claudeDir = path.join(home, '.claude');
  assert.ok(
    !fs.existsSync(claudeDir),
    '.claude/ must not exist when install validation fails',
  );
});

test('fixed template → installFiles succeeds → all listed files present', () => {
  const home = tmp();
  const fakeTemplates = tmp();

  // Valid frontmatter with a placeholder that should be rendered.
  fs.writeFileSync(
    path.join(fakeTemplates, 'good-guide.md'),
    '---\nname: x\ndescription: y\n---\ninstalled at {{INSTALL_PATH}}',
  );

  const target = resolveTarget({ homeDir: home, cwd: home });

  const written = installFiles(target, {
    templatesDir: fakeTemplates,
    guideFiles: ['good-guide.md'],
    commandFiles: [],
    skillFiles: [],
    assetFiles: [],
  });

  const guideFile = path.join(target.guidesDir, 'good-guide.md');
  assert.ok(fs.existsSync(guideFile), 'guide file must be written on successful install');
  assert.ok(fs.existsSync(target.metaFile), 'meta.json must be written on successful install');
  assert.ok(written.includes(guideFile), 'returned list must include the guide file');
  assert.ok(written.includes(target.metaFile), 'returned list must include meta.json');

  // Token substitution must have occurred.
  const body = fs.readFileSync(guideFile, 'utf8');
  assert.ok(!body.includes('{{INSTALL_PATH}}'), 'placeholder must be rendered away');
  assert.ok(body.includes(target.installPath), 'installPath must appear in rendered output');
});

test('validate-before-write: corrupt command template → no guide files written either', () => {
  const home = tmp();
  const fakeTemplates = tmp();

  // Guide is valid; command is corrupt.
  fs.writeFileSync(
    path.join(fakeTemplates, 'guide.md'),
    '---\nname: g\ndescription: d\n---\nok',
  );
  fs.mkdirSync(path.join(fakeTemplates, 'slashforge'), { recursive: true });
  fs.writeFileSync(
    path.join(fakeTemplates, 'slashforge', 'bad-cmd.md'),
    '---\nname: c\n---\nmissing description',
  );

  const target = resolveTarget({ homeDir: home, cwd: home });

  assert.throws(
    () =>
      installFiles(target, {
        templatesDir: fakeTemplates,
        guideFiles: ['guide.md'],
        commandFiles: [path.join('slashforge', 'bad-cmd.md')],
        skillFiles: [],
        assetFiles: [],
      }),
    /Refusing to install/,
  );

  // Even though the guide was valid, no files should have been written —
  // all validations run before the first write.
  assert.ok(
    !fs.existsSync(path.join(target.guidesDir, 'guide.md')),
    'guide must not be written when a command template is invalid',
  );
});
