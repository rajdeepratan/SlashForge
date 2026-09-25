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
  'forge-agents-codex.md',
  'forge-commands.md',
  'forge-hooks.md',
  'forge-claude-md.md',
  'forge-agents-md.md',
  'forge-memory.md',
];

// Non-markdown files installed verbatim next to the guides. They carry no
// frontmatter, so they are copied but never frontmatter-validated.
const ASSET_FILES = [
  'forge-report-shell.html',
  'forge-open.sh',
  // Shipped as files rather than inline `node -e` scripts so a permission rule can
  // allow each one by its path; a `node -e` rule would allow any script at all.
  'forge-splice.js',
  'forge-review-payload.js',
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
// keep reporting the entry points a user actually types, not every internal
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

// Guide files dropped in a later version. The stale-guide sweep in installFiles now
// removes these automatically — anything matching `forge-*.md` that the current
// target did not write — so nothing reads this list at install time. It is kept as
// the changelog of what was dropped and when, and the upgrade tests assert against
// it to prove the sweep still clears them.
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
  claude: {
    dirname: '.claude', commandsSubdir: 'commands', layout: 'commands',
    namePrefix: '', blocks: ['claude'],
    // The AGENTS.md entry-file guide is for the vendor targets.
    omit: ['forge-agents-md.md', 'forge-agents-codex.md'],
  },
  // The vendor-neutral target: no host is known, so setup has no layout to write.
  agents: {
    dirname: '.agents', commandsSubdir: 'skills', layout: 'skills',
    // 'neutral' is declared only here, so a <!--target:neutral--> block renders on
    // this target alone. 'agents' blocks are inherited by cursor and codex, which
    // makes them useless as a vendor-neutral fallback — a neutral variant fenced as
    // 'agents' would render alongside each vendor's own, duplicating the passage.
    namePrefix: 'slashforge-', blocks: ['agents', 'neutral'],
    // Setup is omitted here, so the entry-file and subagent guides are unreachable.
    omit: [
      path.join('slashforge', 'setup.md'),
      'forge-agents-md.md', 'forge-agents-codex.md', 'forge-claude-md.md',
      // Claude Code's memory system, reachable only from setup.
      'forge-memory.md',
    ],
  },
  // cursor and codex share the agents install location but render their own setup
  // guides: their file formats genuinely differ (.mdc vs nested AGENTS.md for rules,
  // YAML vs TOML for subagents), so one shared path cannot serve both.
  cursor: {
    dirname: '.agents', commandsSubdir: 'skills', layout: 'skills',
    namePrefix: 'slashforge-', blocks: ['agents', 'cursor'],
    // No memory layer on this vendor, and CLAUDE.md is not its entry file.
    omit: ['forge-claude-md.md', 'forge-memory.md', 'forge-agents-codex.md'],
  },
  codex: {
    dirname: '.agents', commandsSubdir: 'skills', layout: 'skills',
    namePrefix: 'slashforge-', blocks: ['agents', 'codex'],
    // Subagents here are TOML, so the markdown guide is replaced, not fenced.
    omit: ['forge-claude-md.md', 'forge-memory.md', 'forge-agents.md'],
  },
  // The one host-neutral skill set in ~/.agents/skills, read by Cursor and Codex.
  // Rendered, never installed on its own; its host-specific parts are in the
  // per-host guides, reached through the <host> path in SKILL_PREAMBLE.
  skills: {
    dirname: '.agents', commandsSubdir: 'skills', layout: 'skills',
    namePrefix: 'slashforge-', blocks: ['agents', 'neutral'], omit: [],
  },
};

