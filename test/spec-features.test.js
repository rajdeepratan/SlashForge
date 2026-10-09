// Tests for the architecture-updates spec: the /slashforge-fix investigate→code
// loop (P1), the Phase 6 localized retry loop (P2), the dual-track security audit
// (P3), the Phase 8 documentation sweep (P4), and resume/checkpointing + the Node
// bump (P5). These assert the installed contracts the workflow templates carry,
// the same way install.test.js asserts the review-pr and investigate contracts.

const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const {
  resolveTarget,
  installFiles,
  commandPath,
  COMMAND_FILES,
  GUIDE_FILES,
  ASSET_FILES,
} = require('../bin/install.js');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const read = (rel) => fs.readFileSync(path.join(TEMPLATES_DIR, rel), 'utf8');

function tmp() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sf-spec-'));
}

// A command plus every workflow file it loads, read as one instruction — a
// guarantee it makes may live in the dispatcher or in any companion it reads.
const COMMAND_WORKFLOWS = {
  'fix.md': ['slashforge-workflow.md', 'slashforge-workflow-fix.md', 'slashforge-workflow-verify.md'],
  'investigate.md': ['slashforge-workflow-investigation.md'],
  'review-pr.md': ['slashforge-workflow-review-pr.md', 'slashforge-workflow-security.md'],
  'resume.md': ['slashforge-workflow-resume.md', 'slashforge-workflow.md'],
  'test.md': ['slashforge-workflow-test.md'],
  'refactor.md': ['slashforge-workflow.md', 'slashforge-workflow-refactor.md', 'slashforge-workflow-test.md'],
};

function instruction(cmd) {
  const parts = [path.join('slashforge', cmd), ...(COMMAND_WORKFLOWS[cmd] || [])];
  return parts.map(read).join('\n');
}

// ---------------------------------------------------------------------------
// Priority 1 — /slashforge-fix and the investigation contract
// ---------------------------------------------------------------------------

test('P1: /slashforge-fix ships as a command and installs', () => {
  assert.ok(
    COMMAND_FILES.some((c) => c.endsWith(`${path.sep}fix.md`)),
    'fix.md must be a shipped command',
  );
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const dest = commandPath(target, path.join('slashforge', 'fix.md'));
  assert.ok(fs.existsSync(dest), 'fix command must install');
  const body = fs.readFileSync(dest, 'utf8');
  assert.match(body, /^name: \/slashforge-fix$/m, 'fix.md frontmatter names the command');
  assert.ok(!body.includes('{{INSTALL_PATH}}'), 'fix.md must be rendered');
});

test('P1: the investigation writes the structured contract with every schema key', () => {
  const body = instruction('investigate.md');
  assert.ok(body.includes('.slashforge/latest_investigation.json'), 'must name the artifact path');
  for (const key of ['run_id', 'reproduction_steps', 'root_cause', 'implicated_files', 'suggested_approach']) {
    assert.ok(body.includes(key), `contract must document the "${key}" field`);
  }
  // implicated_files carries filepath + line_numbers per the schema.
  assert.ok(body.includes('filepath') && body.includes('line_numbers'),
    'implicated_files must document filepath and line_numbers');
});

test('P1: /slashforge-fix mutates the early phases per the spec', () => {
  const body = instruction('fix.md');
  // Phase 0 ingestion + the --issue flag.
  assert.ok(body.includes('.slashforge/latest_investigation.json'), 'reads the investigation contract');
  assert.ok(/--issue/.test(body), 'documents the --issue flag for future ingestion');
  // Phase 1 skipped, context locked to implicated_files.
  assert.ok(/Phase 1[^\n]*SKIPPED|SKIPPED[^\n]*Phase 1|Setup\s*\/\s*Discovery[^\n]*SKIPPED/i.test(body),
    'Phase 1 / Setup-Discovery must be skipped');
  assert.ok(/implicated_files/.test(body) && /lock/i.test(body),
    'context must be locked to the implicated files');
  // Phase 2 TDD: regression test before the patch.
  assert.ok(/Test-Driven Development|TDD/i.test(body), 'Phase 2 must enforce TDD');
  assert.ok(/regression test/i.test(body), 'must require a regression test');
  // Phase 6 hard test-diff check.
  assert.ok(/FIX FAILED: no regression test/i.test(body),
    'Phase 6 must hard-fail when no test file was added or modified');
});

// ---------------------------------------------------------------------------
// Priority 2 — Phase 6 localized retry loop
// ---------------------------------------------------------------------------

test('P2: Phase 6 is a localized retry state machine, not a straight bounce to replanning', () => {
  const body = read('slashforge-workflow.md') + '\n' + read('slashforge-workflow-verify.md');
  assert.ok(/max_retries\s*=\s*3/.test(body), 'initialises max_retries = 3');
  assert.ok(/current_attempt/.test(body), 'tracks current_attempt');
  assert.ok(/baseline_commit/.test(body), 'records baseline_commit before Phase 5/6');
  assert.ok(/Localized Patch Generation/i.test(body), 'has a localized patch step');
  // The localized patch is constrained — plan read-only, only implicated files.
  assert.ok(/only edit the files implicated/i.test(body), 'constrains the patch to implicated files');
  assert.ok(/Do not alter the Phase 2 Plan/i.test(body), 'the plan stays read-only in the loop');
});

