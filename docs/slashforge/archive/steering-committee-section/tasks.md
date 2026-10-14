# Steering Committee section — Tasks

## Task 1: Add the Steering Committee section to the home page
Files: modify `docs/src/pages/index.astro`

- [x] Step 1: add a `committee` array in the frontmatter (after the `costs` array) with two
      entries, each `{ name, href }`:
      - Madhur Ahuja: `https://www.linkedin.com/in/ahujamadhur/`
      - Stephane Pareilleux: `https://www.linkedin.com/in/spareilleux/`
- [x] Step 2: add a new `<section class="section">` immediately after the `What it costs`
      section (after line ~344), before the `<section class="poster">`. Use the
      `band > section__head (h2 "Steering Committee") + cells` pattern, mapping `committee`
      to external `cell--link` anchors (`target="_blank"` `rel="noopener"`) showing each
      member's name only. Add a short caveat line describing who they are.
- [x] Step 3: build from `docs/` with `npm run build`; confirm it succeeds.
- [x] Step 4: run the `check-docs-*` scripts from `docs/`; confirm all pass.
- [ ] Step 5: commit.
