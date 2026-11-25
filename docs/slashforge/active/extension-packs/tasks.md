# Extension Packs — Tasks

Execution: task-by-task with a review between each. Each task ends green and committed.
All code is CommonJS in `bin/install.js`; all tests are `node:test` in `test/extensions.test.js`.

---

## Task 1: Manifest parser
Files: modify `bin/install.js` (add `EXT_MANIFEST`, `parseExtManifest`, export both), test `test/extensions.test.js`
Consumes: nothing
Produces: `parseExtManifest(raw, label) -> { schema, id, name, version, description, provides }` (throws on invalid); `EXT_MANIFEST = 'slashforge-ext.json'`

- [ ] Step 1: write the failing test:
  ```js
  const { test } = require('node:test');
  const assert = require('node:assert');
  const ext = require('../bin/install.js');

  const good = JSON.stringify({
    schema: 1, id: 'obs', name: 'Observability', version: '0.1.0',
    description: 'x', provides: { hooks: [{ event: 'Stop', script: 'h.js' }] },
  });

  test('parseExtManifest accepts a valid manifest', () => {
    const m = ext.parseExtManifest(good, 'obs');
    assert.equal(m.id, 'obs');
    assert.ok(m.provides.hooks);
  });
  test('parseExtManifest rejects bad id, schema, empty provides', () => {
    for (const bad of [
      { ...JSON.parse(good), id: 'Obs Bad' },
      { ...JSON.parse(good), schema: 2 },
      { ...JSON.parse(good), provides: {} },
      (() => { const c = JSON.parse(good); delete c.version; return c; })(),
    ]) {
      assert.throws(() => ext.parseExtManifest(JSON.stringify(bad), 'lbl'), /lbl:/);
    }
  });
  ```
- [ ] Step 2: run `node --test test/extensions.test.js` — confirm it FAILS (`parseExtManifest is not a function`).
- [ ] Step 3: implement in `bin/install.js` near `parseFrontmatter`:
  ```js
  const EXT_MANIFEST = 'slashforge-ext.json';
  const HOST_EVENTS = new Set([
    'SessionStart','SessionEnd','UserPromptSubmit','PreToolUse','PostToolUse',
    'Stop','SubagentStop','Notification','PreCompact','PostCompact','PermissionRequest',
  ]);
  function parseExtManifest(raw, label) {
    let m;
    try { m = JSON.parse(raw); } catch (e) { throw new Error(`${label}: invalid JSON (${e.message})`); }
    if (m.schema !== 1) throw new Error(`${label}: unsupported schema (want 1)`);
    if (!/^[a-z0-9-]+$/.test(m.id || '')) throw new Error(`${label}: id must match ^[a-z0-9-]+$`);
    for (const k of ['name', 'version', 'description']) {
      if (!m[k] || typeof m[k] !== 'string') throw new Error(`${label}: missing '${k}'`);
    }
    const p = m.provides || {};
    if (!p.guides && !p.hooks && !p.config) throw new Error(`${label}: provides needs one of guides/hooks/config`);
    for (const h of p.hooks || []) {
      if (!HOST_EVENTS.has(h.event)) throw new Error(`${label}: unknown hook event '${h.event}'`);
      if (!h.script || typeof h.script !== 'string') throw new Error(`${label}: hook missing 'script'`);
      if (h.matcher !== undefined && typeof h.matcher !== 'string') throw new Error(`${label}: hook matcher must be a string`);
    }
    return m;
  }
  ```
  Add `parseExtManifest`, `EXT_MANIFEST` to `module.exports`.
- [ ] Step 4: run `node --test test/extensions.test.js` — confirm PASS.
- [ ] Step 5: commit `feat(cli): add slashforge-ext.json manifest parser`.

---

## Task 2: Resolve a pack directory (validate before any write)
Files: modify `bin/install.js` (add `resolveExtensions`, `extGuideFiles` helper), test `test/extensions.test.js`
Consumes: `parseExtManifest`, `EXT_MANIFEST`, existing `validateTemplates`
Produces: `resolveExtensions(dirs) -> [{ dir, manifest, guides: [relPath], config: relPath|null, hooks: [...] }]` (throws on any invalid pack, before writing anything)

