# Docs UX polish — Tasks

Execute Task 1 first (it is the widest), then 2–4 in any order; verify together at the end.
Each task is independently shippable per `requirements.md`.

## Task 1: Fix 1 — remove em-/en-dashes from home-page titles, meta, and marketing copy
Files: modify `docs/src/pages/index.astro`; verify-only `docs/src/content/docs/**/*.md` frontmatter
Consumes: nothing
Produces: dash-free `Base` props and visible copy for the Fix 1 grep gate

- [x] Step 1 (red): from `docs/`, run `grep -nP '[\x{2013}\x{2014}]' src/pages/index.astro` and
      `grep -rlP '[\x{2013}\x{2014}]' src/content/docs --include='*.md' | xargs -I{} sh -c "awk '/^---$/{c++} c==1 && /^(title|description):/ && /[\xe2\x80\x93\xe2\x80\x94]/{print FILENAME\": \"\$0}' {}"` — confirm the first lists lines 26, 31, 102, 118, 123, 128, 129, 133, 138, 139, 143, 148, 153, 173, 174, 325, 352 and the second prints nothing (frontmatter already clean).
- [x] Step 2: in `index.astro`, edit `Base` props — line 173 `title`: `SlashForge — workflow …`
      → `SlashForge: workflow slash commands for AI coding agents`; line 174 `description`: change
      `… for AI coding agents — /slashforge-setup …` → `… for AI coding agents: /slashforge-setup …`.
- [x] Step 3: in the `costs` array, convert every `value` en-dash range to "N to M": `50–120k`→`50 to 120k`,
      `100–250k`→`100 to 250k`, `75–225k`→`75 to 225k`, `40–70k`→`40 to 70k`, `15–60k`→`15 to 60k`,
      `15–70k`→`15 to 70k`, `15–50k`→`15 to 50k`, `40–120k`→`40 to 120k`; and in the notes convert
      `4–10%`→`4 to 10%` and `reading — however far`→`reading, however far`.
- [x] Step 4: in the `commands` array, line 102 `desc`: `runs them, and reports — surfacing bugs`
      → `runs them, and reports, surfacing bugs`.
- [x] Step 5: in the `DEMO` array, line 26 `new — token bucket, Redis-backed` → `new: token bucket, Redis-backed`;
      line 31 `CONFIRM — stops and waits for you` → `CONFIRM: stops and waits for you` (matches the
      transcript's own ` · ` separator style). Leave the `−` (U+2212) minus signs in `REVIEW_DEMO` untouched.
- [x] Step 6: in the JSX caveats, line ~325 `All eight run on every agent —{' '}` → `All eight run on every agent:{' '}`;
      line ~352 `SlashForge is deliberately heavy — if you want` → `SlashForge is deliberately heavy: if you want`.
- [x] Step 7 (green): re-run `grep -nP '[\x{2013}\x{2014}]' src/pages/index.astro` — confirm it now
      reports only code-comment lines 3, 20, 113 (the frontmatter JS comments, out of scope), and nothing in
      the data arrays, `Base` props, or JSX body.
- [x] Step 8: commit.

## Task 2: Fix 2 — raise mobile touch targets to ~44px
Files: modify `docs/src/styles/site.css`
Consumes: nothing
Produces: ≥44px `.menu-toggle` / `.theme-btn` / `.search-btn` at ≤900px

- [x] Step 1: in the existing `@media (max-width: 900px)` block (opens at `site.css:991`, holds the
      `.search-btn { min-width: 0; }` rule), add: `.menu-toggle, .theme-btn, .search-btn { min-height: 44px; }`.
- [x] Step 2: confirm `box-sizing: border-box` is global (`site.css:87`) so 44px is the true height, and
      that no rule outside this media block sets a conflicting `min-height` on the three selectors
      (`grep -nE '\.(menu-toggle|theme-btn|search-btn)' src/styles/site.css`).
- [x] Step 3: build (`npm run build`) and eyeball the desktop header — unchanged (the bump is media-scoped).
- [x] Step 4: commit.

## Task 3: Fix 3 — restore a focus indicator on the search-modal input
Files: modify `docs/src/styles/site.css`
Consumes: nothing
Produces: a visible `:focus-visible` ring on `.modal__top input`

- [x] Step 1: in the `.modal__top input { … }` rule (opens `site.css:925`), delete the
      `outline: none;` line (it was overriding the site-wide `:focus-visible` ring at `site.css:102`).
- [x] Step 2: immediately after that rule's closing brace, add an explicit inset ring:
      `.modal__top input:focus-visible { outline: 2px solid var(--ember); outline-offset: -2px; }`
      (inset so the ring sits inside the field and never clips the 2px modal border).
- [x] Step 3: build and open `npm run preview`; press `/` (or the search button) to open the modal
      and Tab into the field — a visible ember ring appears; nothing else shifts.
- [x] Step 4: commit.

## Task 4: Fix 4 — announce new-tab on the committee LinkedIn links
Files: modify `docs/src/pages/index.astro`
Consumes: nothing
Produces: an accessible name ending "(opens in a new tab)" on both committee anchors

- [x] Step 1: in the `committee.map(...)` anchor (`index.astro:367`,
      `<a class="cell cell--link" href={m.href} target="_blank" rel="noopener">`), add
      `aria-label={`${m.name}, LinkedIn profile (opens in a new tab)`}` to match the GitHub/Sponsor
      pattern in `src/components/Header.astro`.
- [x] Step 2: build, then from `docs/` run `node ../.github/scripts/check-docs-a11y.mjs` — passes.
- [x] Step 3: commit.

## Final verification (all tasks)
- [x] From `docs/`: `npm run build` exits 0.
- [x] From `docs/`: run all five — `check-docs-links.mjs`, `check-docs-targets.mjs`,
      `check-docs-width.mjs`, `check-docs-a11y.mjs`, `check-docs-facts.mjs` — all pass.
- [x] Fix 1 grep gate clean (Task 1 Step 7).
