#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');
const readline = require('readline');

const pkg = require('../package.json');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const PLUGINS_CACHE_DIR = path.join(os.homedir(), '.claude', 'plugins', 'cache');

const GUIDE_FILES = [
  'claude-setup-instructions.md',
  'claude-setup-preflight.md',
  'claude-setup-graph.md',
  'claude-setup-graph-summary.md',
  'claude-setup-coverage.md',
  'claude-setup-workflow.md',
  'claude-setup-workflow-investigation.md',
  'claude-setup-workflow-agents.md',
  'claude-setup-rules.md',
  'claude-setup-skills.md',
  'claude-setup-agents.md',
  'claude-setup-commands.md',
  'claude-setup-hooks.md',
  'claude-setup-claude-md.md',
  'claude-setup-memory.md',
];

const COMMAND_FILES = ['setup-claude.md', 'code.md', 'quick.md', 'investigate.md'];

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
    console.log('claude-setup-kit: not installed.');
    console.log(`Run \`npx ${pkg.name}\` to install v${pkg.version}.`);
    return;
  }

  const meta = readMeta(target.metaFile);
  console.log(`\nclaude-setup-kit status`);
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

  const commands = fs.existsSync(target.commandsDir)
    ? fs.readdirSync(target.commandsDir).filter((f) => COMMAND_FILES.includes(f)).sort()
    : [];
  console.log(`  Installed commands:        ${commands.length}`);
  for (const f of commands) console.log(`    • /${f.replace(/\.md$/, '')}`);

  if (!isSuperpowersInstalled()) {
    console.log(`\n⚠  superpowers plugin not detected.`);
    console.log(`   For the best experience, install it: https://github.com/obra/superpowers`);
  }
}

async function install({ dryRun, assumeYes, project = false }) {
  const target = resolveTarget({ project });

  validateTemplates(GUIDE_FILES, TEMPLATES_DIR);
  validateTemplates(COMMAND_FILES, TEMPLATES_DIR);

  const alreadyInstalled = fs.existsSync(target.guidesDir);

  if (!dryRun && alreadyInstalled) {
    if (assumeYes) {
      console.log(`claude-setup-kit is already installed. Updating to v${pkg.version} (--yes).`);
    } else {
      const answer = await prompt(`claude-setup-kit is already installed. Update to v${pkg.version}? (y/n): `);
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

  if (!isSuperpowersInstalled()) {
    console.log('\n⚠  superpowers plugin not detected.');
    console.log('   For the best experience, install it: https://github.com/obra/superpowers');
  }

  console.log('\nDone! Open Claude Code in any repo:');
  console.log('  • /setup-claude — one-time repo setup');
  console.log('  • /code — freeform end-to-end development workflow (full 10-phase, ~100–250k tokens)');
  console.log('  • /quick — lean workflow for small changes (skips brainstorming + agent review, ~40–70k tokens)');
  console.log('  • /investigate [symptom] — read-only research, produces a findings report');
}

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
  console.log('               (also enabled by CLAUDE_SETUP_KIT_YES=1 or when stdin is not a TTY)');
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
    process.env.CLAUDE_SETUP_KIT_YES === '1' ||
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
  renderTemplate,
  resolveTarget,
  installFiles,
  uninstallFiles,
  GUIDE_FILES,
  COMMAND_FILES,
};
