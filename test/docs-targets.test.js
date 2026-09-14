const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

// The docs module is ESM; these tests are CommonJS, so it is loaded dynamically.
const load = () => import('../docs/src/targets.mjs');

test('commandForm renders the three spellings', async () => {
  const { commandForm } = await load();
  assert.equal(commandForm('code', 'claude'), '/slashforge:code');
  assert.equal(commandForm('code', 'cursor'), '/slashforge-code');
  assert.equal(commandForm('code', 'codex'), '$slashforge-code');
  assert.equal(commandForm('review-pr', 'cursor'), '/slashforge-review-pr');
});

test('setup is deliberately not switchable', async () => {
  const { SWITCHABLE } = await load();
  assert.ok(!SWITCHABLE.includes('setup'), 'setup has no cursor/codex form');
});

// The drift guard: adding a command to the installer without adding it here
// fails, so the docs cannot silently fall behind what actually ships.
test('SWITCHABLE covers every other shipped command', async () => {
  const { SWITCHABLE } = await load();
  const { COMMAND_FILES, SKILL_FILES } = require('../bin/install.js');
  const shipped = [...COMMAND_FILES, ...SKILL_FILES]
    .map((f) => f.split(path.sep).pop().replace(/\.md$/, ''))
    .filter((n) => n !== 'setup');
  assert.deepEqual([...SWITCHABLE].sort(), shipped.sort());
});

test('COMMAND_RE matches the longer name when two share a prefix', async () => {
  const { COMMAND_RE } = await load();
  COMMAND_RE.lastIndex = 0;
  assert.deepEqual(
    '/slashforge:review-feedback and /slashforge:review-pr'.match(COMMAND_RE),
    ['/slashforge:review-feedback', '/slashforge:review-pr']
  );
});

test('COMMAND_RE ignores unknown names and hyphenated URLs', async () => {
  const { COMMAND_RE } = await load();
  COMMAND_RE.lastIndex = 0;
  assert.equal('/slashforge:nope /slashforge-code'.match(COMMAND_RE), null);
});

test('wholeLabelCommand only fires when the label is exactly one command', async () => {
  const { wholeLabelCommand } = await load();
  assert.equal(wholeLabelCommand('/slashforge:code'), 'code');
  assert.equal(wholeLabelCommand('Run /slashforge:code now'), null);
  assert.equal(wholeLabelCommand('/slashforge:setup'), null);
});

test('splitCommandText separates commands from surrounding text', async () => {
  const { splitCommandText } = await load();
  assert.deepEqual(splitCommandText('$ /slashforge:code'), [
    { text: '$ ' },
    { text: '/slashforge:code', cmd: 'code' },
  ]);
  assert.deepEqual(splitCommandText('/slashforge:code'), [
    { text: '/slashforge:code', cmd: 'code' },
  ]);
  // setup is not switchable, so it stays plain text on every target.
  assert.deepEqual(splitCommandText('/slashforge:setup'), [{ text: '/slashforge:setup' }]);
  assert.deepEqual(splitCommandText('no commands here'), [{ text: 'no commands here' }]);
});

test('renderReplayLine substitutes the command and keeps the prompt', async () => {
  const { renderReplayLine } = await load();
  assert.equal(renderReplayLine('$ /slashforge:code', 'claude'), '$ /slashforge:code');
  assert.equal(renderReplayLine('$ /slashforge:code', 'cursor'), '$ /slashforge-code');
});

// Codex invokes with $, so keeping the mock's own prompt would render
// "$ $slashforge-code", which reads as a typo.
test('renderReplayLine drops the prompt for codex', async () => {
  const { renderReplayLine } = await load();
  assert.equal(renderReplayLine('$ /slashforge:code', 'codex'), '$slashforge-code');
  assert.equal(renderReplayLine('$ /slashforge:review-pr', 'codex'), '$slashforge-review-pr');
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
