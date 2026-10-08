const { test } = require('node:test');
const assert = require('node:assert');
const { isNewerVersion } = require('../bin/install.js');

// isNewerVersion accepts x.y.z only. Any other form returns false — the warning
// is unsolicited, so it must only fire when it is certainly correct.

// ---------------------------------------------------------------------------
// Pre-release strings
// ---------------------------------------------------------------------------

test('isNewerVersion: pre-release candidate is not newer than its release', () => {
  // 1.0.0-beta.1 is technically pre-1.0.0, but the function cannot parse it.
  // Either way the behaviour must be false: no false-positive "update available".
  assert.equal(isNewerVersion('1.0.0-beta.1', '1.0.0'), false);
  assert.equal(isNewerVersion('2.0.0-alpha', '1.9.9'), false);
  assert.equal(isNewerVersion('1.0.0-rc.1', '0.9.0'), false);
});

test('isNewerVersion: pre-release current version returns false', () => {
  assert.equal(isNewerVersion('1.0.0', '1.0.0-beta.1'), false);
});

// ---------------------------------------------------------------------------
// Equal versions
// ---------------------------------------------------------------------------

test('isNewerVersion: equal versions return false', () => {
  assert.equal(isNewerVersion('1.0.0', '1.0.0'), false);
  assert.equal(isNewerVersion('4.3.1', '4.3.1'), false);
  assert.equal(isNewerVersion('0.0.1', '0.0.1'), false);
  assert.equal(isNewerVersion('10.20.30', '10.20.30'), false);
});

// ---------------------------------------------------------------------------
// Non-semver strings
// ---------------------------------------------------------------------------

test('isNewerVersion: non-semver strings return false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion('not-semver', '1.0.0'));
  assert.equal(isNewerVersion('not-semver', '1.0.0'), false);

  assert.doesNotThrow(() => isNewerVersion('latest', '1.0.0'));
  assert.equal(isNewerVersion('latest', '1.0.0'), false);

  // v-prefixed strings are common in release tags but are not plain semver.
  assert.doesNotThrow(() => isNewerVersion('v4.3.1', '1.0.0'));
  assert.equal(isNewerVersion('v4.3.1', '1.0.0'), false);

  // Two-part version — missing patch segment.
  assert.doesNotThrow(() => isNewerVersion('4.3', '1.0.0'));
  assert.equal(isNewerVersion('4.3', '1.0.0'), false);

  // Non-semver in the current position.
  assert.doesNotThrow(() => isNewerVersion('1.0.0', 'unknown'));
  assert.equal(isNewerVersion('1.0.0', 'unknown'), false);
});

// ---------------------------------------------------------------------------
// Empty string
// ---------------------------------------------------------------------------

test('isNewerVersion: empty string candidate returns false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion('', '1.0.0'));
  assert.equal(isNewerVersion('', '1.0.0'), false);
});

test('isNewerVersion: empty string current returns false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion('1.0.0', ''));
  assert.equal(isNewerVersion('1.0.0', ''), false);
});

// ---------------------------------------------------------------------------
// null
// ---------------------------------------------------------------------------

test('isNewerVersion: null candidate returns false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion(null, '1.0.0'));
  assert.equal(isNewerVersion(null, '1.0.0'), false);
});

test('isNewerVersion: null current returns false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion('1.0.0', null));
  assert.equal(isNewerVersion('1.0.0', null), false);
});

// ---------------------------------------------------------------------------
// undefined
// ---------------------------------------------------------------------------

test('isNewerVersion: undefined candidate returns false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion(undefined, '1.0.0'));
  assert.equal(isNewerVersion(undefined, '1.0.0'), false);
});

test('isNewerVersion: undefined current returns false without throwing', () => {
  assert.doesNotThrow(() => isNewerVersion('1.0.0', undefined));
  assert.equal(isNewerVersion('1.0.0', undefined), false);
});

// ---------------------------------------------------------------------------
// Non-string scalars (registry returning unexpected type)
// ---------------------------------------------------------------------------

test('isNewerVersion: non-string non-null candidate returns false without throwing', () => {
  // An object or number from a malformed registry response must not crash.
  assert.doesNotThrow(() => isNewerVersion({}, '1.0.0'));
  assert.equal(isNewerVersion({}, '1.0.0'), false);

  assert.doesNotThrow(() => isNewerVersion(4.31, '1.0.0'));
  assert.equal(isNewerVersion(4.31, '1.0.0'), false);
});

// ---------------------------------------------------------------------------
// Sanity checks — correct comparisons still work
// ---------------------------------------------------------------------------

test('isNewerVersion: correctly identifies a strictly newer version', () => {
  assert.equal(isNewerVersion('1.1.0', '1.0.0'), true, 'minor bump');
  assert.equal(isNewerVersion('1.0.1', '1.0.0'), true, 'patch bump');
  assert.equal(isNewerVersion('2.0.0', '1.9.9'), true, 'major bump');
  assert.equal(isNewerVersion('4.10.0', '4.9.0'), true, 'numeric order, not lexical');
});

test('isNewerVersion: older version returns false', () => {
  assert.equal(isNewerVersion('1.0.0', '2.0.0'), false, 'major older');
  assert.equal(isNewerVersion('1.0.0', '1.1.0'), false, 'minor older');
  assert.equal(isNewerVersion('1.0.0', '1.0.1'), false, 'patch older');
});
