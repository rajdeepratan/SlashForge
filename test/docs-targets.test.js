const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// The docs module is ESM; these tests are CommonJS, so it is loaded dynamically.
const load = () => import('../docs/src/targets.mjs');

test('commandForm renders the three spellings', async () => {
  const { commandForm } = await load();
  assert.equal(commandForm('code', 'claude'), '/slashforge-code');
  assert.equal(commandForm('code', 'cursor'), '/slashforge-code');
  assert.equal(commandForm('code', 'codex'), '$slashforge-code');
  assert.equal(commandForm('review-pr', 'cursor'), '/slashforge-review-pr');
});

test('setup is switchable now that it installs on both vendors', async () => {
  const { SWITCHABLE, commandForm } = await load();
  assert.ok(SWITCHABLE.includes('setup'), 'setup has cursor and codex forms');
  assert.equal(commandForm('setup', 'claude'), '/slashforge-setup');
  assert.equal(commandForm('setup', 'cursor'), '/slashforge-setup');
  assert.equal(commandForm('setup', 'codex'), '$slashforge-setup');
});

// The drift guard: adding a command to the installer without adding it here
// fails, so the docs cannot silently fall behind what actually ships.
test('SWITCHABLE covers every shipped command', async () => {
  const { SWITCHABLE } = await load();
  const { COMMAND_FILES, SKILL_FILES } = require('../bin/install.js');
  // setup is no longer excluded: it installs on cursor and codex, so it has a
  // form on every target the docs describe.
  const shipped = [...COMMAND_FILES, ...SKILL_FILES]
    .map((f) => f.split(path.sep).pop().replace(/\.md$/, ''));
  assert.deepEqual([...SWITCHABLE].sort(), shipped.sort());
});

test('COMMAND_RE matches the longer name when two share a prefix', async () => {
  const { COMMAND_RE } = await load();
  COMMAND_RE.lastIndex = 0;
  assert.deepEqual(
    '/slashforge-review-feedback and /slashforge-review-pr'.match(COMMAND_RE),
    ['/slashforge-review-feedback', '/slashforge-review-pr']
  );
});

test('COMMAND_RE ignores unknown names and hyphenated URLs', async () => {
  const { COMMAND_RE } = await load();
  COMMAND_RE.lastIndex = 0;
  assert.equal('/slashforge-nope https://example.dev/slashforge-code'.match(COMMAND_RE), null);
});

test('wholeLabelCommand only fires when the label is exactly one command', async () => {
  const { wholeLabelCommand } = await load();
  assert.equal(wholeLabelCommand('/slashforge-code'), 'code');
  assert.equal(wholeLabelCommand('Run /slashforge-code now'), null);
  assert.equal(wholeLabelCommand('/slashforge-setup'), 'setup');
  // An unknown name is still not a command.
  assert.equal(wholeLabelCommand('/slashforge-deploy'), null);
});

test('splitCommandText separates commands from surrounding text', async () => {
  const { splitCommandText } = await load();
  assert.deepEqual(splitCommandText('$ /slashforge-code'), [
    { text: '$ ' },
    { text: '/slashforge-code', cmd: 'code' },
  ]);
  assert.deepEqual(splitCommandText('/slashforge-code'), [
    { text: '/slashforge-code', cmd: 'code' },
  ]);
  // setup switches now that it installs on cursor and codex.
  assert.deepEqual(splitCommandText('/slashforge-setup'), [
    { text: '/slashforge-setup', cmd: 'setup' },
  ]);
  // A name the kit does not ship stays plain text.
  assert.deepEqual(splitCommandText('/slashforge-deploy'), [{ text: '/slashforge-deploy' }]);
  assert.deepEqual(splitCommandText('no commands here'), [{ text: 'no commands here' }]);
});

test('renderReplayLine substitutes the command and keeps the prompt', async () => {
  const { renderReplayLine } = await load();
  assert.equal(renderReplayLine('$ /slashforge-code', 'claude'), '$ /slashforge-code');
  assert.equal(renderReplayLine('$ /slashforge-code', 'cursor'), '$ /slashforge-code');
});

// Codex invokes with $, so keeping the mock's own prompt would render
// "$ $slashforge-code", which reads as a typo.
test('renderReplayLine drops the prompt for codex', async () => {
  const { renderReplayLine } = await load();
  assert.equal(renderReplayLine('$ /slashforge-code', 'codex'), '$slashforge-code');
  assert.equal(renderReplayLine('$ /slashforge-review-pr', 'codex'), '$slashforge-review-pr');
});

test('renderReplayLine leaves lines without commands alone', async () => {
  const { renderReplayLine } = await load();
  for (const t of ['claude', 'cursor', 'codex']) {
    assert.equal(renderReplayLine('> add rate limiting', t), '> add rate limiting');
    assert.equal(renderReplayLine('PHASE 2 · PLAN', t), 'PHASE 2 · PLAN');
    // A bare $ prompt with no command keeps its prompt on every target.
    assert.equal(renderReplayLine('$ npx slashforge', t), '$ npx slashforge');
  }
});

test('installPathFor gives each target its real directories', async () => {
  const { installPathFor } = await load();
  assert.equal(installPathFor('guides', 'claude'), '~/.claude/setup/slashforge/');
  assert.equal(installPathFor('guides', 'cursor'), '~/.agents/setup/slashforge/cursor/');
  assert.equal(installPathFor('guides', 'codex'), '~/.agents/setup/slashforge/codex/');
  assert.equal(installPathFor('commands', 'claude'), '~/.claude/commands/');
  // Not a rename: on the agents target commands are skills, one directory each.
  assert.equal(installPathFor('commands', 'codex'), '~/.agents/skills/');
  assert.equal(installPathFor('root', 'cursor'), '~/.agents/');
});

// The drift guard, same shape as the SWITCHABLE one: if resolveTarget changes
// where things land, the documented paths must change with it.
test('installPathFor matches what the installer actually does', async () => {
  const { installPathFor } = await load();
  const { resolveTarget, resolveAgents } = require('../bin/install.js');
  const c = resolveTarget({ homeDir: '~' });
  assert.equal(installPathFor('guides', 'claude'), c.guidesDir + '/');
  const a = resolveAgents({ homeDir: '~' });
  for (const h of a.hosts) {
    assert.equal(installPathFor('guides', h.host), h.guidesDir + '/');
    assert.equal(installPathFor('commands', h.host), a.skillsDir + '/');
  }
});

test('commandForm: Claude Code and Cursor share /slashforge-, Codex uses $', async () => {
  const { commandForm } = await load();
  assert.equal(commandForm('code', 'claude'), '/slashforge-code');
  assert.equal(commandForm('code', 'cursor'), '/slashforge-code');
  assert.equal(commandForm('code', 'codex'), '$slashforge-code');
});

// Review Focus 5: a path is never a command.
test('COMMAND_RE finds commands and never a path segment', async () => {
  const { COMMAND_RE } = await load();
  const s = 'Run /slashforge-code or read ~/.agents/skills/slashforge-code/SKILL.md';
  COMMAND_RE.lastIndex = 0;
  const hits = [...s.matchAll(COMMAND_RE)].map((m) => m.index);
  assert.deepEqual(hits, [4]);
});
