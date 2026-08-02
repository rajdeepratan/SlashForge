#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const pkg = require('../package.json');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const PLUGINS_CACHE_DIR = path.join(os.homedir(), '.claude', 'plugins', 'cache');

const GUIDE_FILES = [
  'forge-instructions.md',
  'forge-preflight.md',
  'forge-graph.md',
  'forge-graph-summary.md',
  'forge-coverage.md',
  'forge-workflow.md',
  'forge-workflow-investigation.md',
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
];

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

function isSuperpowersInstalled() {
  if (!fs.existsSync(PLUGINS_CACHE_DIR)) return false;
  try {
    const marketplaces = fs.readdirSync(PLUGINS_CACHE_DIR, { withFileTypes: true });
    return marketplaces.some(
      (entry) => entry.isDirectory() && fs.existsSync(path.join(PLUGINS_CACHE_DIR, entry.name, 'superpowers')),
    );
  } catch {
    return false;
  }
}

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

// 'forge/setup.md' -> '/slashforge:setup'. A command file's path under the commands
// dir determines how it is invoked; a subdirectory becomes a `:` namespace.
function commandName(file) {
  return '/' + file.replace(/\.md$/, '').split(path.sep).join(':');
}

function resolveTarget({ project = false, homeDir = os.homedir(), cwd = process.cwd() } = {}) {
  if (project) {
    const base = path.join(cwd, '.claude');
    const guidesDir = path.join(base, 'setup', 'slashforge');
    return {
      guidesDir,
      legacyGuidesDir: path.join(base, 'setup', LEGACY_GUIDES_DIRNAME),
      commandsDir: path.join(base, 'commands'),
      metaFile: path.join(guidesDir, 'meta.json'),
      installPath: '.claude/setup/slashforge',
      mode: 'project',
    };
  }
  const guidesDir = path.join(homeDir, '.claude', 'setup', 'slashforge');
  return {
    guidesDir,
    legacyGuidesDir: path.join(homeDir, '.claude', 'setup', LEGACY_GUIDES_DIRNAME),
    commandsDir: path.join(homeDir, '.claude', 'commands'),
    metaFile: path.join(guidesDir, 'meta.json'),
    installPath: guidesDir.split(path.sep).join('/'),
    mode: 'global',
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
  for (const f of [...guideFiles, ...assetFiles]) {
    const dest = path.join(target.guidesDir, f);
    fs.copyFileSync(path.join(templatesDir, f), dest);
    written.push(dest);
  }
  for (const c of [...commandFiles, ...skillFiles]) {
    const rendered = renderTemplate(fs.readFileSync(path.join(templatesDir, c), 'utf8'), {
      installPath: target.installPath,
      version,
      pkgName,
    });
    const dest = path.join(target.commandsDir, c);
    // Command files live in a namespace subdirectory (forge/), which is what
    // produces the /slashforge:name invocation form.
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, rendered);
    written.push(dest);
  }
  const meta = JSON.stringify({
    package: pkgName,
    version,
    installed_at: new Date().toISOString(),
    mode: target.mode,
    commands: commandFiles.map(commandName),
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
// CLI commands
// ---------------------------------------------------------------------------

function printStatus({ project = false } = {}) {
  const target = resolveTarget({ project });
  if (!fs.existsSync(target.guidesDir)) {
    console.log('slashforge: not installed.');
    console.log(`Run \`npx ${pkg.name}\` to install v${pkg.version}.`);
    return;
  }

  const meta = readMeta(target.metaFile);
  console.log(`\nslashforge status`);
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
    .filter((c) => fs.existsSync(path.join(target.commandsDir, c)))
    .sort();
  console.log(`  Installed commands:        ${commands.length}`);
  for (const f of commands) console.log(`    • ${commandName(f)}`);

  // Reported, not warned about. SlashForge ships its own skills, so the plugin's
  // absence costs three optional capabilities and nothing else — a ⚠ would imply
  // something is wrong when nothing is.
  console.log(`  superpowers plugin:        ${isSuperpowersInstalled() ? 'detected' : 'not installed (optional)'}`);
}

async function install({ dryRun, assumeYes, project = false }) {
  const target = resolveTarget({ project });

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
    const plannedWrites = [];
    for (const file of GUIDE_FILES) {
      plannedWrites.push({
        kind: 'guide',
        src: path.join(TEMPLATES_DIR, file),
        dest: path.join(target.guidesDir, file),
      });
    }
    for (const cmd of COMMAND_FILES) {
      plannedWrites.push({
        kind: 'command',
        src: path.join(TEMPLATES_DIR, cmd),
        dest: path.join(target.commandsDir, cmd),
      });
    }
    plannedWrites.push({
      kind: 'meta',
      dest: target.metaFile,
    });

    console.log(`\nDry-run (no files written) — would install v${pkg.version}:\n`);
    console.log(`  mkdir -p ${target.guidesDir}`);
    console.log(`  mkdir -p ${target.commandsDir}`);
    for (const w of plannedWrites) {
      const label = w.kind === 'guide' ? 'copy  ' : w.kind === 'command' ? 'render' : 'write ';
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
    console.log(`✓ Command: ${path.join(target.commandsDir, cmd)}`);
  }

  reportLegacyLeftovers(target);


  console.log('\nDone! Open Claude Code in any repo:');
  console.log('  • /slashforge:setup — one-time repo setup');
  console.log('  • /slashforge:code — freeform end-to-end development workflow (full 10-phase, ~100–250k tokens)');
  console.log('  • /slashforge:code -quick — lean mode for small changes (skips brainstorming + agent review, ~40–70k tokens)');
  console.log('  • /slashforge:investigate [symptom] — read-only research, produces a findings report');
}

// After an upgrade from < 3.0.0 the v2 files are still on disk. We deliberately
// do not delete them during install — that would be removing files the user
// never asked us to touch — so point at them instead and let the user decide.
function reportLegacyLeftovers(target) {
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

async function uninstall({ project, assumeYes }) {
  const target = resolveTarget({ project });
  // Also detect a v2 install so `uninstall` can clean up after an upgrade.
  const installed = fs.existsSync(target.guidesDir) ||
    fs.existsSync(target.legacyGuidesDir) ||
    [...COMMAND_FILES, ...LEGACY_COMMAND_FILES]
      .some((c) => fs.existsSync(path.join(target.commandsDir, c)));
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
  console.log('  --project    Install into ./.claude/ of the current repo (project mode)');
  console.log('  --dry-run    Print planned file writes without touching the filesystem');
  console.log('  --yes, -y    Non-interactive mode — auto-confirm the update prompt');
  console.log('               (also enabled by SLASHFORGE_YES=1 or when stdin is not a TTY)');
  console.log('  --help, -h   Show this help');
}

async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printHelp();
    closeRl();
    return;
  }

  const project = args.includes('--project');

  if (args[0] === 'status') {
    printStatus({ project });
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
    await uninstall({ project, assumeYes });
    closeRl();
    return;
  }

  try {
    await install({ dryRun, assumeYes, project });
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
  parseFrontmatter,
  validateTemplates,
  assertTemplatesExist,
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  commandName,
  GUIDE_FILES,
  ASSET_FILES,
  SKILL_FILES,
  COMMAND_FILES,
  LEGACY_COMMAND_FILES,
};
