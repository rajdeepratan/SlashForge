# Docs UX polish — Plan

## Approach
Four small, independent UX fixes to the docs site, all driven by `requirements.md` in this
folder. No redesign, no new features. Fix 1 is a copy sweep (em-/en-dashes) confined to the home
page `index.astro` and any content-frontmatter `title`/`description` (the frontmatter is already
clean, so this is effectively an `index.astro`-only edit); Fixes 2–4 are three targeted edits to
`src/styles/site.css` and `src/pages/index.astro`. Verification is the docs build plus the five
`check-docs-*` scripts plus a Unicode grep — these stand in for a unit-test cycle on a
content/CSS change (there is no node:test surface here).

## Tech stack
Astro 7 docs workspace (ESM) under `docs/`. Commands run from inside `docs/`. See `docs/CLAUDE.md`.

## Global constraints
- Build from `docs/` with `npm run build` (exit 0) and run all five `check-docs-*.mjs` from
  `docs/` — every one must stay green (success criterion 5).
- Never edit `docs/src/content/docs/changelog.md` — it is generated from the repo-root
  `CHANGELOG.md` at build time.
- No em-dash (U+2014) or en-dash (U+2013) in titles, meta descriptions, or marketing copy
  (user standing rule; use colon/comma/parentheses, ranges as "N to M").
- No visual regression to the desktop header or the existing design system (criterion 6).

## Scope decision for Phase 3 (Fix 1 boundary)
`requirements.md` names Fix 1's replacement targets as **frontmatter `title`/`description` across
`content/docs/**`, the home-page `Base` `title`/`description`, and the visible hero + section copy
in `index.astro`** — i.e. titles, meta descriptions, and marketing copy. The guide *body* prose in
`content/docs/**/*.md` also contains em-dashes, but that is documentation prose, not a title, meta
description, or marketing copy, so this plan leaves it alone. **Recommended (narrow) reading, to
confirm at the gate.** If you instead want every em-/en-dash scrubbed from all guide bodies too,
say so and I will widen Task 1 (many more files). A check of the content frontmatter shows it is
already dash-free, so under the narrow reading Fix 1 is entirely an `index.astro` edit.

## Files
- **Modify** `docs/src/pages/index.astro` — Fix 1 (dash sweep of `Base` title/description, the
  `costs` value ranges + notes, the two card/transcript prose dashes, and the two section
  caveats) and Fix 4 (committee anchor `aria-label`).
- **Modify** `docs/src/styles/site.css` — Fix 2 (mobile `min-height: 44px` on the three header
  controls) and Fix 3 (restore a `:focus-visible` ring on the search-modal input).
- No files created or removed. Content-frontmatter files are verified-only (already clean).

## Risks & edge cases
- **Fix 1 boundary** — the one judgment call; resolved above and gated at Phase 3.
- **Fix 1 / transcript lines** — the terminal demo (`DEMO` array) uses ` · ` as its own
  separator; the two em-dashes in it (lines 26, 31) are inconsistent prose annotations, converted
  to colons to match the transcript's own style. Minus signs (`−`, U+2212) in the diff columns are
  a different character and are left untouched.
- **Fix 2** — only bump inside the existing `@media (max-width: 900px)` block so the desktop
  header is untouched; `box-sizing: border-box` is already global (`site.css:87`), so `44px`
  min-height is the true rendered height.
- **Fix 3** — the base `.modal__top input` sets `outline: none`, which overrides the site-wide
  `:focus-visible` convention (`site.css:102`, `outline: 2px solid var(--ember)`). Remove that
  override and add an explicit inset `:focus-visible` ring so the field shows focus without the
  ring clipping against the modal border.
- **Fix 4** — adding `aria-label` overrides the anchor's text-derived accessible name; the label
  keeps the member name so nothing is lost and the "opens in a new tab" announcement is added.

## Test strategy
No node:test surface (content + CSS). The gate is:
1. `grep -rlP '[\x{2013}\x{2014}]'` over `index.astro` visible copy + content frontmatter returns
   nothing outside code comments / the diff-column minus glyphs (Fix 1).
2. `npm run build` exits 0, then all five `check-docs-*.mjs` pass from `docs/` (every fix).
3. Manual confirmation in the built preview: the three header controls render ~44px on a mobile
   width (Fix 2); tabbing to the search field shows a visible ring (Fix 3); both committee anchors
   expose an accessible name ending "(opens in a new tab)" (Fix 4, also asserted by
   `check-docs-a11y`).