// cursor and codex are real targets, not aliases. They share the `agents` install
// location — one install serves both — but render their own setup guides, because
// their layouts genuinely differ: `.cursor/rules/*.mdc` vs nested `AGENTS.md` for
// rules, markdown+YAML vs TOML for subagents. `agents` remains as the
// vendor-neutral target for callers that do not know which host will run.
const TARGET_ALIASES = {};

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
  // Trimmed like the opening fence, so a trailing space does not hide it.
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) {
    throw new Error(`${label}: missing closing '---' frontmatter fence`);
  }
  // Not a YAML parser, but it accepts the multi-line values Claude Code does: an
  // indented line continues the key above it, folded (`>`) with spaces and literal
  // (`|`) with newlines. Refusing a file the runtime reads is a check that fails
  // the author for nothing.
  const fm = {};
  let key = null;
  let joiner = ' ';
  for (let i = 1; i < end; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    if (/^\s/.test(line) && key) {
      fm[key] = fm[key] ? fm[key] + joiner + line.trim() : line.trim();
      continue;
    }
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/);
    if (!match) {
      throw new Error(`${label}: invalid frontmatter at line ${i + 1}: "${line}"`);
    }
    key = match[1].trim();
    const value = match[2].trim();
    const block = value.match(/^([>|])[+-]?$/);
    joiner = block && block[1] === '|' ? '\n' : ' ';
    fm[key] = block ? '' : value;
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
      const blockErrors = findTargetBlockErrors(content, file);
      for (const err of blockErrors) errors.push(err);
      // Frontmatter is YAML, so a fenced `description:` is only valid once the
      // non-matching block is gone. What has to parse is each target's rendered
      // frontmatter, not the raw source. Skipped when the markers themselves are
      // malformed, since stripping would then be meaningless.
      if (blockErrors.length === 0) {
        // Render for each real install target, not for every valid block name.
        // 'neutral' is a block name only — nothing installs as 'neutral', and
        // rendering for it would strip every target's frontmatter at once.
        for (const name of Object.keys(TARGETS)) {
          parseFrontmatter(stripTargetBlocks(content, name), file);
        }
      }
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

