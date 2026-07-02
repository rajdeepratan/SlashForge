# Hygiene & Release Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add tests + CI, release automation, npm provenance, a `--project` install mode, an `uninstall` subcommand, and project docs to `claude-setup-kit` without changing installed guide/command behaviour.

**Architecture:** Refactor `bin/install.js` from a run-on-import script into an importable module: extract pure helpers (`renderTemplate`, `resolveTarget`) and file-op functions (`installFiles`, `uninstallFiles`), guard the CLI under `require.main === module`, and create the readline interface lazily. A single `resolveTarget({ project })` returns the `{ guidesDir, commandsDir, metaFile, installPath, mode }` descriptor that both global and `--project` modes flow through. Tests use built-in `node:test` against temp dirs. New GitHub workflows handle CI, auto-release, and provenance.

**Tech Stack:** Node.js (>=16 runtime; CI on 18/20/22), `node:test` + `node:assert` (no third-party deps), GitHub Actions, `gh` CLI.

## Global Constraints

- **Zero runtime/test dependencies** — use only Node built-ins (`node:test`, `node:assert`, `fs`, `path`, `os`, `readline`). Do not add anything to `dependencies` or `devDependencies`.
- **Global-mode output unchanged** — files written by the default (non-`--project`) install must be byte-identical to today, except `meta.json` gains a `"mode"` field.
- **Node floor** — code must run on Node >= 16 (`engines` in `package.json`). Use `fs.rmSync` (Node 14.14+) — OK.
- **Package name token** — the PyPI/npm names in templates are untouched; only `{{INSTALL_PATH}}`, `{{KIT_VERSION}}`, `{{KIT_PACKAGE}}` are rendered.
- **GitHub Actions versions** — match existing `publish.yml`: `actions/checkout@v6`, `actions/setup-node@v6`.
- **Commit co-author** — every commit ends with:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

### Task 1: Refactor `bin/install.js` into an importable module with extracted helpers

**Files:**
- Modify: `bin/install.js` (full structural refactor)
- Create: `test/install.test.js`

**Interfaces:**
- Produces (exported from `bin/install.js`):
  - `parseFrontmatter(content: string, label: string) -> object` (existing, now exported)
  - `validateTemplates(files: string[], dir: string) -> void` (throws on invalid; existing, now exported)
  - `renderTemplate(content: string, { installPath: string, version: string, pkgName: string }) -> string`
  - `resolveTarget({ project?: boolean, homeDir?: string, cwd?: string }) -> { guidesDir, commandsDir, metaFile, installPath, mode }`
  - `installFiles(target, { templatesDir?, version?, pkgName?, guideFiles?, commandFiles? }) -> string[]` (returns written paths)
  - `uninstallFiles(target, { guideFiles?, commandFiles? }) -> string[]` (returns removed paths)
  - `GUIDE_FILES: string[]`, `COMMAND_FILES: string[]`
- CLI behaviour (global mode) is preserved; only runs under `require.main === module`.

- [ ] **Step 1: Write the failing tests**

Create `test/install.test.js`:

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  parseFrontmatter,
  validateTemplates,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  GUIDE_FILES,
  COMMAND_FILES,
} = require('../bin/install.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'csk-test-'));
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
  assert.equal(t.guidesDir, path.join('/home/u', '.claude', 'setup', 'claude-setup'));
  assert.equal(t.commandsDir, path.join('/home/u', '.claude', 'commands'));
  assert.equal(t.installPath, '/home/u/.claude/setup/claude-setup');
});

