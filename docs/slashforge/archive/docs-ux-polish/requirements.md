# Docs UX polish — requirements

Source: UX audit of the docs site (`localhost:4327/slashforge`), 2026-10-13. This doc is the
requirements source for a `/slashforge-code` run. It fixes the actionable findings from that
audit. Each fix below is independently shippable; they can be done together or split.

## Goal

Close the small, concrete UX gaps found in the docs-site audit: one cross-cutting copy
consistency issue (em-dashes), two mobile touch-target sizes, one missing focus indicator, and
one screen-reader new-tab announcement. No redesign, no new features.

## Context / where things live

- Design system / all CSS: `docs/src/styles/site.css`.
- Home page (hero + marketing sections, including the new Steering Committee section): `docs/src/pages/index.astro`.
- Per-page titles and meta descriptions: frontmatter (`title`, `description`) in `docs/src/content/docs/**/*.md`, plus the home page's `title`/`description` props passed to `Base` in `docs/src/pages/index.astro`.
- The changelog page is generated from the repo-root `CHANGELOG.md` at build time (`docs/src/content/docs/changelog.md` is gitignored); fix source copy in `CHANGELOG.md`, never the generated page.
- Verify with: build from `docs/` (`npm run build`) and run the five `check-docs-*` scripts from `docs/` (`node ../.github/scripts/check-docs-<name>.mjs`). All must stay green.

## Fixes (each is a success criterion)

### Fix 1 (primary): remove em-dashes from titles, meta descriptions, and marketing copy
- Replace every em-dash (U+2014) and en-dash (U+2013) in: page `title` and `description`
  frontmatter across `docs/src/content/docs/**`, the home page `Base` `title`/`description` in
  `index.astro`, and the visible hero + section copy in `index.astro`.
- Replacements: use a colon, comma, or parentheses for a dash used as a pause/separator; write
  numeric ranges as "N to M" (for example "100 to 250k"). Keep meaning and tone intact.
- Scope note: this is the widest fix (many files). The token-cost tables on the home page use
  en-dash ranges like `100–250k`; convert those to "100 to 250k" as well.
- Out of scope: dashes inside code blocks, command flags, file names, or the generated
  changelog page (fix the root `CHANGELOG.md` source instead; historical release entries may be
  left alone if changing them would rewrite shipped history — confirm during planning).
- Done when: a Unicode grep for U+2013/U+2014 over `docs/src/content/docs/**`, `index.astro`
  visible copy, and the `Base` props returns nothing (outside code/flags), and the build + all
  `check-docs-*` scripts pass.

### Fix 2: raise mobile touch targets toward 44px
- In `docs/src/styles/site.css`, give `.menu-toggle`, `.theme-btn`, and `.search-btn` a
  min-height of ~44px on touch/mobile (at or below the 900px breakpoint is sufficient; a global
  bump is acceptable if it does not distort the desktop header).
- Rationale: current controls are ~30px tall (`padding: 7px 12px; font: 12px`). That clears
  WCAG 2.5.8 (24px) but is below the comfortable 44px, and the mobile `Menu` button is the
  primary navigation control on small screens.
- Done when: the three controls render at ~44px min on mobile widths, the desktop header is
  visually unchanged, and `check-docs-*` + build pass.

### Fix 3: restore a focus indicator on the search-modal input
- In `docs/src/styles/site.css`, the `.modal__top input` rule sets `outline: none`. Replace that
  with a visible focus affordance (a `:focus-visible` inset ring or a subtle border change) so a
  keyboard user sees the field focus. Do not simply delete the ring with nothing in its place.
- Done when: focusing the search field shows a visible indicator, and nothing else regresses.

### Fix 4: announce new-tab on the Steering Committee LinkedIn links
- In `docs/src/pages/index.astro`, the two committee `cell--link` anchors open in a new tab
  (`target="_blank"`) but lack the `aria-label="… (opens in a new tab)"` that the site's other
  external links (GitHub, Sponsor) carry.
- Add `aria-label="<member name>, LinkedIn profile (opens in a new tab)"` to each committee
  anchor so the pattern matches the rest of the site.
- Done when: both anchors expose an accessible name that announces the new tab, and
  `check-docs-a11y` passes.

## Explicitly out of scope (reviewed, no change needed)
- Changelog page length (~5,844 words): it has a working "On this page" TOC listing all version
  anchors, so there is no navigation gap. Leave as-is.
- Redirect stubs using meta-refresh (`guides/migrating*`, `superpowers`, `vs-init`): acceptable
  on a static host. Leave as-is.
- A full axe/Lighthouse contrast sweep across the six theme-by-agent accent combinations: this is
  a validation task (tooling run), not a code change, so it is not part of this spec.

## Success criteria (whole change)
1. No em-dashes/en-dashes in titles, meta descriptions, or marketing copy (per Fix 1 scope).
2. `.menu-toggle`, `.theme-btn`, `.search-btn` meet ~44px min touch height on mobile.
3. The search-modal input shows a visible focus indicator.
4. Both committee LinkedIn links announce "opens in a new tab".
5. `npm run build` exits 0 and all five `check-docs-*` scripts pass.
6. No visual regression to the desktop layout or the existing design system.