- [ ] Step 1: write the failing test — a temp pack whose guide is 201 lines must throw and write nothing:
  ```js
  const fs = require('fs'); const os = require('os'); const path = require('path');
  function tmpPack(lines) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'sfpack-'));
    fs.writeFileSync(path.join(d, 'slashforge-ext.json'), JSON.stringify({
      schema:1, id:'demo', name:'Demo', version:'0.0.1', description:'d',
      provides:{ guides:['guides/slashforge-demo.md'] },
    }));
    fs.mkdirSync(path.join(d, 'guides'));
    const body = '---\nname: demo\ndescription: d\n---\n' + 'x\n'.repeat(lines);
    fs.writeFileSync(path.join(d, 'guides/slashforge-demo.md'), body);
    return d;
  }
  test('resolveExtensions rejects an over-limit guide', () => {
    assert.throws(() => ext.resolveExtensions([tmpPack(300)]), /200|line/i);
  });
  test('resolveExtensions accepts a valid pack', () => {
    const r = ext.resolveExtensions([tmpPack(3)]);
    assert.equal(r[0].manifest.id, 'demo');
    assert.equal(r[0].guides[0], 'guides/slashforge-demo.md');
  });
  ```
- [ ] Step 2: run — confirm FAIL.
- [ ] Step 3: implement:
  ```js
  function resolveExtensions(dirs = []) {
    return dirs.map((dir) => {
      const mf = path.join(dir, EXT_MANIFEST);
      if (!fs.existsSync(mf)) throw new Error(`${dir}: no ${EXT_MANIFEST}`);
      const manifest = parseExtManifest(fs.readFileSync(mf, 'utf8'), path.relative(process.cwd(), mf) || mf);
      const p = manifest.provides;
      const guides = p.guides || [];
      // Validate guides with the same rules as built-ins (frontmatter/target/line-limit).
      validateTemplates(guides, dir);
      for (const h of p.hooks || []) {
        if (!fs.existsSync(path.join(dir, h.script))) throw new Error(`${mf}: hook script '${h.script}' not found`);
      }
      if (p.config && !fs.existsSync(path.join(dir, p.config))) throw new Error(`${mf}: config '${p.config}' not found`);
      return { dir, manifest, guides, config: p.config || null, hooks: p.hooks || [] };
    });
  }
  ```
  Export `resolveExtensions`.
- [ ] Step 4: run — confirm PASS. (`validateTemplates` throws before any file is written, proving atomicity.)
- [ ] Step 5: commit `feat(cli): resolve and validate --ext packs before install`.

---

## Task 3: Install a pack into the Claude target + meta tracking
Files: modify `bin/install.js` (`extInstallDir`, `installExtensions`, thread `extensions` into `installFiles` + `meta`), test `test/extensions.test.js`
Consumes: `resolveExtensions`, `renderTemplate`, existing `installFiles` signature/options
Produces: `installFiles(target, { extensions })` writes each pack under `target.guidesDir/extensions/<id>/…`; `meta.extensions = [{id,version}]`

- [ ] Step 1: write the failing test — install a valid pack for a temp Claude target, assert placement + meta + stale-sweep survival:
  ```js
  test('installFiles places a pack and records it in meta', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfhome-'));
    const target = ext.resolveTarget({ homeDir: home });
    const packs = ext.resolveExtensions([tmpPack(3)]);
    ext.installFiles(target, { extensions: packs });
    const base = path.join(target.guidesDir, 'extensions', 'demo');
    assert.ok(fs.existsSync(path.join(base, 'guides/slashforge-demo.md')));
    const meta = JSON.parse(fs.readFileSync(target.metaFile, 'utf8'));
    assert.deepEqual(meta.extensions, [{ id: 'demo', version: '0.0.1' }]);
    // Stale sweep must not eat the subtree on a plain re-install.
    ext.installFiles(target, {});
    assert.ok(fs.existsSync(path.join(base, 'guides/slashforge-demo.md')));
  });
  ```
