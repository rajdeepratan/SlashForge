const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

// Pure-fs content test (no docs deps), so it runs in the root `npm test` the
// same way test/docs-claims.test.js does. It guards the page lede against the
// regression where the subtitle named only two of the three agents and so read
// as not-for-Cursor, even though the page body already adapts per agent.

const PAGE = path.join(
  __dirname, '..', 'docs', 'src', 'content', 'docs', 'guides', 'plan-mode.md',
);

// The YAML frontmatter block, between the first pair of --- fences.
function frontmatter() {
  const src = fs.readFileSync(PAGE, 'utf8');
  const m = /^---\n([\s\S]*?)\n---/.exec(src);
  assert.ok(m, 'plan-mode.md must have frontmatter');
  return m[1];
}

test('the plan-mode lede does not exclude Cursor', () => {
  const fm = frontmatter();

  // The neutral `description` is the SEO/meta string shown to every agent, so it
  // must not foreground a feature only two of three ship. This exact phrase was
  // the bug: it named Claude Code and Codex and left Cursor out.
  assert.doesNotMatch(
    fm, /Claude Code and Codex also ship/i,
    'top-level description still names only Claude Code and Codex, excluding Cursor',
  );

  // A per-agent lede map must exist so the subtitle switches with the agent.
  assert.match(fm, /^descriptions:/m, 'frontmatter must declare a per-agent `descriptions` map');

  // Each agent gets its own non-empty lede line.
  for (const agent of ['claude', 'cursor', 'codex']) {
    assert.match(
      fm, new RegExp(`^\\s{2,}${agent}:\\s*\\S`, 'm'),
      `descriptions is missing a non-empty entry for ${agent}`,
    );
  }

  // Cursor's lede must tell the truth: a plan mode but no built-in /init.
  // Scope to the `descriptions:` block. The frontmatter also carries a `titles:`
  // map with its own `cursor:` key, which this must not pick up.
  const descBlock = fm.slice(fm.indexOf('\ndescriptions:'));
  const cursorLine = (new RegExp('^\\s{2,}cursor:\\s*(.+)$', 'm').exec(descBlock) || [])[1] || '';
  assert.match(cursorLine, /no built-in/i, 'cursor lede should state it has no built-in /init');
});