test('P2: the human-intervention gate prints the exact string and offers proceed/abort', () => {
  const body = read('slashforge-workflow.md') + '\n' + read('slashforge-workflow-verify.md');
  assert.ok(body.includes('VERIFY FAILED: 3 consecutive test/build failures.'),
    'must print the exact escalation line');
  assert.ok(/`proceed`/.test(body), 'offers proceed');
  assert.ok(/`abort`/.test(body), 'offers abort');
  assert.ok(/git reset --hard <baseline_commit>/.test(body),
    'abort rolls back to baseline_commit with a hard reset');
});

// ---------------------------------------------------------------------------
// Priority 3 — dual-track security audit + gate
// ---------------------------------------------------------------------------

test('P3: the security audit documents both tracks and the blocking gate', () => {
  const body = read('slashforge-workflow-security.md');
  // Track A — deterministic dependency scan.
  assert.ok(/npm audit --json/.test(body), 'Track A runs npm audit --json');
  assert.ok(/High\/Critical|high.{0,3}critical|`high`.*`critical`/i.test(body),
    'Track A blocks on High/Critical');
  assert.ok(body.includes('slashforge-audit.js'), 'Track A parses through the shipped helper');
  // Track B — rigid AppSec OWASP pass.
  assert.ok(/rigid AppSec engineer/i.test(body), 'Track B uses the rigid AppSec prompt');
  for (const owasp of ['Hardcoded secrets', 'Injection', 'Broken Access Control']) {
    assert.ok(body.includes(owasp), `Track B names ${owasp}`);
  }
  assert.ok(/category: security/.test(body) && /severity: blocking/.test(body),
    'findings carry category: security, severity: blocking');
  // Gate.
  assert.ok(/Phase 8.*does not run|halts/i.test(body), 'a blocking finding halts before Phase 8');
});

test('P3: Phase 7 wires in the security gate and the standalone review renders SECURITY FINDINGS', () => {
  const workflow = read('slashforge-workflow.md');
  assert.ok(workflow.includes('slashforge-workflow-security.md'), 'Phase 7 references the audit');
  assert.ok(/Phase 8 does not run|Phase 7 halts/i.test(workflow), 'Phase 7 states the gate');

  const review = instruction('review-pr.md');
  assert.ok(review.includes('SECURITY FINDINGS'), 'review-pr renders a SECURITY FINDINGS header');
  assert.ok(review.includes('slashforge-workflow-security.md'), 'review-pr runs the shared audit');

  // The red styling the header relies on must exist in the shell.
  const shell = read('slashforge-report-shell.html');
  assert.ok(/\.security-findings/.test(shell), 'the shell must style the security findings block');
});

test('P3: slashforge-audit.js is a shipped asset', () => {
  assert.ok(ASSET_FILES.includes('slashforge-audit.js'), 'audit helper must be an asset');
});

// The audit parser is deterministic and executable, so run the shipped file.
const AUDIT = path.join(TEMPLATES_DIR, 'slashforge-audit.js');

function runAudit(json) {
  const dir = tmp();
  const file = path.join(dir, 'audit.json');
  fs.writeFileSync(file, typeof json === 'string' ? json : JSON.stringify(json));
  try {
    const stdout = execFileSync('node', [AUDIT, file], { encoding: 'utf8' });
    return { status: 0, stdout };
  } catch (err) {
    return { status: err.status, stdout: String(err.stdout || '') };
  }
}

test('P3: audit parser flags High/Critical (npm v7 vulnerabilities shape) and exits non-zero', () => {
  const r = runAudit({
    vulnerabilities: {
      lodash: { name: 'lodash', severity: 'high', title: 'Prototype pollution' },
      minimist: { name: 'minimist', severity: 'moderate', title: 'ReDoS' },
      leftpad: { name: 'leftpad', severity: 'critical', title: 'RCE' },
    },
    metadata: { vulnerabilities: { moderate: 1, high: 1, critical: 1 } },
  });
  assert.equal(r.status, 1, 'high/critical advisories must exit 1');
  assert.ok(/lodash/.test(r.stdout) && /leftpad/.test(r.stdout), 'names the blocking advisories');
  assert.ok(!/minimist/.test(r.stdout), 'moderate advisories must not block');
});

test('P3: audit parser understands the npm v6 advisories shape', () => {
  const r = runAudit({
    advisories: {
      1065: { module_name: 'serialize-javascript', severity: 'high', title: 'XSS' },
      1067: { module_name: 'acorn', severity: 'low', title: 'ReDoS' },
    },
  });
  assert.equal(r.status, 1);
  assert.ok(/serialize-javascript/.test(r.stdout));
  assert.ok(!/acorn/.test(r.stdout), 'low advisories must not block');
});