- [ ] Step 2: run — confirm FAIL.
- [ ] Step 3: implement `extInstallDir(guidesDir, id) = path.join(guidesDir, 'extensions', id)` and `installExtensions(guidesDir, extensions, renderOpts)` that, per pack: renders each guide with `renderTemplate(..., { targetName })` and writes to `<extDir>/<guide>`, copies `config` and each hook `script` verbatim, and returns `{id, version}`. Call it inside `installFiles` after the built-in writes (so the top-level sweep at `install.js:508` has already run and does not see the subdir), and add `extensions: (installed ext list)` to the `meta` object (`install.js:513`). A plain `installFiles` with no `extensions` must leave an existing `extensions/` subtree alone — the sweep only reads the top level, so nothing extra is needed. Export `installExtensions`, `extInstallDir`.
- [ ] Step 4: run — confirm PASS.
- [ ] Step 5: commit `feat(cli): install --ext packs into the Claude target`.

---

## Task 4: Install a pack into the Cursor/Codex hosts
Files: modify `bin/install.js` (thread `extensions` into `installAgentsFiles` + its meta), test `test/extensions.test.js`
Consumes: `installExtensions`, `resolveAgents`
Produces: each agents host gets `…/<host>/extensions/<id>/…` with host-correct rendering

- [ ] Step 1: write the failing test:
  ```js
  test('installAgentsFiles places a pack per host', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfagents-'));
    const agents = ext.resolveAgents({ homeDir: home });
    ext.installAgentsFiles(agents, { extensions: ext.resolveExtensions([tmpPack(3)]) });
    for (const h of agents.hosts) {
      assert.ok(fs.existsSync(path.join(h.guidesDir, 'extensions/demo/guides/slashforge-demo.md')));
    }
    assert.deepEqual(JSON.parse(fs.readFileSync(agents.metaFile, 'utf8')).extensions, [{ id:'demo', version:'0.0.1' }]);
  });
  ```
- [ ] Step 2: run — confirm FAIL.
- [ ] Step 3: in `installAgentsFiles`, after each host's guide writes and stale sweep (`install.js:706`), call `installExtensions(h.guidesDir, extensions, { targetName: h.host, ... })` using `renderHostGuide`-style rendering (render + `toHostCommandRefs`). Add `extensions` to the meta object (`install.js:712`). Reuse the same install-time rendering helper from Task 3, parameterized by `targetName` and a `postRender` (identity for Claude, `toHostCommandRefs` for agents hosts).
- [ ] Step 4: run — confirm PASS.
- [ ] Step 5: commit `feat(cli): install --ext packs into Cursor and Codex`.

---

## Task 5: Uninstall a pack
Files: modify `bin/install.js` (`uninstallExtensions`, call it from `uninstallFiles` + `uninstallAgentsFiles`), test `test/extensions.test.js`
Consumes: `extInstallDir`
Produces: `uninstallExtensions(guidesDir)` removes the whole `extensions/` subtree; user files beside it survive

- [ ] Step 1: write the failing test:
  ```js
  test('uninstall removes the extensions subtree, keeps user files', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sfun-'));
    const target = ext.resolveTarget({ homeDir: home });
    ext.installFiles(target, { extensions: ext.resolveExtensions([tmpPack(3)]) });
    fs.writeFileSync(path.join(target.guidesDir, 'my-notes.md'), 'mine');
    ext.uninstallFiles(target, {});
    assert.ok(!fs.existsSync(path.join(target.guidesDir, 'extensions')));
    assert.ok(fs.existsSync(path.join(target.guidesDir, 'my-notes.md')));
  });
  ```
