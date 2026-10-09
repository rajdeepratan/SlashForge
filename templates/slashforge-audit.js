// SlashForge — deterministic dependency-audit parser for Phase 7 Track A.
//
// Installed verbatim next to the guides, for the same reason as
// slashforge-review-payload.js: a file can be allowed by its path, an inline
// `node -e` script cannot.
//
// Usage:  node <path-to-this>/slashforge-audit.js <npm-audit-json>
//
// Reads the JSON written by `npm audit --json` (both the npm v6 `advisories`
// shape and the npm v7+ `vulnerabilities` shape are understood) and reports every
// advisory of severity `high` or `critical` — the bar the spec sets for a blocking
// security finding. Moderate and low advisories are deliberately ignored, so the
// exit code alone (which npm sets for any advisory at all) is never the gate.
//
// Exit codes, so the caller's gate is deterministic:
//   0  — no high/critical advisories: Track A passes.
//   1  — one or more high/critical advisories: each is printed, one per line.
//   2  — the input could not be read or parsed: fail closed, do not pass the gate
//        on an audit that did not actually run.

const fs = require('fs');

const BLOCKING = new Set(['high', 'critical']);

function fail(msg) {
  console.error(`slashforge-audit: ${msg}`);
  process.exit(2);
}

const file = process.argv[2];
if (!file) fail('usage: node slashforge-audit.js <npm-audit-json>');

let raw;
try {
  raw = fs.readFileSync(file, 'utf8');
} catch (err) {
  fail(`cannot read ${file}: ${err.message}`);
}

let data;
try {
  data = JSON.parse(raw);
} catch (err) {
  fail(`cannot parse ${file} as JSON: ${err.message}`);
}

// Normalise both npm audit shapes into { name, severity, title } rows.
const rows = [];
if (data && typeof data.vulnerabilities === 'object' && !Array.isArray(data.vulnerabilities)) {
  // npm v7+: keyed by package name. `metadata.vulnerabilities` is a severity
  // histogram of numbers, not advisories — guard against being handed that by
  // requiring a string `severity` on each entry.
  for (const [name, v] of Object.entries(data.vulnerabilities)) {
    if (v && typeof v.severity === 'string') {
      rows.push({ name: v.name || name, severity: v.severity, title: v.title || '' });
    }
  }
} else if (data && typeof data.advisories === 'object' && !Array.isArray(data.advisories)) {
  // npm v6: keyed by advisory id.
  for (const a of Object.values(data.advisories)) {
    if (a && typeof a.severity === 'string') {
      rows.push({ name: a.module_name || '', severity: a.severity, title: a.title || '' });
    }
  }
} else {
  fail('input has neither a `vulnerabilities` nor an `advisories` object — not npm audit --json output');
}

const blocking = rows.filter((r) => BLOCKING.has(String(r.severity).toLowerCase()));

for (const r of blocking) {
  const title = r.title ? ` — ${r.title}` : '';
  console.log(`[${r.severity.toUpperCase()}] ${r.name}${title}`);
}

if (blocking.length) {
  console.error(`slashforge-audit: ${blocking.length} high/critical advisory(ies) — blocking`);
  process.exit(1);
}

console.log('slashforge-audit: no high/critical advisories');
process.exit(0);
