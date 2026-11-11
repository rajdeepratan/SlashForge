# Agent-aware page lede — Plan

## Approach
The page lede renders the frontmatter `description` as one static string (`DocsLayout.astro:84`),
so it cannot switch with the header Agent picker the way `:::agent[...]` body blocks do. Add an
**optional** per-target `descriptions` map to the docs schema and page frontmatter, and render the
lede as one `<p class="lede agent-only" data-agent="<target>">` per target — reusing the existing
`.agent-only` / `data-agent~=` visibility contract (site.css:82-85), so no new CSS. The single
`description` stays as the agent-neutral SEO/meta string. Pages without `descriptions` are
unchanged.

## Global constraints
- Docs site is a separate **Astro 7 / ESM** workspace under `docs/`; its node:test suite that needs
  `unist-util-visit` runs in the docs job, but pure-`fs` content tests run in the root `npm test`.
- **No em dashes** in any new copy (user copy rule) — use commas/periods, ranges as "N to M".
- The built HTML must still default to the **Claude Code** variant for no-JS readers and for
  check-docs — the per-target `<p>` for `claude` is that default (it is visible under the default
  `data-target="claude"` on `<html>`).
- `description` must remain a single plain string — it is the `<meta name="description">` source via
  `Head.astro`. Only the on-page lede gains per-agent variants.

## Files
- **Modify** `docs/src/content.config.ts` — add optional `descriptions` (a partial map of
  `claude`/`cursor`/`codex` to string) to the docs collection schema, so the frontmatter key is not
  stripped by Astro's content validation.
- **Modify** `docs/src/layouts/DocsLayout.astro` — accept a `descriptions?` prop; when present,
  render one `<p class="lede agent-only" data-agent={t}>` per `TARGETS` entry (text =
  `descriptions[t] ?? description`); otherwise render the existing single `<p class="lede">`.
  Import `TARGETS` from `../targets.mjs` (already imports `wholeLabelCommand` from it).
- **Modify** `docs/src/pages/[...slug].astro` — pass `descriptions={page.data.descriptions}` to
  `DocsLayout` alongside `description`.
- **Modify** `docs/src/content/docs/guides/plan-mode-and-init.md` — rewrite the top-level
  `description` to agent-neutral copy, and add a `descriptions` map with one truthful line per agent
  (Cursor's states it has a plan mode but **no built-in `/init`**).
- **Create** `test/docs-lede.test.js` — the regression test (pure `fs`, zero-dep, runs in root
  `npm test`).

## Risks & edge cases
- **Partial map / fallback:** a page may supply a subset of agents; render falls back to the neutral
  `description` for any missing target, so every agent always sees a lede.
- **No-JS default:** three `<p>` ship in the HTML; only the `claude` one is visible by default. This
  is the same trade the body `:::agent` blocks already make, and keeps check-docs' "Claude default"
  expectation.
- **YAML:** the new `descriptions` values contain `/init` and commas but no `: ` sequence, so they
  are valid unquoted YAML scalars.
- **Other pages unaffected:** `descriptions` is optional; every page that omits it renders exactly
  as before (single static lede). No snapshot/dist regression expected beyond this one page.

## Test strategy
`test/docs-lede.test.js` parses the raw frontmatter of `plan-mode-and-init.md` and asserts the
user-visible contract that was broken:
1. the neutral `description` no longer contains the excluding phrase `Claude Code and Codex also
   ship` (the exact bug string) — **fails before**, passes after;
2. a `descriptions:` map exists with a non-empty entry for each of claude/cursor/codex;
3. Cursor's entry states it has no built-in `/init` (`/no built-in/i`).

Rendering the switch is a build-time concern (the repo's docs tests parse source, they do not build
Astro), so the per-agent `<p class="lede">` spans are verified in Phase 6 by building `docs/` and
grepping the built HTML for the three `data-agent` lede paragraphs, recorded as evidence alongside
the docs build and the `check-docs-*` scripts.
