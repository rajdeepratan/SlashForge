const { test } = require('node:test');
const assert = require('node:assert');

// The plugin is ESM and this suite is CommonJS, so it is loaded dynamically —
// the same pattern test/docs-targets.test.js uses for docs/src/targets.mjs.
const load = () => import('../docs/src/plugins/remark-agent-only.mjs');

// A minimal VFile stand-in: the plugin calls file.message() to report an
// unknown or missing target. Collect those instead of needing a real VFile.
const fakeFile = () => ({ messages: [], message(m) { this.messages.push(String(m)); } });

// remark-directive parses `:::agent[claude,codex]` into a containerDirective
// whose first child is a paragraph flagged directiveLabel. Build that shape by
// hand so the test exercises the transform without the full markdown pipeline.
const directive = (label, bodyText) => ({
  type: 'root',
  children: [
    {
      type: 'containerDirective',
      name: 'agent',
      children: [
        { type: 'paragraph', data: { directiveLabel: true }, children: [{ type: 'text', value: label }] },
        { type: 'paragraph', children: [{ type: 'text', value: bodyText }] },
      ],
    },
  ],
});

test('a single-target block becomes an agent-only div with data-agent', async () => {
  const { remarkAgentOnly } = await load();
  const tree = directive('claude', 'Claude only.');
  remarkAgentOnly()(tree, fakeFile());

  const node = tree.children[0];
  assert.equal(node.data.hName, 'div');
  assert.equal(node.data.hProperties.class, 'agent-only');
  assert.equal(node.data.hProperties['data-agent'], 'claude');
});

test('the bracket label is consumed, not rendered as body', async () => {
  const { remarkAgentOnly } = await load();
  const tree = directive('claude', 'Claude only.');
  remarkAgentOnly()(tree, fakeFile());

  const node = tree.children[0];
  // The directiveLabel paragraph is shifted off; only the body paragraph remains.
  assert.equal(node.children.length, 1);
  assert.equal(node.children[0].children[0].value, 'Claude only.');
});

test('a multi-target label space-joins the agents', async () => {
  const { remarkAgentOnly } = await load();
  const tree = directive('claude,codex', 'Both.');
  remarkAgentOnly()(tree, fakeFile());

  assert.equal(tree.children[0].data.hProperties['data-agent'], 'claude codex');
});

test('whitespace around targets is tolerated', async () => {
  const { remarkAgentOnly } = await load();
  const tree = directive('claude, codex', 'Both.');
  remarkAgentOnly()(tree, fakeFile());

  assert.equal(tree.children[0].data.hProperties['data-agent'], 'claude codex');
});

test('an unknown target is dropped and reported', async () => {
  const { remarkAgentOnly } = await load();
  const tree = directive('bogus', 'Nope.');
  const file = fakeFile();
  remarkAgentOnly()(tree, file);

  assert.equal(tree.children[0].data.hProperties['data-agent'], '');
  assert.ok(file.messages.some((m) => /bogus/.test(m)), 'unknown target should be reported');
});

test('remarkCallouts leaves :::agent alone so agent-only can own it', async () => {
  // Astro runs remarkCallouts before remarkAgentOnly. remarkCallouts treats any
  // unknown container directive as a plain note — which, unless it skips
  // "agent", consumes the [claude,codex] label before this plugin reads it and
  // ships an empty data-agent. This runs them in the real order.
  const { remarkAgentOnly } = await load();
  const { remarkCallouts } = await import('../docs/src/plugins/remark-callouts.mjs');
  const tree = directive('claude,codex', 'Both.');
  const file = fakeFile();

  remarkCallouts()(tree, file);
  remarkAgentOnly()(tree, file);

  const node = tree.children[0];
  assert.equal(node.data.hProperties.class, 'agent-only');
  assert.equal(node.data.hProperties['data-agent'], 'claude codex');
});

test('non-agent container directives are left alone', async () => {
  const { remarkAgentOnly } = await load();
  const tree = {
    type: 'root',
    children: [{ type: 'containerDirective', name: 'note', children: [] }],
  };
  remarkAgentOnly()(tree, fakeFile());

  // remark-callouts owns :::note — this plugin must not touch it.
  assert.equal(tree.children[0].data, undefined);
});
