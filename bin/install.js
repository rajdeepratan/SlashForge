#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const pkg = require('../package.json');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const GUIDE_FILES = [
  'forge-instructions.md',
  'forge-graph.md',
  'forge-graph-summary.md',
  'forge-coverage.md',
  'forge-workflow.md',
  'forge-workflow-investigation.md',
  'forge-workflow-review-pr.md',
  'forge-workflow-agents.md',
  'forge-workflow-quick.md',
  'forge-rules.md',
  'forge-skills.md',
  'forge-agents.md',
  'forge-commands.md',
  'forge-hooks.md',
  'forge-claude-md.md',
  'forge-memory.md',
];

// Non-markdown files installed verbatim next to the guides. They carry no
// frontmatter, so they are copied but never frontmatter-validated.
const ASSET_FILES = [
  'forge-report-shell.html',
  'forge-open.sh',
];

const COMMAND_FILES = [
  path.join('slashforge', 'setup.md'),
  path.join('slashforge', 'code.md'),
  path.join('slashforge', 'investigate.md'),
  path.join('slashforge', 'review-pr.md'),
];

// Discipline skills. They install into the same `slashforge/` namespace dir as the
// commands above — that subdirectory is what produces a `slashforge:` invocation —
// and are rendered the same way. They are kept out of COMMAND_FILES on purpose:
// that list drives meta.json's `commands` and the `status` output, which should
// keep reporting the three entry points a user actually types, not every internal
// discipline the workflow invokes on their behalf.
const SKILL_FILES = [
  path.join('slashforge', 'brainstorm.md'),
  path.join('slashforge', 'plan.md'),
  path.join('slashforge', 'debug.md'),
  path.join('slashforge', 'tdd.md'),
  path.join('slashforge', 'verify.md'),
  path.join('slashforge', 'review-feedback.md'),
  path.join('slashforge', 'request-review.md'),
  path.join('slashforge', 'worktree.md'),
  path.join('slashforge', 'parallel.md'),
];

// Guide files dropped in a later version. Install overwrites what it ships but
// does not clear the guides dir, so without this an upgrade leaves the old file
// sitting there being read by nothing.
const REMOVED_GUIDE_FILES = [
  // v4.3.0: superpowers became fully optional, so the only preflight check had
  // nothing left to detect.
  'forge-preflight.md',
];

// Install targets. `claude` writes flat command files under .claude/commands/slashforge/,
// which is what produces the /slashforge:name form. `agents` writes the Agent Skills
// layout to .agents/skills/, which both Cursor and Codex read. That layout has no
// namespace of any kind, so the prefix has to be carried in the directory name instead.
const TARGETS = {
  claude: { dirname: '.claude', commandsSubdir: 'commands', layout: 'commands', namePrefix: '', omit: [] },
  agents: {
    dirname: '.agents',
    commandsSubdir: 'skills',
    layout: 'skills',
    namePrefix: 'slashforge-',
    // setup provisions .claude/agents, hooks and CLAUDE.md — none of which exist here.
    omit: [path.join('slashforge', 'setup.md')],
  },
};

// Users type the vendor they use, not the directory convention it happens to share.
const TARGET_ALIASES = { cursor: 'agents', codex: 'agents' };

function resolveTargetName(name) {
  const key = String(name == null ? 'claude' : name).trim().toLowerCase();
  const resolved = TARGET_ALIASES[key] || key;
  if (!TARGETS[resolved]) {
    throw new Error(`Unknown target '${name}'. Use one of: claude, cursor, codex, agents.`);
  }
  return resolved;
}

// Namespace directory the command files live in, under the commands dir.
const COMMAND_NAMESPACE = 'slashforge';

// v3 used a `forge` namespace. Kept so uninstall can clear it after an upgrade.
const LEGACY_COMMAND_NAMESPACE = 'forge';

