# Light Gears — Tasks

Execution: task-by-task, `npm test` green at the end of each, with a review between.
Tasks 1→2→3 are ordered (2 references 1; 3 snapshots 1+2). Task 4 (docs) may follow 3.

---

## Task 1: `/slashforge-test` command + flow guide
Files: create `templates/slashforge-workflow-test.md`, create `templates/slashforge/test.md`, modify `bin/install.js` (`COMMAND_FILES`, `GUIDE_FILES`), modify `test/spec-features.test.js`
Consumes: nothing
Produces: shipped `/slashforge-test` command; guide `slashforge-workflow-test.md`; test helper entry `COMMAND_WORKFLOWS['test.md'] = ['slashforge-workflow-test.md']`

- [ ] Step 1: in `test/spec-features.test.js`, add the `COMMAND_WORKFLOWS` entry `'test.md': ['slashforge-workflow-test.md'],` and write the failing tests:
  ```js
  test('Light Gears: /slashforge-test ships as a command and installs', () => {
    assert.ok(COMMAND_FILES.some((c) => c.endsWith(`${path.sep}test.md`)), 'test.md must be a shipped command');
    const home = tmp();
    const target = resolveTarget({ homeDir: home, cwd: home });
    installFiles(target, {});
    const dest = commandPath(target, path.join('slashforge', 'test.md'));
    assert.ok(fs.existsSync(dest), 'test command must install');
    const body = fs.readFileSync(dest, 'utf8');
    assert.match(body, /^name: \/slashforge-test$/m, 'frontmatter names the command');
    assert.ok(!body.includes('{{INSTALL_PATH}}'), 'test.md must be rendered');
  });

  test('Light Gears: /slashforge-test discovers framework, never edits prod, writes full contract on red', () => {
    const instr = instruction('test.md');
    assert.match(instr, /CLAUDE\.md|AGENTS\.md/, 'framework discovery reads CLAUDE.md/AGENTS.md');
    assert.match(instr, /never modifies production code/i, 'never edits production code');
    assert.match(instr, /latest_investigation\.json/, 'writes the investigation contract on red');
    for (const key of ['run_id', 'reproduction_steps', 'root_cause', 'implicated_files', 'suggested_approach']) {
      assert.match(instr, new RegExp(key), `contract names ${key}`);
    }
  });
  ```
- [ ] Step 2: run `node --test test/spec-features.test.js` — confirm it FAILS (`test.md must be a shipped command`).
- [ ] Step 3: create `templates/slashforge-workflow-test.md` (GUIDE_FILE, ≤200 lines) with frontmatter (`name`, `description`) and these sections, carrying the exact tested phrases:
  - **Framework discovery** — "Reads `CLAUDE.md` (or `AGENTS.md`)" for framework / naming / run command; fallback to the manifest `test` script + existing tests; never guess blind.
  - **Derive intended behaviour** — from signatures, docstrings/types, naming, adjacent docs/tests; ask the user when genuinely ambiguous.
  - **Write spec-based tests** — in the discovered framework/location; the line "This flow **never modifies production code**."
  - **Run & report** — green = covered; red = bug surfaced.
  - **Red path** — before exiting, write a complete `.slashforge/latest_investigation.json` naming all of `run_id`, `reproduction_steps`, `root_cause`, `implicated_files`, `suggested_approach`; then route to `/slashforge-fix` or `/slashforge-code`.
  - **No branch, no PR** — tests left in the working tree.
