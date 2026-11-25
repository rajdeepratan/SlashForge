'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const ext = require('../bin/install.js');

const BIN = path.join(__dirname, '..', 'bin', 'install.js');

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

// ---------------------------------------------------------------------------
// Shared fixture: a minimal on-disk pack with a guide (and optional hook+config)
// ---------------------------------------------------------------------------

// Builds a temp pack dir. `lines` controls guide body length (to trip the limit).
function tmpPack({ lines = 3, withHook = false, withConfig = false } = {}) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sfpack-'));
  const provides = { guides: ['guides/slashforge-demo.md'] };
  fs.mkdirSync(path.join(d, 'guides'));
  const body = '---\nname: demo\ndescription: d\n---\n' + 'x\n'.repeat(lines);
  fs.writeFileSync(path.join(d, 'guides/slashforge-demo.md'), body);
  if (withHook) {
    fs.mkdirSync(path.join(d, 'hooks'));
    fs.writeFileSync(path.join(d, 'hooks/h.js'), 'process.exit(0)\n');
    provides.hooks = [{ event: 'Stop', script: 'hooks/h.js' }];
  }
  if (withConfig) {
    fs.mkdirSync(path.join(d, 'config'));
    fs.writeFileSync(path.join(d, 'config/demo.config.json'), '{"transport":"webhook"}\n');
    provides.config = 'config/demo.config.json';
  }
  fs.writeFileSync(path.join(d, 'slashforge-ext.json'), JSON.stringify({
    schema: 1, id: 'demo', name: 'Demo', version: '0.0.1', description: 'd', provides,
  }));
  return d;
}

// ---------------------------------------------------------------------------
// Task 2: resolve a pack directory (validate before any write)
// ---------------------------------------------------------------------------

test('resolveExtensions rejects an over-limit guide', () => {
  assert.throws(() => ext.resolveExtensions([tmpPack({ lines: 300 })]), /200|line/i);
});

test('resolveExtensions rejects a dir with no manifest', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'sfnomf-'));
  assert.throws(() => ext.resolveExtensions([empty]), new RegExp(ext.EXT_MANIFEST));
});

test('resolveExtensions rejects a hook script that is missing', () => {
  const d = tmpPack({ withHook: true });
  fs.rmSync(path.join(d, 'hooks/h.js'));
  assert.throws(() => ext.resolveExtensions([d]), /hooks\/h\.js/);
});

test('resolveExtensions rejects a path that escapes the pack (traversal)', () => {
  const d = tmpPack({});
  const mf = path.join(d, 'slashforge-ext.json');
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.provides.guides = ['../../../tmp/evil.md'];
  fs.writeFileSync(mf, JSON.stringify(m));
  assert.throws(() => ext.resolveExtensions([d]), /\.\.|outside|relative/i);
});

test('resolveExtensions rejects an absolute provided path', () => {
  const d = tmpPack({ withConfig: true });
  const mf = path.join(d, 'slashforge-ext.json');
  const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
  m.provides.config = '/etc/passwd';
  fs.writeFileSync(mf, JSON.stringify(m));
  assert.throws(() => ext.resolveExtensions([d]), /absolute|relative|\.\./i);
});

test('resolveExtensions accepts a valid pack', () => {
  const r = ext.resolveExtensions([tmpPack({ withHook: true, withConfig: true })]);
  assert.equal(r[0].manifest.id, 'demo');
  assert.equal(r[0].guides[0], 'guides/slashforge-demo.md');
  assert.equal(r[0].config, 'config/demo.config.json');
  assert.equal(r[0].hooks[0].event, 'Stop');
});

// ---------------------------------------------------------------------------
// Task 3: install a pack into the Claude target + meta tracking
// ---------------------------------------------------------------------------

test('installFiles places a pack and records it in meta', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfhome-'));
  const target = ext.resolveTarget({ homeDir: home });
  const packs = ext.resolveExtensions([tmpPack({ withHook: true, withConfig: true })]);
  ext.installFiles(target, { extensions: packs });
  const base = path.join(target.guidesDir, 'extensions', 'demo');
  assert.ok(fs.existsSync(path.join(base, 'guides/slashforge-demo.md')), 'guide installed');
  assert.ok(fs.existsSync(path.join(base, 'config/demo.config.json')), 'config copied');
  assert.ok(fs.existsSync(path.join(base, 'hooks/h.js')), 'hook script copied');
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(meta.extensions, [{ id: 'demo', version: '0.0.1' }]);
});

test('a plain upgrade keeps previously installed packs in meta', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfupg-'));
  const target = ext.resolveTarget({ homeDir: home });
  ext.installFiles(target, { extensions: ext.resolveExtensions([tmpPack({})]) });
  ext.installFiles(target, {}); // plain upgrade, no --ext
  const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
  assert.deepEqual(meta.extensions, [{ id: 'demo', version: '0.0.1' }],
    'an upgrade without --ext must not forget installed packs');
});