// v2 layout. Nothing writes these anymore — they exist so `uninstall` and
// `status` can still find and clean up an install made by slashforge < 3.0.0.
// Without them an upgrade would orphan the old files in ~/.claude/ forever.
const LEGACY_GUIDES_DIRNAME = 'claude-setup';
const LEGACY_COMMAND_FILES = [
  // v2 layout: flat command files.
  'setup-claude.md',
  'code.md',
  'quick.md',
  'investigate.md',
  // v3 layout: `forge` namespace.
  path.join('forge', 'setup.md'),
  path.join('forge', 'code.md'),
  path.join('forge', 'investigate.md'),
];

// ---------------------------------------------------------------------------
// Lazy readline (only opened when the CLI actually needs interactive input)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------


function parseFrontmatter(content, label) {
  const lines = content.split(/\r?\n/);
  if (lines[0].trim() !== '---') {
    throw new Error(`${label}: missing opening '---' frontmatter fence`);
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    throw new Error(`${label}: missing closing '---' frontmatter fence`);
  }
  const fm = {};
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      throw new Error(`${label}: invalid frontmatter at line ${i + 1}: "${line}"`);
    }
    fm[match[1].trim()] = match[2].trim();
  }
  for (const required of ['name', 'description']) {
    if (!fm[required]) {
      throw new Error(`${label}: frontmatter missing required field '${required}'`);
    }
  }
  return fm;
}

// Assets carry no frontmatter, so presence is the only thing worth checking.
// Missing one still refuses the install — a half-installed kit is worse than none.
function assertTemplatesExist(files, dir) {
  const missing = files.filter((f) => !fs.existsSync(path.join(dir, f)));
  if (missing.length) {
    console.error('\nTemplate validation failed:');
    for (const f of missing) console.error(`  ✗ missing template: ${path.join(dir, f)}`);
    throw new Error('Refusing to install with invalid templates.');
  }
}

function validateTemplates(files, dir) {
  const errors = [];
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (!fs.existsSync(filePath)) {
      errors.push(`missing template: ${filePath}`);
      continue;
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      parseFrontmatter(content, file);
    } catch (err) {
      errors.push(err.message);
    }
  }
  if (errors.length) {
    console.error('\nTemplate validation failed:');
    for (const err of errors) console.error(`  ✗ ${err}`);
    throw new Error('Refusing to install with invalid templates.');
  }
}

function renderTemplate(content, { installPath, version, pkgName }) {
  return content
    .replace(/\{\{INSTALL_PATH\}\}/g, installPath)
    .replace(/\{\{KIT_VERSION\}\}/g, version)
    .replace(/\{\{KIT_PACKAGE\}\}/g, pkgName);
}

// 'slashforge/code.md' -> 'slashforge-code'.
function skillDirName(file, prefix = '') {
  return prefix + path.basename(file, '.md');
}

// Cursor and Codex require `name` to be lowercase letters, digits and hyphens only,
// and to match the skill's parent directory. Templates carry Claude Code's
// '/slashforge:code' form, so that one line is rewritten. Bounded to the frontmatter
// block so a body line beginning 'name:' is never touched.
function toSkillFrontmatter(content, skillName) {
  const lines = content.split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  for (let i = 1; i < end; i += 1) {
    if (/^name\s*:/.test(lines[i])) {
      lines[i] = `name: ${skillName}`;
      break;
    }
  }
  return lines.join('\n');
}

// Where a command template lands for a given target.
function commandPath(target, file) {
  return target.layout === 'skills'
    ? path.join(target.commandsDir, skillDirName(file, target.namePrefix), 'SKILL.md')
    : path.join(target.commandsDir, file);
}

// The skills layout has no `:` namespace, so in-body references to sibling commands
// must use the hyphenated form — otherwise every cross-reference in the workflow names
// a command that does not exist on this target.
function toSkillCommandRefs(content, prefix) {
  return content.replace(/\/slashforge:([a-z][a-z-]*)/g, `/${prefix}$1`);
}

// 'forge/setup.md' -> '/slashforge:setup'. A command file's path under the commands
// dir determines how it is invoked; a subdirectory becomes a `:` namespace. The
// skills layout has no namespace, so the prefix lives in the directory name instead.
function commandName(file, target = null) {
  if (target && target.layout === 'skills') {
    return '/' + skillDirName(file, target.namePrefix);
  }
  return '/' + file.replace(/\.md$/, '').split(path.sep).join(':');
}

