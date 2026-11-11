# Agent-aware page lede — Tasks

## Task 1: regression test (red)
Files: create `test/docs-lede.test.js`
Produces: a failing test proving the lede excludes Cursor — the gate the fix must flip to green.

- [x] Step 1: write the test. Pure `fs`, no deps (mirrors `test/docs-claims.test.js`):

```js
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const PAGE = path.join(
  __dirname, '..', 'docs', 'src', 'content', 'docs', 'guides', 'plan-mode-and-init.md',
);

// The YAML frontmatter block, between the first pair of --- fences.
function frontmatter() {
  const src = fs.readFileSync(PAGE, 'utf8');
  const m = /^---\n([\s\S]*?)\n---/.exec(src);
  assert.ok(m, 'plan-mode-and-init.md must have frontmatter');
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
  const cursorLine = (new RegExp('^\\s{2,}cursor:\\s*(.+)$', 'm').exec(fm) || [])[1] || '';
  assert.match(cursorLine, /no built-in/i, 'cursor lede should state it has no built-in /init');
});
```

- [x] Step 2: run it, confirm it FAILS for the right reason —
  `node --test test/docs-lede.test.js` → the first assertion fails because the current
  `description` contains "Claude Code and Codex also ship". (Confirmed red.)
- [ ] Step 3: commit the red test. (Deferred — committing test + fix together to avoid a red
  commit in history; Phase 6's test-diff gate checks the working tree, not commits.)

## Task 2: fix — schema + render + content
Files: modify `docs/src/content.config.ts`, `docs/src/layouts/DocsLayout.astro`,
`docs/src/pages/[...slug].astro`, `docs/src/content/docs/guides/plan-mode-and-init.md`
Consumes: Task 1's test.
Produces: the agent-aware lede; Task 1 turns green.

- [x] Step 4: schema — in `docs/src/content.config.ts`, add to the `z.object({ ... })` schema
  (after `description`):

```ts
      /**
       * Optional per-agent lede. When present, the page subtitle switches with
       * the header Agent picker; `description` stays the single meta string.
       */
      descriptions: z
        .object({ claude: z.string(), cursor: z.string(), codex: z.string() })
        .partial()
        .optional(),
```

- [x] Step 5: render — in `docs/src/layouts/DocsLayout.astro`:
  - add `TARGETS` to the existing targets import:
    `import { wholeLabelCommand, TARGETS } from '../targets.mjs';`
  - add to `interface Props`: `descriptions?: Partial<Record<string, string>>;`
  - add `descriptions` to the destructure:
    `const { title, description, descriptions, slug, headings, filePath } = Astro.props;`
  - replace the lede line `{description && <p class="lede">{description}</p>}` with:

```astro
      {
        descriptions
          ? TARGETS.map((t) => (
              <p class="lede agent-only" data-agent={t}>{descriptions[t] ?? description}</p>
            ))
          : description && <p class="lede">{description}</p>
      }
```

- [x] Step 6: prop pass-through — in `docs/src/pages/[...slug].astro`, add to the `<DocsLayout>`
  props (under `description={page.data.description}`):
  `descriptions={page.data.descriptions}`

- [x] Step 7: content — in `docs/src/content/docs/guides/plan-mode-and-init.md`, replace the
  frontmatter `description` line and add the map (em-dash-free):

```yaml
description: Every agent ships a plan mode, and most ship an /init. Here is the line between those built-ins and SlashForge, and when you need neither.
descriptions:
  claude: Claude Code ships a plan mode and a built-in /init. Here is the line between those built-ins and SlashForge, and when you need neither.
  codex: Codex ships a plan mode and a built-in /init. Here is the line between those built-ins and SlashForge, and when you need neither.
  cursor: Cursor ships a plan mode but has no built-in /init. Here is the line between its built-ins and SlashForge, and when you need neither.
```

- [x] Step 8: run `node --test test/docs-lede.test.js`, confirm it PASSES.
- [ ] Step 9: commit the fix (with the Task 1 test — one commit, at Phase 8 push time).

## Task 3: verify (Phase 6)
Files: none (verification only)

- [x] Step 10: root suite — from repo root, `npm test` (full node:test suite) is green.
- [x] Step 11: docs build + per-agent render evidence — from `docs/`: `npm ci` (if needed),
  `npm run build`, then confirm the built page ships three lede paragraphs:
  `grep -o '<p class="lede agent-only" data-agent="[a-z]*">' dist/slashforge/guides/plan-mode-and-init.html`
  shows `claude`, `cursor`, `codex`.
- [x] Step 12: docs checks — from `docs/`, run the `check-docs-*` scripts
  (`links`, `targets`, `width`, `a11y`, `facts`); all pass.