test('resolveTarget project uses cwd and repo-relative installPath', () => {
  const t = resolveTarget({ project: true, homeDir: '/home/u', cwd: '/repo' });
  assert.equal(t.mode, 'project');
  assert.equal(t.guidesDir, path.join('/repo', '.claude', 'setup', 'claude-setup'));
  assert.equal(t.commandsDir, path.join('/repo', '.claude', 'commands'));
  assert.equal(t.installPath, '.claude/setup/claude-setup');
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

test('installFiles project renders repo-relative installPath into commands', () => {
  const repo = tmp();
  const target = resolveTarget({ project: true, cwd: repo, homeDir: repo });
  installFiles(target, {});
  const body = fs.readFileSync(path.join(target.commandsDir, 'setup-claude.md'), 'utf8');
  assert.ok(body.includes('.claude/setup/claude-setup'));
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test`
Expected: FAIL — `renderTemplate`, `resolveTarget`, `installFiles`, `uninstallFiles` are `undefined` (not yet exported), throwing `TypeError: ... is not a function`.

- [ ] **Step 3: Refactor `bin/install.js`**

Rewrite `bin/install.js` so the module is import-safe and exports the helpers. Key changes (keep all existing CLI behaviour):

1. Replace `const { name: pkgName, version } = require('../package.json');` with `const pkg = require('../package.json');` (avoids default-param shadowing). Use `pkg.name` / `pkg.version` throughout.
2. Delete the module-level `const rl = readline.createInterface(...)` (line ~97). Add a lazy accessor:

```js
let _rl = null;
function getRl() {
  if (!_rl) _rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return _rl;
}
function closeRl() {
  if (_rl) { _rl.close(); _rl = null; }
}
function prompt(question) {
  return new Promise((resolve) => getRl().question(question, (a) => resolve(a.trim())));
}
```

3. Add `renderTemplate`:

```js
function renderTemplate(content, { installPath, version, pkgName }) {
  return content
    .replace(/\{\{INSTALL_PATH\}\}/g, installPath)
    .replace(/\{\{KIT_VERSION\}\}/g, version)
    .replace(/\{\{KIT_PACKAGE\}\}/g, pkgName);
}
```

4. Add `resolveTarget`:

```js
function resolveTarget({ project = false, homeDir = os.homedir(), cwd = process.cwd() } = {}) {
  if (project) {
    const base = path.join(cwd, '.claude');
    const guidesDir = path.join(base, 'setup', 'claude-setup');
    return {
      guidesDir,
      commandsDir: path.join(base, 'commands'),
      metaFile: path.join(guidesDir, 'meta.json'),
      installPath: '.claude/setup/claude-setup',
      mode: 'project',
    };
  }
  const guidesDir = path.join(homeDir, '.claude', 'setup', 'claude-setup');
  return {
    guidesDir,
    commandsDir: path.join(homeDir, '.claude', 'commands'),
    metaFile: path.join(guidesDir, 'meta.json'),
    installPath: guidesDir.split(path.sep).join('/'),
    mode: 'global',
  };
}
```

5. Add `installFiles` (the file-writing core, no prompts — `install()` calls this after its confirm/dry-run logic):

```js
function installFiles(target, {
  templatesDir = TEMPLATES_DIR,
  version = pkg.version,
  pkgName = pkg.name,
  guideFiles = GUIDE_FILES,
  commandFiles = COMMAND_FILES,
} = {}) {
  validateTemplates(guideFiles, templatesDir);
  validateTemplates(commandFiles, templatesDir);
  fs.mkdirSync(target.guidesDir, { recursive: true });
  fs.mkdirSync(target.commandsDir, { recursive: true });
  const written = [];
  for (const f of guideFiles) {
    const dest = path.join(target.guidesDir, f);
    fs.copyFileSync(path.join(templatesDir, f), dest);
    written.push(dest);
  }
  for (const c of commandFiles) {
    const rendered = renderTemplate(fs.readFileSync(path.join(templatesDir, c), 'utf8'), {
      installPath: target.installPath,
      version,
      pkgName,
    });
    const dest = path.join(target.commandsDir, c);
    fs.writeFileSync(dest, rendered);
    written.push(dest);
  }
  const meta = JSON.stringify({
    package: pkgName,
    version,
    installed_at: new Date().toISOString(),
    mode: target.mode,
    commands: commandFiles.map((c) => c.replace(/\.md$/, '')),
  }, null, 2) + '\n';
  fs.writeFileSync(target.metaFile, meta);
  written.push(target.metaFile);
  return written;
}
```

6. Add `uninstallFiles`:

```js
function uninstallFiles(target, { guideFiles = GUIDE_FILES, commandFiles = COMMAND_FILES } = {}) {
  const removed = [];
  for (const c of commandFiles) {
    const p = path.join(target.commandsDir, c);
    if (fs.existsSync(p)) { fs.rmSync(p); removed.push(p); }
  }
  if (fs.existsSync(target.guidesDir)) {
    fs.rmSync(target.guidesDir, { recursive: true, force: true });
    removed.push(target.guidesDir);
  }
  return removed;
}
```

7. Rewrite the existing `install()` so it (a) resolves a target via `resolveTarget`, (b) keeps the "already installed? confirm" + `--dry-run` flow, (c) calls `installFiles(target, ...)` to do the writing, (d) prints the same success output. Keep `printStatus`/`status` reading from a resolved target. Use `pkg.version` for the dry-run/update messages.
8. Guard CLI execution and close readline only in CLI mode:

```js
if (require.main === module) {
  main().catch((err) => {
    closeRl();
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  parseFrontmatter,
  validateTemplates,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  GUIDE_FILES,
  COMMAND_FILES,
};
```

9. Ensure `main()` calls `closeRl()` in its `finally` (replacing the old `rl.close()`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test`
Expected: PASS — all 11 tests green.

- [ ] **Step 5: Smoke-test the CLI still works (global, dry-run)**

Run: `node bin/install.js --dry-run`
Expected: prints the planned writes under `~/.claude/...` exactly as before (no files written).

- [ ] **Step 6: Commit**

```bash
git add bin/install.js test/install.test.js
git commit -m "refactor: make install.js importable and extract helpers + tests

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Wire `--project` install mode into the CLI

**Files:**
- Modify: `bin/install.js` (arg parsing in `main()` + `install()`/`status` target resolution)

**Interfaces:**
- Consumes: `resolveTarget({ project })`, `installFiles` (Task 1)
- Produces: `--project` flag recognised by install and `status`; passed through to `resolveTarget`.

- [ ] **Step 1: Add `--project` to arg parsing**

In `main()`, compute `const project = args.includes('--project');` and pass `{ project }` into `install()` and the `status` path so they call `resolveTarget({ project })`. The "already installed?" check and dry-run output must reflect the resolved target's dirs (so `--project --dry-run` shows `./.claude/...`).

- [ ] **Step 2: Verify project install end-to-end in a temp repo**

Run:
```bash
d=$(mktemp -d) && (cd "$d" && node "$OLDPWD/bin/install.js" --project --yes) && \
  grep -l '.claude/setup/claude-setup' "$d"/.claude/commands/setup-claude.md && \
  cat "$d"/.claude/setup/claude-setup/meta.json
```
Expected: command file references the repo-relative guide path; `meta.json` shows `"mode": "project"`; guide files present under `"$d"/.claude/setup/claude-setup/`.

- [ ] **Step 3: Verify global dry-run is unchanged**

Run: `node bin/install.js --dry-run`
Expected: still shows `~/.claude/...` paths (no regression from adding the flag).

- [ ] **Step 4: Commit**

```bash
git add bin/install.js
git commit -m "feat: add --project mode to install commands into ./.claude

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Add the `uninstall` subcommand

**Files:**
- Modify: `bin/install.js` (`main()` dispatch + new `uninstall()` orchestrator + `printHelp`)

**Interfaces:**
- Consumes: `resolveTarget`, `uninstallFiles` (Task 1)
- Produces: `claude-setup-kit uninstall [--project] [--yes]` CLI surface.

- [ ] **Step 1: Add `uninstall()` orchestrator**

```js
async function uninstall({ project, assumeYes }) {
  const target = resolveTarget({ project });
  const installed = fs.existsSync(target.guidesDir) ||
    COMMAND_FILES.some((c) => fs.existsSync(path.join(target.commandsDir, c)));
  if (!installed) {
    console.log('claude-setup-kit is not installed at this location. Nothing to remove.');
    return;
  }
  if (!assumeYes) {
    const answer = await prompt(`Remove claude-setup-kit guides + commands from ${target.guidesDir} and ${target.commandsDir}? (y/n): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Skipped. No changes made.');
      return;
    }
  }
  const removed = uninstallFiles(target, {});
  console.log('\n✓ Uninstalled claude-setup-kit');
  for (const p of removed) console.log(`  removed ${p}`);
}
```

- [ ] **Step 2: Dispatch `uninstall` in `main()`**

In `main()`, before the install path: `if (args[0] === 'uninstall') { await uninstall({ project: args.includes('--project'), assumeYes }); closeRl(); return; }` (reuse the existing `assumeYes` computation).

- [ ] **Step 3: Update `printHelp`**

Add to the Commands block: `  uninstall    Remove the kit's guides and commands (use --project for ./.claude)`.

- [ ] **Step 4: Verify install → uninstall round-trip in a temp repo**

Run:
```bash
d=$(mktemp -d) && cd "$d" && \
  node "$OLDPWD/bin/install.js" --project --yes && \
  node "$OLDPWD/bin/install.js" uninstall --project --yes && \
  ([ ! -d "$d/.claude/setup" ] && echo "GUIDES REMOVED") && \
  ([ ! -f "$d/.claude/commands/code.md" ] && echo "COMMANDS REMOVED")
```
Expected: prints `GUIDES REMOVED` and `COMMANDS REMOVED`; uninstall lists removed paths.

- [ ] **Step 5: Run the test suite (no regressions)**

Run: `node --test`
Expected: PASS — all tests still green.

- [ ] **Step 6: Commit**

```bash
git add bin/install.js
git commit -m "feat: add uninstall subcommand

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Add `test` script + CI workflow

**Files:**
- Modify: `package.json` (`scripts`)
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Add the test script**

In `package.json`, add:
```json
  "scripts": {
    "test": "node --test"
  },
```
(Insert after the `"description"` field, before `"bin"`, keeping valid JSON.)

- [ ] **Step 2: Verify `npm test` runs the suite**

Run: `npm test`
Expected: PASS — same green output as `node --test`.

- [ ] **Step 3: Create the CI workflow**

`.github/workflows/ci.yml`:
```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18, 20, 22]
    steps:
      - uses: actions/checkout@v6
      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v6
        with:
          node-version: ${{ matrix.node-version }}
      - name: Run tests
        run: npm test
```

- [ ] **Step 4: Lint the workflow (if actionlint available)**

Run: `command -v actionlint >/dev/null && actionlint .github/workflows/ci.yml || echo "actionlint not installed — skipping"`
Expected: no errors (or the skip message).

- [ ] **Step 5: Commit**

```bash
git add package.json .github/workflows/ci.yml
git commit -m "ci: add test script and CI workflow on push/PR

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Auto-release workflow + provenance/test gate in publish

**Files:**
- Create: `.github/workflows/auto-release.yml`
- Modify: `.github/workflows/publish.yml`

- [ ] **Step 1: Create the auto-release workflow**

`.github/workflows/auto-release.yml`:
```yaml
name: Auto-release

on:
  push:
    branches: [main]
    paths: ['package.json']

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - name: Read package version
        id: v
        run: echo "version=$(node -p "require('./package.json').version")" >> "$GITHUB_OUTPUT"
      - name: Create release if tag is new
        env:
          GH_TOKEN: ${{ github.token }}
        run: |
          tag="v${{ steps.v.outputs.version }}"
          if gh release view "$tag" >/dev/null 2>&1; then
            echo "Release $tag already exists — skipping."
          else
            gh release create "$tag" --generate-notes --title "$tag"
          fi
```

- [ ] **Step 2: Update `publish.yml` for provenance + test gate**

Modify `.github/workflows/publish.yml`:
- Change the job `permissions` to:
```yaml
    permissions:
      contents: read
      id-token: write
```
- After the `Setup Node.js` step, add a test gate:
```yaml
      - name: Run tests
        run: npm test
```
- Change the publish step command to:
```yaml
      - name: Publish to npm
        run: npm publish --provenance --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

- [ ] **Step 3: Lint both workflows (if actionlint available)**

Run: `command -v actionlint >/dev/null && actionlint .github/workflows/auto-release.yml .github/workflows/publish.yml || echo "actionlint not installed — skipping"`
Expected: no errors (or the skip message).

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/auto-release.yml .github/workflows/publish.yml
git commit -m "ci: auto-release on version bump + npm provenance and test gate

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Docs — `.gitignore`, `CHANGELOG.md`, README badges + new-feature docs

**Files:**
- Create: `.gitignore`
- Create: `CHANGELOG.md`
- Modify: `README.md`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
node_modules/
.DS_Store
*.log
npm-debug.log*
.npm/
coverage/
```

- [ ] **Step 2: Create `CHANGELOG.md`**

```markdown
# Changelog

All notable changes to this project are documented here. Format based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); this project adheres
to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Test suite (`node:test`) and a CI workflow running on push/PR across Node 18/20/22.
- Auto-release workflow: a version bump merged to `main` creates the matching tag + GitHub Release, which triggers publishing.
- npm provenance on publish, with a test gate before `npm publish`.
- `uninstall` subcommand to remove the kit's guides and commands.
- `--project` install mode: vendors guides + commands into a repo's `./.claude/` (repo-relative paths) so a cloned repo gets working commands with no global install.
- `.gitignore` and this changelog.

## [1.4.0] - 2026-06-28

### Changed
- `/setup-claude` restructured into five phases so all user decisions are batched up front; only Graphify's `CLAUDE.md` append runs last, preserving the "kit's CLAUDE.md first" ordering.

## [1.3.0] - 2026-05-16

### Added
- Self-contained `SUMMARY.html` synthesis and investigation findings as HTML.

## [1.2.1] - 2026-05-05

### Fixed
- Graphify offer no longer short-circuits when the CLI is already on `PATH`.

## [1.2.0] - 2026-05-01

### Added
- Preflight checks, `/quick` command, Graphify integration, graph-freshness check, and `.claude/` coverage detection.
```

- [ ] **Step 3: Update README — badges**

Add directly under the `# claude-setup-kit` H1:
```markdown
[![npm version](https://img.shields.io/npm/v/claude-setup-kit.svg)](https://www.npmjs.com/package/claude-setup-kit)
[![CI](https://github.com/rajdeepratan/claude-setup-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/rajdeepratan/claude-setup-kit/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/claude-setup-kit.svg)](LICENSE)
[![node](https://img.shields.io/node/v/claude-setup-kit.svg)](package.json)
```

- [ ] **Step 4: Update README — document `uninstall` + `--project`**

In the "Installer flags and subcommands" code block, add:
```bash
claude-setup-kit --project    # Install into ./.claude/ in the current repo (committable, no global install needed)
claude-setup-kit uninstall    # Remove the kit's guides + commands (add --project for ./.claude)
```
And add a short prose line after that block:
> `--project` vendors both the guide files and the four command files into the repo's `./.claude/` with repo-relative paths — commit it and teammates get the commands with no global install. `uninstall` reverses either install (pass `--project` to target the repo copy).

- [ ] **Step 5: Verify the full test suite once more**

Run: `npm test`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add .gitignore CHANGELOG.md README.md
git commit -m "docs: add .gitignore, CHANGELOG, README badges and new-feature docs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notes for the implementer

- **Do not** bump the version in `package.json` in this branch unless asked — the auto-release workflow will publish whatever version lands on `main`, and the release/publish dance is a separate decision the user controls.
- Run `node --test` after every install.js task; it's fast and catches refactor regressions immediately.
- The two new feature commits (`--project`, `uninstall`) are CLI wiring over functions already unit-tested in Task 1 — the temp-repo smoke tests in Tasks 2/3 are the verification for the wiring itself.
