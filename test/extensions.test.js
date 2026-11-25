'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const ext = require('../bin/install.js');

// ---------------------------------------------------------------------------
// Task 1: manifest parser
// ---------------------------------------------------------------------------

const good = JSON.stringify({
  schema: 1,
  id: 'obs',
  name: 'Observability',
  version: '0.1.0',
  description: 'x',
  provides: { hooks: [{ event: 'Stop', script: 'h.js' }] },
});

test('parseExtManifest accepts a valid manifest', () => {
  const m = ext.parseExtManifest(good, 'obs');
  assert.equal(m.id, 'obs');
  assert.ok(m.provides.hooks);
});

test('parseExtManifest rejects bad id, schema, empty provides, missing field', () => {
  const variants = [
    { ...JSON.parse(good), id: 'Obs Bad' },
    { ...JSON.parse(good), schema: 2 },
    { ...JSON.parse(good), provides: {} },
    (() => { const c = JSON.parse(good); delete c.version; return c; })(),
  ];
  for (const bad of variants) {
    assert.throws(() => ext.parseExtManifest(JSON.stringify(bad), 'lbl'), /lbl:/);
  }
});

test('parseExtManifest rejects an unknown hook event and a non-string matcher', () => {
  const badEvent = { ...JSON.parse(good), provides: { hooks: [{ event: 'Nope', script: 'h.js' }] } };
  assert.throws(() => ext.parseExtManifest(JSON.stringify(badEvent), 'lbl'), /lbl:.*event/);
  const badMatcher = { ...JSON.parse(good), provides: { hooks: [{ event: 'Stop', script: 'h.js', matcher: 7 }] } };
  assert.throws(() => ext.parseExtManifest(JSON.stringify(badMatcher), 'lbl'), /lbl:.*matcher/);
});