test('P3: audit parser passes clean audits and fails closed on garbage', () => {
  const clean = runAudit({ vulnerabilities: {}, metadata: { vulnerabilities: { total: 0 } } });
  assert.equal(clean.status, 0, 'no high/critical advisories passes');

  const garbage = runAudit('not json at all');
  assert.equal(garbage.status, 2, 'unparseable input must fail closed (exit 2), never pass the gate');
});

// ---------------------------------------------------------------------------
// Priority 4 — Phase 8 documentation sweep
// ---------------------------------------------------------------------------

test('P4: the documentation sweep follows Keep a Changelog and makes a docs commit', () => {
  const body = read('slashforge-workflow-docs.md');
  for (const h of ['### Added', '### Changed', '### Fixed', '### Security']) {
    assert.ok(body.includes(h), `must use the ${h} Keep a Changelog heading`);
  }
  assert.ok(body.includes('## [Unreleased]'), 'prepends under the Unreleased header');
  assert.ok(/README\.md/.test(body) && /public/i.test(body),
    'sweeps the README for public-interface changes');
  assert.ok(/CLI flags|environment variables|env var/i.test(body),
    'names the public surface it watches');
  assert.ok(body.includes('docs: auto-update changelog and readme for'),
    'commits with the standard message');
});

test('P4: Phase 8 runs the documentation sweep before the push', () => {
  const workflow = read('slashforge-workflow.md');
  assert.ok(workflow.includes('slashforge-workflow-docs.md'), 'Phase 8 references the docs sweep');
  const docIdx = workflow.indexOf('slashforge-workflow-docs.md');
  const pushIdx = workflow.indexOf('### Push');
  assert.ok(docIdx !== -1 && pushIdx !== -1 && docIdx < pushIdx,
    'the documentation sweep must come before the push');
});

// ---------------------------------------------------------------------------
// Priority 5 — resume/checkpointing + Node bump
// ---------------------------------------------------------------------------

test('P5: /slashforge-resume ships, installs, and documents the checkpoint contract', () => {
  assert.ok(
    COMMAND_FILES.some((c) => c.endsWith(`${path.sep}resume.md`)),
    'resume.md must be a shipped command',
  );
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const dest = commandPath(target, path.join('slashforge', 'resume.md'));
  assert.ok(fs.existsSync(dest), 'resume command must install');
  assert.match(fs.readFileSync(dest, 'utf8'), /^name: \/slashforge-resume$/m);

  const body = instruction('resume.md');
  assert.ok(/\.slashforge\/run_.*\.ckpt\.json/.test(body), 'names the checkpoint file');
  for (const key of ['current_phase', 'git_branch', 'context_snapshot']) {
    assert.ok(body.includes(key), `checkpoint must record ${key}`);
  }
  assert.ok(/verif/i.test(body) && /HEAD/.test(body), 'resume verifies the git HEAD');
  assert.ok(/current_phase \+ 1/.test(body), 're-enters at current_phase + 1');
});

test('P5: the workflow checkpoints at the end of every phase, atomically', () => {
  const body = read('slashforge-workflow.md') + '\n' + read('slashforge-workflow-resume.md');
  assert.ok(/end of every successful phase/i.test(body), 'checkpoints at the end of each phase');
  assert.ok(/atomic/i.test(body), 'the checkpoint write is atomic');
});

test('P5: Node engines are raised to 24 and CI matches', () => {
  const pkg = require('../package.json');
  assert.equal(pkg.engines.node, '>=24', 'engines must require Node 24');

  const ci = fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'ci.yml'), 'utf8');
  assert.ok(/node-version:\s*\[24\]/.test(ci), 'CI matrix must run Node 24');
  assert.ok(!/node-version:\s*\[16/.test(ci), 'the Node 16 floor must be gone from the matrix');
});

// ---------------------------------------------------------------------------
// Light Gears — /slashforge-test and /slashforge-refactor
// ---------------------------------------------------------------------------

test('Light Gears: /slashforge-test ships as a command and installs', () => {
  assert.ok(
    COMMAND_FILES.some((c) => c.endsWith(`${path.sep}test.md`)),
    'test.md must be a shipped command',
  );
  const home = tmp();
  const target = resolveTarget({ homeDir: home, cwd: home });
  installFiles(target, {});
  const dest = commandPath(target, path.join('slashforge', 'test.md'));
  assert.ok(fs.existsSync(dest), 'test command must install');
  const body = fs.readFileSync(dest, 'utf8');
  assert.match(body, /^name: \/slashforge-test$/m, 'test.md frontmatter names the command');
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

// ---------------------------------------------------------------------------
// Cross-cutting — the new guides are registered so they install and validate
// ---------------------------------------------------------------------------

test('every new workflow companion is registered in GUIDE_FILES', () => {
  for (const g of [
    'slashforge-workflow-fix.md',
    'slashforge-workflow-verify.md',
    'slashforge-workflow-security.md',
    'slashforge-workflow-docs.md',
    'slashforge-workflow-resume.md',
  ]) {
    assert.ok(GUIDE_FILES.includes(g), `${g} must be in GUIDE_FILES`);
    assert.ok(fs.existsSync(path.join(TEMPLATES_DIR, g)), `${g} template must exist`);
  }
});
