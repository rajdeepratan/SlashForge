/**
 * The command names the docs can switch between targets, and the three
 * spellings of each.
 *
 * Imported by the build (astro.config.mjs -> the rehype plugin, running in
 * Node) and by the client bundle (src/scripts/site.js, via Vite). That is why
 * this is .mjs and not .ts: Node cannot import TypeScript during the build,
 * and one file has to serve both sides.
 *
 * The same transformation lives in bin/install.js as toSkillCommandRefs, which
 * rewrites cross-references when installing to the agents target. The two ship
 * as separate packages so the rule is written twice on purpose — but they must
 * agree on which commands exist, and a test asserts that against the
 * installer's own COMMAND_FILES and SKILL_FILES.
 */

export const TARGETS = ['claude', 'cursor', 'codex'];
export const DEFAULT_TARGET = 'claude';

/** Matches the existing `sf-theme` convention in src/scripts/site.js. */
export const STORAGE_KEY = 'sf-target';

// setup is absent here on purpose. It is not installed on cursor or codex, so
// there is no form to switch to, and deriving one would print a command that
// does not exist. Every reference to it therefore stays in the Claude Code
// spelling on every target — visibly wrong rather than plausibly wrong.
export const SWITCHABLE = [
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
  if (target === 'cursor') return `/slashforge-${name}`;
  if (target === 'codex') return `$slashforge-${name}`;
  return `/slashforge:${name}`;
}

// Longest first, so the alternation can never settle on a prefix: without this
// `review-pr` would be tried before `review-feedback`.
const alternation = [...SWITCHABLE].sort((a, b) => b.length - a.length).join('|');

export const COMMAND_RE = new RegExp(`/slashforge:(${alternation})\\b`, 'g');

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

const WHOLE_LABEL_RE = new RegExp(`^/slashforge:(${alternation})$`);

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