- [ ] Step 2: run — confirm FAIL (the `extensions/` dir would otherwise be left, or `my-notes.md` kept the dir alive).
- [ ] Step 3: add `uninstallExtensions(guidesDir)` that `rmSync(path.join(guidesDir,'extensions'), {recursive:true, force:true})` and returns removed paths; call it at the start of `uninstallFiles` (before `removeKitFiles`, `install.js:762`) and for each host in `uninstallAgentsFiles` (`install.js:784`). The existing `my-notes.md` already keeps the parent dir via current logic; the new assertion confirms the subtree is gone and the user file stays. Export `uninstallExtensions`.
- [ ] Step 4: run — confirm PASS.
- [ ] Step 5: commit `feat(cli): uninstall removes --ext packs`.

---

## Task 6: `--ext` CLI flag, dry-run, help, and the hook snippet
Files: modify `bin/install.js` (`main`, `install`, `plannedWrites`, `plannedAgentsWrites`, `printHelp`, snippet printer), test `test/extensions.test.js`
Consumes: `resolveExtensions`, the threaded `extensions` option
Produces: `node bin/install.js --ext <dir>` installs packs; `--dry-run` lists them; a post-install snippet block prints each pack's hooks

- [ ] Step 1: write the failing test (parse `--ext` into a list, repeatable):
  ```js
  test('parseExtArgs collects repeated --ext values', () => {
    assert.deepEqual(ext.parseExtArgs(['--ext', 'a', '--project', '--ext', 'b']), ['a', 'b']);
    assert.deepEqual(ext.parseExtArgs(['--ext=c']), ['c']);
  });
  ```
- [ ] Step 2: run — confirm FAIL.
- [ ] Step 3: add `parseExtArgs(args)` (collect both `--ext X` and `--ext=X` forms); export it. In `main()` call `const extDirs = parseExtArgs(args)` and pass to `install({ ..., extDirs })`. In `install()`: `const extensions = resolveExtensions(extDirs)` **before** the "already installed" prompt (so a bad pack aborts early with zero writes), pass `{ extensions }` into `installFiles`/`installAgentsFiles`, add extension writes to the `--dry-run` listing via `plannedWrites`/`plannedAgentsWrites` (extend both to take `extensions` and emit `{kind:'ext', dest}` rows), and after a successful install print a snippet for each pack with hooks:
  ```
  console.log(`\nHooks from ${id}: add to your host hook config (see slashforge-hooks.md):`);
  for (const h of hooks) console.log(`  ${h.event}${h.matcher?` [${h.matcher}]`:''} -> node ${path.join(extDir,h.script)}`);
  ```
  Extend `printHelp()` with `--ext <dir>   Install an extension pack (repeatable)`.
- [ ] Step 4: run `node --test test/extensions.test.js` (PASS) and manually `node bin/install.js --dry-run --ext extensions/observability` once Task 8 exists; for now dry-run against the `tmpPack` fixture dir.
- [ ] Step 5: commit `feat(cli): --ext flag, dry-run listing, help, and hook snippet`.

---

## Task 7: Built-in authoring guide + regenerate pinned render
Files: create `templates/slashforge-extensions.md`, modify `bin/install.js` (`GUIDE_FILES`), regenerate `test/fixtures/claude-render`
Consumes: nothing
Produces: `slashforge-extensions.md` installed on every host; pinned render updated

- [ ] Step 1: write `templates/slashforge-extensions.md` (≤ 200 lines, valid frontmatter, balanced target blocks): what a pack is, the `slashforge-ext.json` schema, the pack directory layout, the generic `hooks` contract (any event → any script, with examples beyond telemetry: Slack ping, lint-on-edit, audit log), `slashforge --ext <dir>` usage, where files land (`extensions/<id>/`), and the "review third-party packs before installing" warning. Cross-link `slashforge-hooks.md`.
- [ ] Step 2: add `'slashforge-extensions.md'` to `GUIDE_FILES` (near `slashforge-hooks.md`, `install.js:36`). Run `npm test` — confirm `claude-render.test.js` FAILS (expected: new guide changes output).
- [ ] Step 3: run `node scripts/snapshot-claude-render.js`; `git diff test/fixtures/claude-render` — confirm the only change is the added guide.
- [ ] Step 4: run `npm test` — confirm all green, including line-limit and target-block tests for the new guide.
- [ ] Step 5: commit `feat(templates): add extension-authoring guide; regen pinned render`.

