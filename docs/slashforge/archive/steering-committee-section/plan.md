# Steering Committee section — Plan

## Approach
Add a new `Steering Committee` section to the docs home page (`docs/src/pages/index.astro`),
placed immediately after the existing `What it costs` section and before the closing ember
poster. It follows the page's existing `section > band > section__head + cells` pattern, with
the two members lifted into a `committee` data array and each rendered as an external
`cell--link` to their LinkedIn profile.

## Files
- Modify `docs/src/pages/index.astro` — add a `committee` data array in the frontmatter and a
  new `<section class="section">` after the `What it costs` section's closing tag (line ~344).

## Risks & edge cases
- External links must use `target="_blank"` + `rel="noopener"` (matching the existing GitHub
  link in the hero) so a11y/link checks and security expectations hold.
- `check-docs-a11y.mjs` requires accessible names on interactive elements — each link carries
  the member's name as text content, so it is covered.
- `check-docs-links.mjs` only checks internal links; external LinkedIn URLs are out of its scope.
- No em-dashes in the copy (standing preference).

## Test strategy
Build the docs site from `docs/` (`npm run build`) and run the `check-docs-*` scripts
(`check-docs-links`, `check-docs-a11y`, `check-docs-facts`, `check-docs-width`,
`check-docs-targets`) against the built output. All must pass. Visually confirm the new
section renders after `What it costs` with both members linking out correctly.
