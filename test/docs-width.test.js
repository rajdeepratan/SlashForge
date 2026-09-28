const { test } = require('node:test');
const assert = require('node:assert');

// The check script is ESM; load it dynamically like the other docs tests.
const load = () => import('../.github/scripts/check-docs-width.mjs');

// Build a table's built-HTML shape: a thead header row of the given cells and
// one body row. widthProblems only inspects the first row for column count and
// agent names, so the body is a placeholder.
const table = (headers) =>
  `<table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}` +
  `</tr></thead><tbody><tr>${headers.map(() => '<td>x</td>').join('')}</tr></tbody></table>`;

test('flags a five-column table anywhere', async () => {
  const { widthProblems } = await load();
  const out = widthProblems(table(['Term', 'What', 'Claude Code', 'Cursor', 'Codex']),
    { allowCompare: false });
  assert.ok(out.some((m) => /column/.test(m)), 'should flag the column count');
});

test('flags a five-column table even on a compare-allowlisted page', async () => {
  const { widthProblems } = await load();
  const out = widthProblems(table(['a', 'b', 'c', 'd', 'e']), { allowCompare: true });
  assert.ok(out.some((m) => /column/.test(m)), 'the column budget applies everywhere');
});

test('flags a per-agent-column table on a normal page', async () => {
  const { widthProblems } = await load();
  const out = widthProblems(table(['What', 'Claude Code', 'Cursor', 'Codex']),
    { allowCompare: false });
  assert.ok(out.some((m) => /Claude Code/.test(m) && /Cursor/.test(m)),
    'should name the compared agents');
});

test('allows a per-agent-column table on a compare-allowlisted page', async () => {
  const { widthProblems } = await load();
  const out = widthProblems(table(['Host', 'Claude Code', 'Cursor', 'Codex']),
    { allowCompare: true });
  assert.deepEqual(out, []);
});

test('allows a plain two-column table', async () => {
  const { widthProblems } = await load();
  assert.deepEqual(widthProblems(table(['Path', 'When']), { allowCompare: false }), []);
});

test('a table naming only one agent is not a per-agent comparison', async () => {
  const { widthProblems } = await load();
  // A three-column table that mentions a single agent in a header is fine.
  assert.deepEqual(
    widthProblems(table(['Step', 'Command', 'Codex note']), { allowCompare: false }),
    []
  );
});

test('handles a page with several tables', async () => {
  const { widthProblems } = await load();
  const html = table(['Path', 'When']) + table(['Term', 'a', 'b', 'c', 'd']);
  const out = widthProblems(html, { allowCompare: false });
  assert.equal(out.length, 1, 'only the over-wide table is flagged');
});