function resolveTarget({ target = 'claude', project = false, homeDir = os.homedir(), cwd = process.cwd() } = {}) {
  const name = resolveTargetName(target);
  const spec = TARGETS[name];
  const base = path.join(project ? cwd : homeDir, spec.dirname);
  const guidesDir = path.join(base, 'setup', 'slashforge');
  return {
    target: name,
    layout: spec.layout,
    namePrefix: spec.namePrefix,
    omit: spec.omit,
    guidesDir,
    // Only the Claude target ever had a v2 layout to clean up.
    legacyGuidesDir: name === 'claude' ? path.join(base, 'setup', LEGACY_GUIDES_DIRNAME) : null,
    commandsDir: path.join(base, spec.commandsSubdir),
    metaFile: path.join(guidesDir, 'meta.json'),
    installPath: project
      ? [spec.dirname, 'setup', 'slashforge'].join('/')
      : guidesDir.split(path.sep).join('/'),
    mode: project ? 'project' : 'global',
  };
}

function installFiles(target, {
  templatesDir = TEMPLATES_DIR,
  version = pkg.version,
  pkgName = pkg.name,
  guideFiles = GUIDE_FILES,
  commandFiles = COMMAND_FILES,
  assetFiles = ASSET_FILES,
  skillFiles = SKILL_FILES,
} = {}) {
  validateTemplates(guideFiles, templatesDir);
  validateTemplates(commandFiles, templatesDir);
  // Skills carry frontmatter, so they are validated like commands — not like
  // assets, which have none and are only checked for existence.
  validateTemplates(skillFiles, templatesDir);
  assertTemplatesExist(assetFiles, templatesDir);
  fs.mkdirSync(target.guidesDir, { recursive: true });
  fs.mkdirSync(target.commandsDir, { recursive: true });
  const written = [];
  // Guides are rendered like commands: a guide may name a sibling by absolute
  // path (forge-workflow-review-pr.md points at forge-report-shell.html), and a
  // copied-not-rendered guide would ship the literal {{INSTALL_PATH}}.
  for (const f of guideFiles) {
    const dest = path.join(target.guidesDir, f);
    let rendered = renderTemplate(fs.readFileSync(path.join(templatesDir, f), 'utf8'), {
      installPath: target.installPath,
      version,
      pkgName,
    });
    if (target.layout === 'skills') {
      rendered = toSkillCommandRefs(rendered, target.namePrefix);
    }
    fs.writeFileSync(dest, rendered);
    written.push(dest);
  }
  // Assets are installed verbatim — forge-open.sh is executed as-is and the
  // report shell's own markers are not mustache placeholders.
  for (const f of assetFiles) {
    const dest = path.join(target.guidesDir, f);
    fs.copyFileSync(path.join(templatesDir, f), dest);
    written.push(dest);
  }
  const omit = target.omit || [];
  for (const c of [...commandFiles, ...skillFiles]) {
    // A target may not support every command; setup provisions Claude Code
    // structure that has no equivalent under the skills layout.
    if (omit.includes(c)) continue;
    let rendered = renderTemplate(fs.readFileSync(path.join(templatesDir, c), 'utf8'), {
      installPath: target.installPath,
      version,
      pkgName,
    });
    let dest;
    if (target.layout === 'skills') {
      const name = skillDirName(c, target.namePrefix);
      rendered = toSkillCommandRefs(rendered, target.namePrefix);
      rendered = toSkillFrontmatter(rendered, name);
      dest = path.join(target.commandsDir, name, 'SKILL.md');
    } else {
      // Command files live in a namespace subdirectory (forge/), which is what
      // produces the /slashforge:name invocation form.
      dest = path.join(target.commandsDir, c);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, rendered);
    written.push(dest);
  }
  for (const f of REMOVED_GUIDE_FILES) {
    const stale = path.join(target.guidesDir, f);
    if (fs.existsSync(stale)) fs.rmSync(stale);
  }
  const meta = JSON.stringify({
    package: pkgName,
    version,
    installed_at: new Date().toISOString(),
    mode: target.mode,
    target: target.target,
    commands: commandFiles
      .filter((c) => !omit.includes(c))
      .map((c) => commandName(c, target)),
  }, null, 2) + '\n';
  fs.writeFileSync(target.metaFile, meta);
  written.push(target.metaFile);
  return written;
}