function renderTemplate(content, { installPath, version, pkgName, targetName }) {
  const substituted = content
    .replace(/\{\{INSTALL_PATH\}\}/g, installPath)
    .replace(/\{\{KIT_VERSION\}\}/g, version)
    .replace(/\{\{KIT_PACKAGE\}\}/g, pkgName);
  // Stripped last, so a marker can never be introduced by a substitution.
  return stripTargetBlocks(substituted, targetName);
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

// The sigil a host invokes a skill with. Cursor uses `/` like Claude Code; Codex
// uses `$`. Getting this wrong ships prose naming a form the host rejects.
const TARGET_SIGILS = { claude: '/', agents: '/', cursor: '/', codex: '$', skills: '/' };

// The skills layout has no `:` namespace, so in-body references to sibling commands
// must use the hyphenated form — otherwise every cross-reference in the workflow names
// a command that does not exist on this target. The leading sigil is per host, and
// must match what `commandForm` in docs/src/targets.mjs advertises.
function toSkillCommandRefs(content, prefix, targetName = 'agents') {
  const sigil = TARGET_SIGILS[targetName] || '/';
  return content.replace(/\/slashforge:([a-z][a-z-]*)/g, `${sigil}${prefix}$1`);
}

// Passages that differ between install targets are fenced in the templates:
//   <!--target:claude--> ... <!--/target-->
// Everything unfenced is shared. One source per file is what stops the two
// variants drifting; the alternative was a near-duplicate of every guide, and
// prose duplicated across files does not stay in sync.
//
// The `m` flag anchors both fences to their own lines, so a marker quoted
// inside a fenced code sample in the docs is not mistaken for a real fence.
const TARGET_BLOCK_RE =
  /^[ \t]*<!--target:([a-z-]+)-->[ \t]*\n([\s\S]*?)^[ \t]*<!--\/target-->[ \t]*\n?/gm;

// A target renders its own blocks plus any it inherits. Without inheritance,
// rendering for 'cursor' would drop every <!--target:agents--> block in the workflow
// guides and silently gut those files — prose a model then follows.
function blockNamesFor(targetName) {
  const spec = TARGETS[targetName];
  return spec ? spec.blocks : [targetName];
}

function stripTargetBlocks(content, targetName) {
  const keep = blockNamesFor(targetName);
  return content.replace(TARGET_BLOCK_RE, (_match, name, body) =>
    (keep.includes(name) ? body : '')
  );
}

// Every block name any target accepts, derived from TARGETS so adding a target
// cannot introduce a marker the validator then rejects. A vendor marker is valid
// because the vendor is a real target: it renders for that vendor and is stripped
// everywhere else, rather than matching nothing and vanishing from every target.
const VALID_TARGET_NAMES = [
  ...new Set(Object.values(TARGETS).flatMap((t) => t.blocks)),
];
const TARGET_TOKEN_RE = /<!--target:([a-z-]+)-->|<!--\/target-->/g;

// A guide that loses half a sentence is worse than a failed install, because
// the damage is prose a model then follows. So malformed markers stop the
// install rather than being stripped on a best-effort basis.
function findTargetBlockErrors(content, file) {
  const errors = [];
  let open = null;
  let match;
  TARGET_TOKEN_RE.lastIndex = 0;
  while ((match = TARGET_TOKEN_RE.exec(content)) !== null) {
    const name = match[1];
    const line = content.slice(0, match.index).split('\n').length;
    if (name === undefined) {
      if (open === null) errors.push(`${file}:${line}: <!--/target--> with no open block`);
      else open = null;
      continue;
    }
    if (open !== null) {
      errors.push(`${file}:${line}: nested target block (inside '${open}')`);
      continue;
    }
    if (!VALID_TARGET_NAMES.includes(name)) {
      errors.push(
        `${file}:${line}: unknown target '${name}' — use ${VALID_TARGET_NAMES.join(' or ')}`
      );
    }
    open = name;
  }
  if (open !== null) errors.push(`${file}: unclosed target block '${open}'`);
  return errors;
}

// 'slashforge/setup.md' -> '/slashforge:setup'. A command file's path under the commands
// dir determines how it is invoked; a subdirectory becomes a `:` namespace. The
// skills layout has no namespace, so the prefix lives in the directory name instead.
function commandName(file, target = null) {
  if (target && target.layout === 'skills') {
    // Per-host sigil: Codex invokes skills with `$`. meta.json feeds the `status`
    // output and the install banner, so a `/` here misreports what the user types.
    return (TARGET_SIGILS[target.target] || '/') + skillDirName(file, target.namePrefix);
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
  const omit = target.omit || [];
  // Guides are rendered like commands: a guide may name a sibling by absolute
  // path (forge-workflow-review-pr.md points at forge-report-shell.html), and a
  // copied-not-rendered guide would ship the literal {{INSTALL_PATH}}.
  for (const f of guideFiles) {
    // A target may not receive every guide. The entry-file and subagent guides are
    // vendor-specific splits rather than shared prose — a Codex install has no use
    // for the CLAUDE.md guide, and shipping it would have the agent read a layout
    // it cannot write.
    if (omit.includes(f)) continue;
    const dest = path.join(target.guidesDir, f);
    let rendered = renderTemplate(fs.readFileSync(path.join(templatesDir, f), 'utf8'), {
      installPath: target.installPath,
      version,
      pkgName,
      targetName: target.target,
    });
    if (target.layout === 'skills') {
      rendered = toSkillCommandRefs(rendered, target.namePrefix, target.target);
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
  for (const c of [...commandFiles, ...skillFiles]) {
    // A target may not support every command; the vendor-neutral `agents` target
    // omits setup because no host is known, so there is no layout to scaffold.
    if (omit.includes(c)) continue;
    let rendered = renderTemplate(fs.readFileSync(path.join(templatesDir, c), 'utf8'), {
      installPath: target.installPath,
      version,
      pkgName,
      targetName: target.target,
    });
    let dest;
    if (target.layout === 'skills') {
      const name = skillDirName(c, target.namePrefix);
      rendered = toSkillCommandRefs(rendered, target.namePrefix, target.target);
      rendered = toSkillFrontmatter(rendered, name);
      dest = path.join(target.commandsDir, name, 'SKILL.md');
    } else {
      // Command files live in a namespace subdirectory (slashforge/), which is what
      // produces the /slashforge:name invocation form.
      dest = path.join(target.commandsDir, c);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, rendered);
    written.push(dest);
  }
  // Any kit guide this install did not just write is stale: one dropped in a later
  // version, or one belonging to another target — a 4.4.3 cursor install received
  // every guide, including the Claude-only ones. Leaving them means the agent reads
  // a guide describing a layout it cannot write, which is worse than a missing file
  // because it is prose the model then follows.
  //
  // Scoped to the `forge-*.md` names this installer owns, so meta.json, the assets
  // (forge-open.sh, forge-report-shell.html) and anything else sharing the directory
  // are out of reach. This subsumes REMOVED_GUIDE_FILES.
  const writtenGuides = new Set(
    written.filter((w) => path.dirname(w) === target.guidesDir).map((w) => path.basename(w))
  );
  for (const entry of fs.readdirSync(target.guidesDir)) {
    if (!/^forge-[a-z0-9-]*\.md$/.test(entry)) continue;
    if (writtenGuides.has(entry)) continue;
    fs.rmSync(path.join(target.guidesDir, entry));
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

// Hosts that read the shared .agents/ location. Each gets its own guide folder,
// because their setup layouts differ; they share one skill set.
const AGENT_HOSTS = ['cursor', 'codex'];

// The one runtime decision: which host folder to read. Rendered into every skill.
const SKILL_PREAMBLE = [
  'You are running in Cursor or in Codex. In every path below, replace <host> with',
  'cursor or codex to match. Commands are written /slashforge-name; in Codex invoke',
  'them as $slashforge-name. If you cannot tell which host you are in: a .codex/',
  'folder in the repo means Codex and a .cursor/ folder means Cursor; if neither',
  'or both, ask the user once and use that answer for the rest of the session.',
].join('\n');

const SETUP_COMMAND = path.join('slashforge', 'setup.md');
// Stands in for setup.md in .agents/skills: setup's procedure is host-specific, so
// the skill only dispatches to forge-setup-flow.md in the host's own guide folder.
const SETUP_DISPATCH = path.join('agents', 'setup.md');
// setup.md rendered for one host, installed as a guide. Generated, so the setup
// procedure keeps a single source.
const SETUP_FLOW = 'forge-setup-flow.md';

function resolveAgents({ project = false, homeDir = os.homedir(), cwd = process.cwd() } = {}) {
  const base = path.join(project ? cwd : homeDir, '.agents');
  const root = path.join(base, 'setup', 'slashforge');
  // Always '/', even for a Windows home: these paths are read by a model, and a
  // backslash before <host> would read as an escape rather than a separator.
  const rootPath = project ? '.agents/setup/slashforge' : root.replace(/\\/g, '/');
  return {
    base,
    root,
    skillsDir: path.join(base, 'skills'),
    metaFile: path.join(root, 'meta.json'),
    mode: project ? 'project' : 'global',
    skillInstallPath: `${rootPath}/<host>`,
    hosts: AGENT_HOSTS.map((host) => ({
      host,
      guidesDir: path.join(root, host),
      installPath: `${rootPath}/${host}`,
      omit: TARGETS[host].omit,
    })),
  };
}

function skillFilePath(agents, file) {
  return path.join(agents.skillsDir, skillDirName(file, 'slashforge-'), 'SKILL.md');
}

function withPreamble(content) {
  const lines = content.split('\n');
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  lines.splice(end + 1, 0, '', SKILL_PREAMBLE);
  return lines.join('\n');
}

// src is the template read; dest names the skill (setup.md's dispatcher is read
// from SETUP_DISPATCH but installed as slashforge-setup).
function renderSkill(src, dest, agents, { templatesDir = TEMPLATES_DIR, version = pkg.version, pkgName = pkg.name } = {}) {
  let out = renderTemplate(fs.readFileSync(path.join(templatesDir, src), 'utf8'), {
    installPath: agents.skillInstallPath, version, pkgName, targetName: 'skills',
  });
  out = toSkillCommandRefs(out, 'slashforge-', 'skills');
  out = toSkillFrontmatter(out, skillDirName(dest, 'slashforge-'));
  return withPreamble(out);
}

function renderHostGuide(src, host, { templatesDir = TEMPLATES_DIR, version = pkg.version, pkgName = pkg.name } = {}) {
  const out = renderTemplate(fs.readFileSync(path.join(templatesDir, src), 'utf8'), {
    installPath: host.installPath, version, pkgName, targetName: host.host,
  });
  return toSkillCommandRefs(out, 'slashforge-', host.host);
}

function plannedAgentsWrites(agents, {
  templatesDir = TEMPLATES_DIR,
  guideFiles = GUIDE_FILES,
  commandFiles = COMMAND_FILES,
  assetFiles = ASSET_FILES,
  skillFiles = SKILL_FILES,
} = {}) {
  const writes = [];
  for (const h of agents.hosts) {
    for (const f of guideFiles) {
      if (h.omit.includes(f)) continue;
      writes.push({ kind: 'guide', src: path.join(templatesDir, f), dest: path.join(h.guidesDir, f) });
    }
    writes.push({ kind: 'guide', src: path.join(templatesDir, SETUP_COMMAND), dest: path.join(h.guidesDir, SETUP_FLOW) });
    for (const a of assetFiles) {
      writes.push({ kind: 'asset', src: path.join(templatesDir, a), dest: path.join(h.guidesDir, a) });
    }
    writes.push({ kind: 'meta', dest: path.join(h.guidesDir, 'meta.json') });
  }
  for (const c of [...commandFiles, ...skillFiles]) {
    const src = c === SETUP_COMMAND ? SETUP_DISPATCH : c;
    writes.push({ kind: 'command', src: path.join(templatesDir, src), dest: skillFilePath(agents, c) });
  }
  writes.push({ kind: 'meta', dest: agents.metaFile });
  return writes;
}

function installAgentsFiles(agents, {
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
  validateTemplates(skillFiles, templatesDir);
  validateTemplates([SETUP_DISPATCH], templatesDir);
  assertTemplatesExist(assetFiles, templatesDir);
  const opts = { templatesDir, version, pkgName };
  const written = [];
  const write = (dest, content) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
    written.push(dest);
  };
  fs.mkdirSync(agents.root, { recursive: true });
  // An earlier per-target build installed guides straight into the root. They are
  // kit files the new layout never reads; the user's own files stay.
  for (const entry of fs.readdirSync(agents.root)) {
    const p = path.join(agents.root, entry);
    if (entry !== 'meta.json' && fs.statSync(p).isFile() && isKitGuideFile(entry, guideFiles)) fs.rmSync(p);
  }
  for (const h of agents.hosts) {
    for (const f of guideFiles) {
      if (h.omit.includes(f)) continue;
      write(path.join(h.guidesDir, f), renderHostGuide(f, h, opts));
    }
    write(path.join(h.guidesDir, SETUP_FLOW), renderHostGuide(SETUP_COMMAND, h, opts));
    for (const a of assetFiles) {
      fs.mkdirSync(h.guidesDir, { recursive: true });
      fs.copyFileSync(path.join(templatesDir, a), path.join(h.guidesDir, a));
      written.push(path.join(h.guidesDir, a));
    }
    // A guide dropped in a later version, or omitted for this host, is stale prose.
    // (Runs before this host's meta.json is written; meta never matches forge-*.md.)
    const keep = new Set(written.filter((w) => path.dirname(w) === h.guidesDir).map((w) => path.basename(w)));
    for (const entry of fs.readdirSync(h.guidesDir)) {
      if (/^forge-[a-z0-9-]*\.md$/.test(entry) && !keep.has(entry)) fs.rmSync(path.join(h.guidesDir, entry));
    }
  }
  for (const c of [...commandFiles, ...skillFiles]) {
    const src = c === SETUP_COMMAND ? SETUP_DISPATCH : c;
    write(skillFilePath(agents, c), renderSkill(src, c, agents, opts));
  }
  const meta = JSON.stringify({
    package: pkgName,
    version,
    installed_at: new Date().toISOString(),
    mode: agents.mode,
    hosts: AGENT_HOSTS,
    commands: commandFiles.map((c) => '/' + skillDirName(c, 'slashforge-')),
  }, null, 2) + '\n';
  // One at the root for status and uninstall, and one in each host folder, where
  // setup's guides read it ("meta.json … same folder as this file").
  for (const h of agents.hosts) write(path.join(h.guidesDir, 'meta.json'), meta);
  write(agents.metaFile, meta);
  return written;
}

// Removes the kit's own files from dir, and dir itself only once nothing else is
// left. Returns what it removed: the dir if it went, else each file.
function removeKitFiles(dir, guideFiles = GUIDE_FILES) {
  if (!fs.existsSync(dir)) return [];
  const kit = fs.readdirSync(dir).filter((n) => isKitGuideFile(n, guideFiles));
  for (const n of kit) fs.rmSync(path.join(dir, n), { force: true });
  if (fs.readdirSync(dir).length === 0) { fs.rmdirSync(dir); return [dir]; }
  return kit.map((n) => path.join(dir, n));
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
  removed.push(...removeKitFiles(target.guidesDir, guideFiles));
  // The v2 guides dir predates the kit's file naming, so it is still removed whole.
  if (target.legacyGuidesDir && fs.existsSync(target.legacyGuidesDir)) {
    fs.rmSync(target.legacyGuidesDir, { recursive: true, force: true });
    removed.push(target.legacyGuidesDir);
  }
  return removed;
}

function uninstallAgentsFiles(agents, { guideFiles = GUIDE_FILES, commandFiles = COMMAND_FILES, skillFiles = SKILL_FILES } = {}) {
  const removed = [];
  // .agents/skills is shared with other tools: only the kit's own dirs go.
  for (const c of [...commandFiles, ...skillFiles]) {
    const dir = path.dirname(skillFilePath(agents, c));
    if (fs.existsSync(dir)) { fs.rmSync(dir, { recursive: true, force: true }); removed.push(dir); }
  }
  if (fs.existsSync(agents.skillsDir) && fs.readdirSync(agents.skillsDir).length === 0) {
    fs.rmdirSync(agents.skillsDir);
    removed.push(agents.skillsDir);
  }
  for (const h of agents.hosts) removed.push(...removeKitFiles(h.guidesDir, [...guideFiles, SETUP_FLOW]));
  removed.push(...removeKitFiles(agents.root, guideFiles));
  return removed;
}

// A file in the guides dir that belongs to the kit: this version's guides and
// assets, meta.json, or any `forge-*.md` — the kit's own prefix, so a guide an
// older version shipped, or one belonging to another target, is recognised as
// well. Anything else is the user's.
function isKitGuideFile(name, guideFiles = GUIDE_FILES) {
  return name === 'meta.json' ||
    guideFiles.includes(name) ||
    ASSET_FILES.includes(name) ||
    /^forge-[a-z0-9-]*\.md$/.test(name);
}

// Installed means kit files are present, not merely that the dir exists: uninstall
// keeps the dir when the user has files in it, and those alone are not an install.
function hasKitFiles(dir) {
  return fs.existsSync(dir) && fs.readdirSync(dir).some((n) => isKitGuideFile(n));
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

// Claude Code resolves a command found both in ~/.claude and in the repo to the
// personal one ("personal over project"), so a committed project install is
// silently shadowed for anyone who also installed globally. Only the claude target
// has a documented precedence; the skills hosts are not assumed to share it.
function warnIfShadowed(claude, agents) {
  if (claude.mode !== 'project') return;
  const globalClaude = resolveTarget();
  if (globalClaude.guidesDir !== claude.guidesDir && hasKitFiles(globalClaude.guidesDir)) {
    const meta = readMeta(globalClaude.metaFile);
    const version = meta ? `v${meta.version}` : 'an unknown version';
    console.log(`\n⚠  A global install (${version}) is in ${path.dirname(path.dirname(globalClaude.guidesDir))}.`);
    console.log('   Claude Code prefers personal commands, so the global install runs instead of');
    console.log(`   this project copy. \`npx ${pkg.name} uninstall --yes\` removes the global one.`);
  }
  const globalAgents = resolveAgents();
  if (agents && globalAgents.root !== agents.root && hasKitFiles(globalAgents.root)) {
    console.log(`\n⚠  SlashForge is also installed in ${globalAgents.base}.`);
    console.log('   Cursor and Codex may list both copies of each command. Pick one install mode per team.');
  }
}

async function printStatus({ project = false } = {}) {
  const claude = resolveTarget({ project });
  const agents = resolveAgents({ project });
  if (!hasKitFiles(claude.guidesDir) && !hasKitFiles(agents.root)) {
    console.log('slashforge: not installed.');
    console.log(`Run \`npx ${pkg.name}\` to install v${pkg.version}.`);
    await warnIfOutdated();
    return;
  }
  const versionLine = (meta) => {
    if (!meta) return 'unknown (legacy install — no meta.json)';
    return `v${meta.version}${meta.version !== pkg.version ? '  ← update available' : ''}`;
  };
  console.log('\nslashforge status');
  console.log(`  Package version (current): v${pkg.version}`);

  if (hasKitFiles(claude.guidesDir)) {
    const guides = fs.readdirSync(claude.guidesDir).filter((f) => f.endsWith('.md') && isKitGuideFile(f)).sort();
    const commands = COMMAND_FILES.filter((c) => fs.existsSync(commandPath(claude, c))).sort();
    console.log(`\n  Claude Code (${path.dirname(path.dirname(claude.guidesDir))})`);
    console.log(`    Installed version:  ${versionLine(readMeta(claude.metaFile))}`);
    console.log(`    Guide files:        ${guides.length} (${claude.guidesDir})`);
    console.log(`    Installed commands: ${commands.length}`);
    for (const c of commands) console.log(`      • ${commandName(c)}`);
  } else {
    console.log(`\n  Claude Code:     not installed — run \`npx ${pkg.name}\` to add it.`);
  }

  if (hasKitFiles(agents.root)) {
    console.log(`\n  Cursor + Codex (${agents.base})`);
    console.log(`    Installed version:  ${versionLine(readMeta(agents.metaFile))}`);
    for (const h of agents.hosts) {
      const n = fs.existsSync(h.guidesDir) ? fs.readdirSync(h.guidesDir).filter((f) => f.endsWith('.md')).length : 0;
      console.log(`    Guide files (${h.host}): ${n} (${h.guidesDir})`);
    }
    const skills = COMMAND_FILES.filter((c) => fs.existsSync(skillFilePath(agents, c))).sort();
    console.log(`    Installed commands: ${skills.length}`);
    for (const c of skills) {
      const name = skillDirName(c, 'slashforge-');
      console.log(`      • /${name} (Cursor), $${name} (Codex)`);
    }
  } else {
    console.log(`\n  Cursor + Codex:  not installed — run \`npx ${pkg.name}\` to add it.`);
  }

  warnIfShadowed(claude, agents);
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
    // Must match installFiles, or the dry-run listing promises a guide the install
    // then skips — and the atomicity preflight checks a file that never arrives.
    if (omit.includes(file)) continue;
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



const TARGET_REMOVED = '--target is no longer needed: one install sets up Claude Code, Cursor and Codex.';

async function install({ dryRun, assumeYes, project = false }) {
  const claude = resolveTarget({ project });
  const agents = resolveAgents({ project });

  validateTemplates(GUIDE_FILES, TEMPLATES_DIR);
  validateTemplates(COMMAND_FILES, TEMPLATES_DIR);
  validateTemplates(SKILL_FILES, TEMPLATES_DIR);
  validateTemplates([SETUP_DISPATCH], TEMPLATES_DIR);
  assertTemplatesExist(ASSET_FILES, TEMPLATES_DIR);

  const alreadyInstalled = hasKitFiles(claude.guidesDir) || hasKitFiles(agents.root);
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
    console.log(`\nDry-run (no files written) — would install v${pkg.version}:\n`);
    for (const w of [...plannedWrites(claude, {}), ...plannedAgentsWrites(agents)]) {
      const label = w.kind === 'asset' ? 'copy  ' : w.kind === 'meta' ? 'write ' : 'render';
      const base = w.src ? path.basename(w.src) : path.basename(w.dest);
      console.log(`  ${label} ${base.padEnd(36)} → ${w.dest}`);
    }
    console.log(`\nRerun without --dry-run to install.`);
    return;
  }

  // Each location is installed on its own, so one failing (a read-only ~/.agents,
  // say) is reported without undoing the other. A re-run is safe.
  const failures = [];
  for (const [label, run] of [
    ['Claude Code', () => installFiles(claude, {})],
    ['Cursor + Codex', () => installAgentsFiles(agents, {})],
  ]) {
    try { run(); } catch (err) { failures.push(`${label}: ${err.message}`); }
  }
  if (failures.length) {
    for (const f of failures) console.error(`✗ ${f}`);
    process.exitCode = 1;
  }

  console.log(`\n✓ v${pkg.version} installed`);
  console.log(`✓ Claude Code:     ${path.join(claude.commandsDir, 'slashforge')}  (guides: ${claude.guidesDir})`);
  console.log(`✓ Cursor + Codex:  ${agents.skillsDir}  (guides: ${path.join(agents.root, '{cursor,codex}')})`);

  reportLegacyLeftovers(claude);

  console.log('\nDone! Open Claude Code in any repo:');
  console.log('  • /slashforge:setup — one-time repo setup');
  console.log('  • /slashforge:code — freeform end-to-end development workflow (full 10-phase, ~100–250k tokens)');
  console.log('  • /slashforge:code -quick — lean mode for small changes (skips brainstorming + agent review, ~40–70k tokens)');
  console.log('  • /slashforge:investigate [symptom] — read-only research, produces a findings report');
  console.log('  • /slashforge:review-pr [number] — review a PR against this repo\'s rules, then comment or approve');
  console.log('\nIn Cursor the same commands are /slashforge-setup, /slashforge-code, …');
  console.log('In Codex they are $slashforge-setup, $slashforge-code, …');

  warnIfShadowed(claude, agents);
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

async function uninstall({ project, assumeYes, interactive = true }) {
  const claude = resolveTarget({ project });
  const agents = resolveAgents({ project });
  const installed = hasKitFiles(claude.guidesDir) ||
    fs.existsSync(claude.legacyGuidesDir) ||
    COMMAND_FILES.some((c) => fs.existsSync(commandPath(claude, c))) ||
    LEGACY_COMMAND_FILES.some((c) => fs.existsSync(path.join(claude.commandsDir, c))) ||
    hasKitFiles(agents.root) ||
    COMMAND_FILES.some((c) => fs.existsSync(skillFilePath(agents, c)));
  if (!installed) {
    console.log('slashforge is not installed at this location. Nothing to remove.');
    return;
  }
  if (!assumeYes && !interactive) {
    console.error('Refusing to uninstall without a terminal to confirm on. Re-run with --yes to remove the kit.');
    process.exitCode = 1;
    return;
  }
  if (!assumeYes) {
    const answer = await prompt(`Remove slashforge from ${path.dirname(path.dirname(claude.guidesDir))} and ${agents.base}? (y/n): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Skipped. No changes made.');
      return;
    }
  }
  const removed = [...uninstallFiles(claude, {}), ...uninstallAgentsFiles(agents, {})];
  console.log('\n✓ Uninstalled slashforge');
  for (const p of removed) console.log(`  removed ${p}`);
  for (const dir of [claude.guidesDir, agents.root, ...agents.hosts.map((h) => h.guidesDir)]) {
    if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      const left = fs.readdirSync(dir).sort().join(', ');
      if (left) console.log(`  kept    ${dir} — it holds files slashforge did not install: ${left}`);
    }
  }
}

function printHelp() {
  console.log(`Usage: ${pkg.name} [command] [options]`);
  console.log('');
  console.log('Commands:');
  console.log('  (default)    Install or update the kit');
  console.log('  status       Show installed version and files without changing anything');
  console.log('  uninstall    Remove the kit (use --project for the repo copy)');
  console.log('');
  console.log('Options:');
  console.log('  --project    Install into ./.claude/ and ./.agents/ of the current repo');
  console.log('  --dry-run    Print planned file writes without touching the filesystem');
  console.log('  --yes, -y    Non-interactive mode — auto-confirm the prompts');
  console.log('               (SLASHFORGE_YES=1 does the same; without a TTY the update prompt');
  console.log('               is confirmed on its own, but uninstall still needs --yes)');
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

  if (args.some((a) => a === '--target' || a.startsWith('--target='))) {
    console.error(TARGET_REMOVED);
    process.exitCode = 1;
    closeRl();
    return;
  }

  const project = args.includes('--project');

  if (args[0] === 'status') {
    await printStatus({ project });
    closeRl();
    return;
  }

  const dryRun = args.includes('--dry-run');
  const explicitYes =
    args.includes('--yes') ||
    args.includes('-y') ||
    process.env.SLASHFORGE_YES === '1';
  const interactive = Boolean(process.stdin.isTTY);
  // Updating in CI with no terminal is the common case, so it needs no flag.
  const assumeYes = explicitYes || !interactive;

  if (args[0] === 'uninstall') {
    // Removing the kit is not the update prompt: it takes an explicit yes rather
    // than one inferred from a missing TTY.
    await uninstall({ project, assumeYes: explicitYes, interactive });
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
  TARGET_SIGILS,
  stripTargetBlocks,
  blockNamesFor,
  findTargetBlockErrors,
  commandPath,
  parseTargetArg,
  plannedWrites,
  AGENT_HOSTS,
  SKILL_PREAMBLE,
  SETUP_DISPATCH,
  SETUP_FLOW,
  resolveAgents,
  renderSkill,
  installAgentsFiles,
  plannedAgentsWrites,
  GUIDE_FILES,
  REMOVED_GUIDE_FILES,
  ASSET_FILES,
  SKILL_FILES,
  COMMAND_FILES,
  LEGACY_COMMAND_FILES,
  TARGETS,
  resolveTargetName,
};