- [ ] Step 4: create `templates/slashforge/test.md` (COMMAND_FILE, ≤200 lines):
  ```markdown
  ---
  name: /slashforge-test
  description: Generate spec-based test coverage for existing files — a light, standalone flow (no full feature machinery). Writes tests, runs them, reports; surfaces bugs as findings without touching production code.
  ---

  ## Step 0 — Target resolution
  Resolve `$ARGUMENTS` to the file(s)/glob to cover (strip a leading `@`/`#`). If empty, ask what to cover.

  ## Workflow files
  Read in full — together they are your complete guide:
  - {{INSTALL_PATH}}/slashforge-workflow-test.md
  - {{INSTALL_PATH}}/slashforge-workflow-agents.md

  (Announce the targets and the discovered framework, then run the flow. This command never branches, never opens a PR, and never edits production code.)
  ```
- [ ] Step 5: in `bin/install.js`, append to `COMMAND_FILES`: `path.join('slashforge', 'test.md'),` and add to `GUIDE_FILES`: `'slashforge-workflow-test.md',` (place it after `'slashforge-workflow-resume.md'`).
- [ ] Step 6: run `node --test test/spec-features.test.js` — confirm it PASSES.
- [ ] Step 7: commit.

---

## Task 2: `/slashforge-refactor` command + overrides guide
Files: create `templates/slashforge-workflow-refactor.md`, create `templates/slashforge/refactor.md`, modify `bin/install.js` (`COMMAND_FILES`, `GUIDE_FILES`), modify `test/spec-features.test.js`
Consumes: `slashforge-workflow-test.md` from Task 1 (the auto-run target)
Produces: shipped `/slashforge-refactor` command; guide `slashforge-workflow-refactor.md`

- [ ] Step 1: in `test/spec-features.test.js`, add `COMMAND_WORKFLOWS` entry `'refactor.md': ['slashforge-workflow.md', 'slashforge-workflow-refactor.md', 'slashforge-workflow-test.md'],`, extend the "every new workflow companion is registered in GUIDE_FILES" list with `'slashforge-workflow-test.md'` and `'slashforge-workflow-refactor.md'`, and write the failing tests:
  ```js
  test('Light Gears: /slashforge-refactor ships as a command and installs', () => {
    assert.ok(COMMAND_FILES.some((c) => c.endsWith(`${path.sep}refactor.md`)), 'refactor.md must ship');
    const home = tmp();
    const target = resolveTarget({ homeDir: home, cwd: home });
    installFiles(target, {});
    const dest = commandPath(target, path.join('slashforge', 'refactor.md'));
    assert.ok(fs.existsSync(dest), 'refactor command must install');
    const body = fs.readFileSync(dest, 'utf8');
    assert.match(body, /^name: \/slashforge-refactor$/m);
    assert.ok(!body.includes('{{INSTALL_PATH}}'), 'refactor.md must be rendered');
  });

  test('Light Gears: /slashforge-refactor enforces zero-functional-change and the baseline gate', () => {
    const instr = instruction('refactor.md');
    assert.match(instr, /zero-functional-change/i, 'states the zero-functional-change rule');
    assert.match(instr, /baseline/i, 'establishes a before baseline');
    assert.match(instr, /\/slashforge-test|slashforge-workflow-test\.md/, 'auto-runs the test flow when coverage is absent');
    assert.match(instr, /identical|same results/i, 'requires identical before/after results');
  });
  ```
- [ ] Step 2: run `node --test test/spec-features.test.js` — confirm the new tests FAIL.
- [ ] Step 3: create `templates/slashforge-workflow-refactor.md` (GUIDE_FILE, ≤200 lines) with frontmatter and these sections, carrying the exact tested phrases:
  - **Zero-functional-change rule** — the exact token `zero-functional-change`; no behaviour, public-API, or feature changes — structure only.
  - **Baseline gate (before)** — establish a green suite over the target; refuse on an already-red suite; if coverage is **absent** or no happy-path **and** edge-case assertions exist for the target functions, auto-run the `/slashforge-test` flow (`slashforge-workflow-test.md`) first; if that surfaces failing tests, **halt and report** (don't refactor on red).
  - **After** — re-run the suite; results must be **identical** to the baseline; any new failure or behavioural diff fails the gate.
  - **Phase 7 (Review) override** — `code-reviewer` rejects any feature/behaviour/public-API change.
  - **Phase 8 (Docs) override** — skip the user-facing `CHANGELOG.md` feature entry; internal/chore note at most.
  - **Gates** — Phases 3, 4, 8, 10 run unchanged.
- [ ] Step 4: create `templates/slashforge/refactor.md` (COMMAND_FILE, ≤200 lines) mirroring `fix.md`'s shape: frontmatter `name: /slashforge-refactor`; Step 0 target resolution; a **Workflow files** list reading `{{INSTALL_PATH}}/slashforge-workflow.md`, `{{INSTALL_PATH}}/slashforge-workflow-refactor.md`, `{{INSTALL_PATH}}/slashforge-workflow-agents.md`; the four mandatory gates; the per-phase skill list inside `<!--target:claude-->`/`<!--target:agents-->` blocks exactly as `fix.md` does (Phase 5 = `slashforge-tdd` style structure-only edits, Phase 6 = `slashforge-verify`, Phase 7 = `slashforge-request-review` + `code-reviewer`, Phases 8/10 = `git` agent).
- [ ] Step 5: in `bin/install.js`, append to `COMMAND_FILES`: `path.join('slashforge', 'refactor.md'),` and add to `GUIDE_FILES`: `'slashforge-workflow-refactor.md',` (after `'slashforge-workflow-test.md'`).
- [ ] Step 6: run `node --test test/spec-features.test.js` — confirm all PASS.
- [ ] Step 7: commit.

---

## Task 3: Regenerate the pinned Claude render + full suite
Files: modify `test/fixtures/claude-render` (via script)
Consumes: the four new templates from Tasks 1–2
Produces: an up-to-date render fixture

- [ ] Step 1: run `npm test` — expect only `claude-render.test.js` to fail (fixture now stale).
- [ ] Step 2: run `node scripts/snapshot-claude-render.js`.
- [ ] Step 3: run `git diff test/fixtures/claude-render` — confirm the diff is **additive only**: new `slashforge-test.md`, `slashforge-refactor.md` command renders and the two new guide renders; nothing unrelated changed.
- [ ] Step 4: run `npm test` — confirm the whole suite PASSES.
- [ ] Step 5: commit.

---

## Task 4: Docs site + "six → eight" claim sweep + changelog
Files: create `docs/src/content/docs/commands/slashforge-test.md`, create `docs/src/content/docs/commands/slashforge-refactor.md`, modify `docs/src/nav.ts`, modify `README.md`, `docs/src/content/docs/guides/{installation,introduction,trust}.md`, `docs/src/content/docs/reference/cli.md`, `docs/src/pages/index.astro`, `package.json` (description only), `CHANGELOG.md`
Consumes: the shipped command names from Tasks 1–2
Produces: documented commands; consistent "eight commands" claim

- [ ] Step 1: copy `docs/src/content/docs/commands/slashforge-fix.md` to `slashforge-test.md` and `slashforge-refactor.md`; rewrite the body for each command, keeping the exact frontmatter shape and the per-target command markup (`commandForm`/`<!--target-->`) unchanged so `check-docs-targets.mjs` passes.
- [ ] Step 2: in `docs/src/nav.ts`, add after the `/slashforge-review-pr` entry: `{ label: '/slashforge-test', slug: 'commands/slashforge-test' },` and `{ label: '/slashforge-refactor', slug: 'commands/slashforge-refactor' },`.
- [ ] Step 3: change "six" → "eight" and add `test`, `refactor` to the command enumerations in `README.md` (~lines 25, 34, 142, 362), `guides/installation.md`, `guides/introduction.md` (incl. the `## The six commands` heading), `guides/trust.md`, `reference/cli.md`, and `docs/src/pages/index.astro` (`<h2>Six commands</h2>`). Update the `package.json` `description` similarly (version unchanged).
- [ ] Step 4: prepend an `### Added` entry under `## [Unreleased]` in `CHANGELOG.md` for `/slashforge-test` and `/slashforge-refactor`.
- [ ] Step 5: from `docs/`, run `npm run build`, then `node ../.github/scripts/check-docs-links.mjs`, `check-docs-targets.mjs`, `check-docs-width.mjs`, `check-docs-a11y.mjs`, `check-docs-facts.mjs` — all pass.
- [ ] Step 6: run `npm test` from the repo root (includes `docs-claims`/`docs-targets` coverage) — confirm green.
- [ ] Step 7: commit.