---

## Task 8: The observability reference pack
Files: create `extensions/observability/{slashforge-ext.json, guides/slashforge-observability.md, hooks/emit-telemetry.js, config/observability.config.json, README.md}`, test `test/extensions.test.js`
Consumes: `parseExtManifest`, `validateTemplates`, `resolveExtensions`
Produces: a real pack that installs via `--ext extensions/observability`

- [ ] Step 1: write the failing test asserting the shipped pack is valid and secret-free:
  ```js
  test('observability pack is valid', () => {
    const dir = path.join(__dirname, '..', 'extensions', 'observability');
    const r = ext.resolveExtensions([dir]);               // throws if manifest/guide invalid
    assert.equal(r[0].manifest.id, 'observability');
    assert.ok(fs.existsSync(path.join(dir, 'hooks/emit-telemetry.js')));
    const blob = fs.readFileSync(path.join(dir, 'config/observability.config.json'), 'utf8');
    assert.ok(!/(sk-|bearer\s+\w|token"\s*:\s*"\w)/i.test(blob), 'no secrets in config template');
  });
  ```
- [ ] Step 2: run — confirm FAIL (pack does not exist yet).
- [ ] Step 3: create the pack:
  - `slashforge-ext.json` — manifest from plan.md (events `Stop` + `SessionEnd`, script `hooks/emit-telemetry.js`, config `config/observability.config.json`).
  - `config/observability.config.json` — `{ "transport": "webhook", "endpoint": "", "events": ["Stop","SessionEnd"], "service_name": "slashforge", "emit_tool_use": false }` (no secrets).
  - `hooks/emit-telemetry.js` — zero-dep Node: read JSON from stdin, read config (path via `$SLASHFORGE_OBS_CONFIG` or alongside the script), build a record, and POST by `transport`: `webhook` → raw JSON; `otlp` → OTLP log record to `endpoint/v1/logs` with headers from `OTEL_EXPORTER_OTLP_HEADERS`; `jsonl` → append to a file. **Fail-open**: wrap everything, on any error `process.exit(0)` with no output. `PostToolUse` only emitted when `emit_tool_use` is true.
  - `guides/slashforge-observability.md` — valid guide (frontmatter, ≤200 lines): what it emits (`SessionEnd`+`Stop` by default, `PostToolUse` opt-in), the three transports, how to set the endpoint/token via env, the fail-open guarantee, and the exact per-host hook snippet.
  - `README.md` — install and configure.
- [ ] Step 4: run `node --test test/extensions.test.js` (PASS) and `node bin/install.js --dry-run --ext extensions/observability` (lists the pack + prints hook lines).
- [ ] Step 5: commit `feat(extensions): ship the observability reference pack`.

---

## Task 9: Docs site, README, CHANGELOG
Files: create `docs/src/content/docs/extensions.md` (or the repo's page convention), modify `README.md`, `CHANGELOG.md`
Consumes: everything above
Produces: user-facing documentation; green docs CI

- [ ] Step 1: add a docs page documenting extension packs + the generic hook mechanism + the observability example, following `docs/.claude/rules/astro-docs.md` (no hand-written version, internal links resolve). Link it into the site nav per the existing page pattern.
- [ ] Step 2: add a README section ("Extension packs") with the `--ext` usage and a one-paragraph observability example. No em-dashes/en-dashes (`no-em-dashes-in-copy`).
- [ ] Step 3: prepend a `## [Unreleased]` CHANGELOG entry: "Added: local extension packs (`--ext`) with a generic host-hook mechanism and an OpenTelemetry/observability reference pack."
- [ ] Step 4: from `docs/`, run `npm run build` then `node ../.github/scripts/check-docs-links.mjs`, `check-docs-targets.mjs`, `check-docs-width.mjs`, `check-docs-a11y.mjs`, `check-docs-facts.mjs` — all pass. Run root `npm test` — green.
- [ ] Step 5: commit `docs: document extension packs and the observability pack`.
