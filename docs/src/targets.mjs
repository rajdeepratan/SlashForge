/**
 * The command names the docs can switch between targets, and the three
 * spellings of each.
 *
 * Imported by the build (astro.config.mjs -> the rehype plugin, running in
 * Node) and by the client bundle (src/scripts/site.js, via Vite). That is why
 * this is .mjs and not .ts: Node cannot import TypeScript during the build,
 * and one file has to serve both sides.
 *
 * The same rule lives in bin/install.js as toHostCommandRefs, which swaps the
 * sigil in Codex's guides. The two ship as separate packages so the rule is
 * written twice on purpose — but they must agree on which commands exist, and a
 * test asserts that against the installer's own COMMAND_FILES and SKILL_FILES.
 */

export const TARGETS = ['claude', 'cursor', 'codex'];
export const DEFAULT_TARGET = 'claude';

/** Matches the existing `sf-theme` convention in src/scripts/site.js. */
export const STORAGE_KEY = 'sf-target';

// setup is switchable like the rest: it runs on every host, scaffolding each one's
// own layout.
export const SWITCHABLE = [
  'setup',
  'code',
  'investigate',
  'review-pr',
  'brainstorm',
  'plan',
  'debug',
  'tdd',
  'verify',
  'review-feedback',
  'request-review',
  'worktree',
  'parallel',
];

export function commandForm(name, target) {
  return target === 'codex' ? `$slashforge-${name}` : `/slashforge-${name}`;
}

// Longest first, so the alternation can never settle on a prefix: without this
// `review-pr` would be tried before `review-feedback`.
const alternation = [...SWITCHABLE].sort((a, b) => b.length - a.length).join('|');

// A command, never a path segment: `~/.agents/skills/slashforge-code/` is a directory.
export const COMMAND_RE = new RegExp(`(?<![\\w./~-])/slashforge-(${alternation})\\b`, 'g');

/**
 * Where an install lands, per host. Cursor and Codex share one skill set in
 * ~/.agents/skills/, but each has its own guide folder, because setup writes a
 * different layout for each. A test asserts these against resolveTarget and
 * resolveAgents in bin/install.js, so the docs cannot drift from the installer.
 */
export const INSTALL_PATHS = {
  guides: {
    claude: '~/.claude/setup/slashforge/',
    cursor: '~/.agents/setup/slashforge/cursor/',
    codex: '~/.agents/setup/slashforge/codex/',
  },
  commands: { claude: '~/.claude/commands/', cursor: '~/.agents/skills/', codex: '~/.agents/skills/' },
  root: { claude: '~/.claude/', cursor: '~/.agents/', codex: '~/.agents/' },
};

export function installPathFor(kind, target) {
  const set = INSTALL_PATHS[kind];
  return set ? set[target] || set.claude : '';
}

// Longest first, or `~/.claude/` swallows the prefix of the other two.
const PATH_ALTERNATION = Object.entries(INSTALL_PATHS)
  .map(([kind, set]) => [kind, set.claude])
  .sort((a, b) => b[1].length - a[1].length);

export const PATH_RE = new RegExp(
  '(' + PATH_ALTERNATION.map(([, v]) => v.replace(/[.\\/~]/g, '\\$&')).join('|') + ')',
  'g'
);

/** The kind of install path a matched string is, or null. */
export function pathKind(value) {
  const hit = PATH_ALTERNATION.find(([, v]) => v === value);
  return hit ? hit[0] : null;
}

/**
 * Splits text into plain and command parts.
 *
 * The rehype plugin does this over hast nodes for markdown. Astro templates —
 * the landing page's command cards and terminal replays — are not markdown and
 * never reach that plugin, so they call this instead. One regex, one rule, two
 * renderers.
 *
 * Returns parts as { text } or { text, cmd }.
 */
export function splitCommandText(value) {
  const parts = [];
  const str = String(value);
  let last = 0;
  let m;
  COMMAND_RE.lastIndex = 0;
  while ((m = COMMAND_RE.exec(str)) !== null) {
    if (m.index > last) parts.push({ text: str.slice(last, m.index) });
    parts.push({ text: m[0], cmd: m[1] });
    last = m.index + m[0].length;
  }
  if (last < str.length) parts.push({ text: str.slice(last) });
  return parts;
}

/**
 * One line of the landing page's terminal replay, rendered for a target.
 *
 * The replay animates by writing textContent, which flattens any child
 * elements — so the span-and-CSS approach used everywhere else survives only
 * until the animation starts. Both the command substitution and the prompt
 * rule therefore have to happen in text, here.
 *
 * Codex invokes commands with `$` rather than `/`, so the mock's own `$ `
 * prompt would render "$ $slashforge-code" and read as a typo. It is dropped
 * for that target, and only on a line that actually carries a command — a
 * shell line like "$ npx slashforge" keeps its prompt everywhere.
 */
export function renderReplayLine(src, target) {
  const parts = splitCommandText(src);
  if (!parts.some((p) => p.cmd)) return String(src);

  const text = parts.map((p) => (p.cmd ? commandForm(p.cmd, target) : p.text)).join('');
  return target === 'codex' && text.startsWith('$ $') ? text.slice(2) : text;
}

const WHOLE_LABEL_RE = new RegExp(`^/slashforge-(${alternation})$`);

/**
 * The command name when a label is exactly one command, else null.
 *
 * Used for page titles and sidebar entries, which are whole-string command
 * names rather than prose. A label that merely contains a command is left
 * alone, because the rehype plugin already handles running text.
 */
export function wholeLabelCommand(label) {
  const m = WHOLE_LABEL_RE.exec(String(label).trim());
  return m ? m[1] : null;
}