function uninstallFiles(target, {
  guideFiles = GUIDE_FILES,
  commandFiles = COMMAND_FILES,
  skillFiles = SKILL_FILES,
} = {}) {
  const removed = [];
  if (target.layout === 'skills') {
    // .agents/skills is shared ground with every other tool's skills, so only the
    // directories this installer writes are eligible for removal.
    for (const c of [...commandFiles, ...skillFiles]) {
      const dir = path.join(target.commandsDir, skillDirName(c, target.namePrefix));
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        removed.push(dir);
      }
    }
    // Prune the shared root only if we are the ones who emptied it.
    if (fs.existsSync(target.commandsDir) && fs.readdirSync(target.commandsDir).length === 0) {
      fs.rmdirSync(target.commandsDir);
      removed.push(target.commandsDir);
    }
  } else {
    // Current layout plus the v2 flat command files, so upgrading from < 3.0.0
    // and then uninstalling does not leave the old files behind.
    for (const c of [...commandFiles, ...skillFiles, ...LEGACY_COMMAND_FILES]) {
      const p = path.join(target.commandsDir, c);
      if (fs.existsSync(p)) { fs.rmSync(p); removed.push(p); }
    }
    // Prune the namespace dir once emptied, but never touch it if the user has
    // put their own commands in there.
    for (const ns of [COMMAND_NAMESPACE, LEGACY_COMMAND_NAMESPACE]) {
      const nsDir = path.join(target.commandsDir, ns);
      if (fs.existsSync(nsDir) && fs.readdirSync(nsDir).length === 0) {
        fs.rmdirSync(nsDir);
        removed.push(nsDir);
      }
    }
  }
  for (const dir of [target.guidesDir, target.legacyGuidesDir]) {
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      removed.push(dir);
    }
  }
  return removed;
}

function readMeta(metaFile) {
  try {
    return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Update check
// ---------------------------------------------------------------------------

/**
 * True when `candidate` is a strictly newer release than `current`.
 *
 * Plain `x.y.z` only. A prerelease, a build tag, or anything else this does not
 * understand returns false: the warning is unsolicited, so it prints only when
 * it is certainly right.
 */
function isNewerVersion(candidate, current) {
  const parse = (v) => {
    const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(v == null ? '' : v).trim());
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
  };
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i += 1) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

/**
 * The version the registry serves as `latest`, or null.
 *
 * Every failure path is silent and the timeout is short. This is a courtesy
 * line at the end of an install that has already succeeded — it must never
 * make one hang, fail, or behave differently offline. Honours the registry npm
 * is configured with, so a mirror or a private proxy is asked instead.
 */
function fetchLatestVersion({ timeoutMs = 1500 } = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v) => {
      if (!settled) {
        settled = true;
        resolve(v);
      }
    };

    const base = (process.env.npm_config_registry || 'https://registry.npmjs.org/').replace(/\/+$/, '');
    // The version manifest, not the packument: ~2KB against ~200KB, and every
    // registry serves it. Note the plain Accept — npm's abbreviated-metadata
    // type (application/vnd.npm.install-v1+json) is only valid on the packument
    // endpoint and answers 406 here, which is silent by design and would have
    // meant this check never fired.
    const url = `${base}/${pkg.name}/latest`;
    const client = url.startsWith('http://') ? require('http') : require('https');

    let req;
    try {
      req = client.get(
        url,
        { headers: { accept: 'application/json' }, timeout: timeoutMs },
        (res) => {
          if (res.statusCode !== 200) {
            res.resume();
            done(null);
            return;
          }
          let body = '';
          res.setEncoding('utf8');
          res.on('data', (chunk) => {
            body += chunk;
            // A manifest is a few KB. Anything larger is not what we asked for.
            if (body.length > 1e6) req.destroy();
          });
          res.on('end', () => {
            try {
              done(JSON.parse(body).version || null);
            } catch {
              done(null);
            }
          });
        }
      );
    } catch {
      done(null);
      return;
    }

    req.on('timeout', () => {
      req.destroy();
      done(null);
    });
    req.on('error', () => done(null));
  });
}