test('a plain re-install does not eat the extensions subtree', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfhome2-'));
  const target = ext.resolveTarget({ homeDir: home });
  ext.installFiles(target, { extensions: ext.resolveExtensions([tmpPack({})]) });
  const guide = path.join(target.guidesDir, 'extensions', 'demo', 'guides/slashforge-demo.md');
  assert.ok(fs.existsSync(guide));
  ext.installFiles(target, {}); // built-in-only install, stale sweep runs
  assert.ok(fs.existsSync(guide), 'subtree survives the top-level stale sweep');
});

// ---------------------------------------------------------------------------
// Task 4: install a pack into the Cursor/Codex hosts
// ---------------------------------------------------------------------------

test('installAgentsFiles places a pack per host and records it in meta', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfagents-'));
  const agents = ext.resolveAgents({ homeDir: home });
  ext.installAgentsFiles(agents, { extensions: ext.resolveExtensions([tmpPack({ withHook: true })]) });
  for (const h of agents.hosts) {
    assert.ok(
      fs.existsSync(path.join(h.guidesDir, 'extensions/demo/guides/slashforge-demo.md')),
      `guide installed for ${h.host}`,
    );
    assert.ok(
      fs.existsSync(path.join(h.guidesDir, 'extensions/demo/hooks/h.js')),
      `hook installed for ${h.host}`,
    );
  }
  assert.deepEqual(
    JSON.parse(fs.readFileSync(agents.metaFile, 'utf8')).extensions,
    [{ id: 'demo', version: '0.0.1' }],
  );
});

// ---------------------------------------------------------------------------
// Task 5: uninstall removes the pack subtree, keeps user files
// ---------------------------------------------------------------------------

test('uninstallFiles removes the extensions subtree but keeps user files', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfun-'));
  const target = ext.resolveTarget({ homeDir: home });
  ext.installFiles(target, { extensions: ext.resolveExtensions([tmpPack({})]) });
  fs.writeFileSync(path.join(target.guidesDir, 'my-notes.md'), 'mine');
  ext.uninstallFiles(target, {});
  assert.ok(!fs.existsSync(path.join(target.guidesDir, 'extensions')), 'subtree gone');
  assert.ok(fs.existsSync(path.join(target.guidesDir, 'my-notes.md')), 'user file kept');
});

test('uninstallAgentsFiles removes each host extensions subtree', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfunagents-'));
  const agents = ext.resolveAgents({ homeDir: home });
  ext.installAgentsFiles(agents, { extensions: ext.resolveExtensions([tmpPack({})]) });
  ext.uninstallAgentsFiles(agents, {});
  for (const h of agents.hosts) {
    assert.ok(!fs.existsSync(path.join(h.guidesDir, 'extensions')), `subtree gone for ${h.host}`);
  }
});

// ---------------------------------------------------------------------------
// Task 6: --ext CLI flag parsing
// ---------------------------------------------------------------------------

test('parseExtArgs collects repeated --ext values in both forms', () => {
  assert.deepEqual(ext.parseExtArgs(['--ext', 'a', '--project', '--ext', 'b']), ['a', 'b']);
  assert.deepEqual(ext.parseExtArgs(['--ext=c']), ['c']);
  assert.deepEqual(ext.parseExtArgs(['status']), []);
});

// ---------------------------------------------------------------------------
// Task 8: the observability reference pack ships and is valid
// ---------------------------------------------------------------------------

test('the observability reference pack is valid and secret-free', () => {
  const dir = path.join(__dirname, '..', 'extensions', 'observability');
  const r = ext.resolveExtensions([dir]); // throws if manifest/guide/hooks/config invalid
  assert.equal(r[0].manifest.id, 'observability');
  assert.ok(r[0].hooks.some((h) => h.event === 'Stop'), 'emits on Stop');
  assert.ok(r[0].hooks.some((h) => h.event === 'SessionEnd'), 'emits on SessionEnd');
  assert.ok(fs.existsSync(path.join(dir, 'hooks/emit-telemetry.js')), 'emitter present');
  const cfg = fs.readFileSync(path.join(dir, 'config/observability.config.json'), 'utf8');
  assert.equal(JSON.parse(cfg).transport, 'webhook', 'defaults to webhook transport');
  assert.ok(!/(sk-|bearer\s+\w|["']?token["']?\s*:\s*["']\w)/i.test(cfg), 'no secrets in config template');
});

// ---------------------------------------------------------------------------
// status lists installed packs
// ---------------------------------------------------------------------------

test('status lists an installed extension pack', () => {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sfstatus-'));
  const pack = tmpPack({ withHook: true });
  execFileSync('node', [BIN, '--project', '--yes', '--ext', pack], { cwd: repo });
  const out = execFileSync('node', [BIN, 'status', '--project'], { cwd: repo, encoding: 'utf8' });
  assert.match(out, /demo@0\.0\.1/, 'status names the installed pack and version');
});