/**
 * Prints one line when the running copy is behind the registry.
 *
 * The installer reports its own version, so a stale copy looks exactly like a
 * current one. That is what a global `npm i -g slashforge` produces: `npx`
 * prefers an executable already on PATH and never contacts the registry, so
 * `npx slashforge` can install an old release indefinitely with no sign that
 * anything is wrong. The fix is named here because it is not guessable.
 *
 * Skipped under CI and behind SLASHFORGE_NO_UPDATE_CHECK, where the output is
 * a log nobody reads.
 */
async function warnIfOutdated() {
  if (process.env.SLASHFORGE_NO_UPDATE_CHECK === '1' || process.env.CI) return;

  const latest = await fetchLatestVersion();
  if (!isNewerVersion(latest, pkg.version)) return;

  console.log(`\n⚠  This is v${pkg.version}. The current release is v${latest}.`);
  console.log(`   \`npx ${pkg.name}\` runs a global install if you have one, and never checks npm:`);
  console.log(`     npm uninstall -g ${pkg.name}     # then re-run npx, or`);
  console.log(`     npm install -g ${pkg.name}@latest`);
}

// ---------------------------------------------------------------------------
// CLI commands
// ---------------------------------------------------------------------------

async function printStatus({ target: targetName = 'claude', project = false } = {}) {
  const target = resolveTarget({ target: targetName, project });
  if (!fs.existsSync(target.guidesDir)) {
    console.log('slashforge: not installed.');
    console.log(`Run \`npx ${pkg.name}\` to install v${pkg.version}.`);
    await warnIfOutdated();
    return;
  }

  const meta = readMeta(target.metaFile);
  console.log(`\nslashforge status`);
  console.log(`  Target:                    ${target.target}`);
  console.log(`  Package version (current): v${pkg.version}`);
  if (meta) {
    const marker = meta.version !== pkg.version ? '  ← update available' : '';
    console.log(`  Installed version:         v${meta.version}${marker}`);
    console.log(`  Installed at:              ${meta.installed_at}`);
  } else {
    console.log(`  Installed version:         unknown (legacy install — no meta.json)`);
  }

  const installed = fs
    .readdirSync(target.guidesDir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  console.log(`  Guide files:               ${installed.length} (${target.guidesDir})`);
  for (const f of installed) console.log(`    • ${f}`);

  // Command files sit in a namespace subdirectory, so probe each expected path
  // rather than listing the commands dir.
  const commands = COMMAND_FILES
    .filter((c) => fs.existsSync(commandPath(target, c)))
    .sort();
  console.log(`  Installed commands:        ${commands.length}`);
  for (const f of commands) console.log(`    • ${commandName(f, target)}`);

  await warnIfOutdated();
}

// The file writes an install would perform, as data — so the dry-run listing can be
// asserted on without capturing stdout.
function plannedWrites(target, {
  templatesDir = TEMPLATES_DIR,
  guideFiles = GUIDE_FILES,
  commandFiles = COMMAND_FILES,
  assetFiles = ASSET_FILES,
  skillFiles = SKILL_FILES,
} = {}) {
  const omit = target.omit || [];
  const writes = [];
  for (const file of guideFiles) {
    writes.push({ kind: 'guide', src: path.join(templatesDir, file), dest: path.join(target.guidesDir, file) });
  }
  for (const cmd of [...commandFiles, ...skillFiles]) {
    if (omit.includes(cmd)) continue;
    writes.push({ kind: 'command', src: path.join(templatesDir, cmd), dest: commandPath(target, cmd) });
  }
  for (const asset of assetFiles) {
    writes.push({ kind: 'asset', src: path.join(templatesDir, asset), dest: path.join(target.guidesDir, asset) });
  }
  writes.push({ kind: 'meta', dest: target.metaFile });
  return writes;
}

async function install({ dryRun, assumeYes, project = false, target: targetName = 'claude' }) {
  const target = resolveTarget({ target: targetName, project });

  validateTemplates(GUIDE_FILES, TEMPLATES_DIR);
  validateTemplates(COMMAND_FILES, TEMPLATES_DIR);
  validateTemplates(SKILL_FILES, TEMPLATES_DIR);
  assertTemplatesExist(ASSET_FILES, TEMPLATES_DIR);

  const alreadyInstalled = fs.existsSync(target.guidesDir);

  if (!dryRun && alreadyInstalled) {
    if (assumeYes) {
      console.log(`slashforge is already installed. Updating to v${pkg.version} (--yes).`);
    } else {
      const answer = await prompt(`slashforge is already installed. Update to v${pkg.version}? (y/n): `);
      if (answer.toLowerCase() !== 'y') {
        console.log('Skipped. No changes made.');
        return;
      }
    }
  }

  if (dryRun) {
    const writes = plannedWrites(target, {});

    console.log(`\nDry-run (no files written) — would install v${pkg.version}:\n`);
    console.log(`  mkdir -p ${target.guidesDir}`);
    console.log(`  mkdir -p ${target.commandsDir}`);
    for (const w of writes) {
      const label = w.kind === 'guide' ? 'copy  ' : w.kind === 'command' ? 'render' : w.kind === 'asset' ? 'copy  ' : 'write ';
      const base = w.src ? path.basename(w.src) : path.basename(w.dest);
      console.log(`  ${label} ${base.padEnd(36)} → ${w.dest}`);
    }
    console.log(`\nRerun without --dry-run to install.`);
    return;
  }

  installFiles(target, {});

  console.log(`\n✓ v${pkg.version} installed`);
  console.log(`✓ Guide files: ${target.guidesDir}`);
  for (const cmd of COMMAND_FILES) {
    if (target.omit.includes(cmd)) continue;
    console.log(`✓ Command: ${commandPath(target, cmd)}`);
  }

  reportLegacyLeftovers(target);

  if (target.layout === 'skills') {
    const omitted = COMMAND_FILES.filter((c) => target.omit.includes(c));
    if (omitted.length) {
      console.log(`\n⚠  Not installed on this target: ${omitted.map((c) => '/' + skillDirName(c, target.namePrefix)).join(', ')}`);
      console.log('   setup provisions .claude/agents, hooks and CLAUDE.md, which have no');
      console.log('   equivalent here yet. Run /slashforge:setup from Claude Code instead.');
    }
    // cursor and codex both resolve to this target, so the message names neither
    // exclusively — a codex user should not be told to open Cursor.
    console.log('\nDone! Cursor and Codex both read this directory:');
    console.log('  • /slashforge-code — freeform end-to-end development workflow');
    console.log('  • /slashforge-code -quick — lean mode for small changes');
    console.log('  • /slashforge-investigate [symptom] — read-only research, produces a findings report');
    console.log('  • /slashforge-review-pr [number] — review a PR against this repo\'s rules');
    console.log('\n  In Cursor type /slashforge-code. In Codex the same skills are invoked');
    console.log('  as $slashforge-code — that path is not yet verified.');
    await warnIfOutdated();
    return;
  }

  console.log('\nDone! Open Claude Code in any repo:');
  console.log('  • /slashforge:setup — one-time repo setup');
  console.log('  • /slashforge:code — freeform end-to-end development workflow (full 10-phase, ~100–250k tokens)');
  console.log('  • /slashforge:code -quick — lean mode for small changes (skips brainstorming + agent review, ~40–70k tokens)');
  console.log('  • /slashforge:investigate [symptom] — read-only research, produces a findings report');
  console.log('  • /slashforge:review-pr [number] — review a PR against this repo\'s rules, then comment or approve');

  await warnIfOutdated();
}

// After an upgrade from < 3.0.0 the v2 files are still on disk. We deliberately
// do not delete them during install — that would be removing files the user
// never asked us to touch — so point at them instead and let the user decide.
function reportLegacyLeftovers(target) {
  // The v2 layout only ever existed under .claude/.
  if (target.layout !== 'commands') return;
  const stale = [];
  if (target.legacyGuidesDir && fs.existsSync(target.legacyGuidesDir)) {
    stale.push(target.legacyGuidesDir);
  }
  for (const c of LEGACY_COMMAND_FILES) {
    const p = path.join(target.commandsDir, c);
    if (fs.existsSync(p)) stale.push(p);
  }
  if (stale.length === 0) return;

  console.log('\n⚠  Files from slashforge v2 are still present:');
  for (const p of stale) console.log(`     ${p}`);
  console.log('   They are no longer used. Safe to delete once you have moved to /slashforge:* commands.');
}

async function uninstall({ project, assumeYes, target: targetName = 'claude' }) {
  const target = resolveTarget({ target: targetName, project });
  // Also detect a v2 install so `uninstall` can clean up after an upgrade.
  const installed = fs.existsSync(target.guidesDir) ||
    (target.legacyGuidesDir && fs.existsSync(target.legacyGuidesDir)) ||
    COMMAND_FILES.some((c) => fs.existsSync(commandPath(target, c))) ||
    (target.layout === 'commands' &&
      LEGACY_COMMAND_FILES.some((c) => fs.existsSync(path.join(target.commandsDir, c))));
  if (!installed) {
    console.log('slashforge is not installed at this location. Nothing to remove.');
    return;
  }
  if (!assumeYes) {
    const answer = await prompt(`Remove slashforge guides + commands from ${target.guidesDir} and ${target.commandsDir}? (y/n): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Skipped. No changes made.');
      return;
    }
  }
  const removed = uninstallFiles(target, {});
  console.log('\n✓ Uninstalled slashforge');
  for (const p of removed) console.log(`  removed ${p}`);
}

function printHelp() {
  console.log(`Usage: ${pkg.name} [command] [options]`);
  console.log('');
  console.log('Commands:');
  console.log('  (default)    Install or update the kit');
  console.log('  status       Show installed version and files without changing anything');
  console.log('  uninstall    Remove the kit\'s guides and commands (use --project for ./.claude)');
  console.log('');
  console.log('Options:');
  console.log('  --project    Install into ./.claude/ (or ./.agents/) of the current repo');
  console.log('  --target <n> claude (default) | cursor | codex | agents');
  console.log('  --dry-run    Print planned file writes without touching the filesystem');
  console.log('  --yes, -y    Non-interactive mode — auto-confirm the update prompt');
  console.log('               (also enabled by SLASHFORGE_YES=1 or when stdin is not a TTY)');
  console.log('  --help, -h   Show this help');
}

function parseTargetArg(args) {
  const i = args.indexOf('--target');
  if (i !== -1 && args[i + 1]) return args[i + 1];
  const inline = args.find((a) => a.startsWith('--target='));
  return inline ? inline.slice('--target='.length) : 'claude';
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    closeRl();
    return;
  }

  const project = args.includes('--project');
  const target = parseTargetArg(args);
  // Fail fast on a bad target rather than deep inside an install.
  resolveTargetName(target);

  if (args[0] === 'status') {
    await printStatus({ project, target });
    closeRl();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const assumeYes =
    args.includes('--yes') ||
    args.includes('-y') ||
    process.env.SLASHFORGE_YES === '1' ||
    !process.stdin.isTTY;

  if (args[0] === 'uninstall') {
    await uninstall({ project, assumeYes, target });
    closeRl();
    return;
  }

  try {
    await install({ dryRun, assumeYes, project, target });
  } finally {
    closeRl();
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

if (require.main === module) {
  main().catch((err) => {
    closeRl();
    console.error('Error:', err.message);
    process.exit(1);
  });
}

module.exports = {
  isNewerVersion,
  parseFrontmatter,
  validateTemplates,
  assertTemplatesExist,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  commandName,
  skillDirName,
  toSkillFrontmatter,
  toSkillCommandRefs,
  commandPath,
  parseTargetArg,
  plannedWrites,
  GUIDE_FILES,
  REMOVED_GUIDE_FILES,
  ASSET_FILES,
  SKILL_FILES,
  COMMAND_FILES,
  LEGACY_COMMAND_FILES,
  TARGETS,
  resolveTargetName,
};
