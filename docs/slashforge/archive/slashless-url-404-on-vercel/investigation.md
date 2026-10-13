# Investigation — slashless doc URLs 404 on Vercel

**Summary:** Confirmed. Every nested doc page 404s at its extensionless slashless URL because the slashless rewrite switched Astro to `build.format: 'file'` (named `*.html` files), and this Vercel project does not have Clean URLs enabled, so only the `.html` path resolves while every link and canonical now points to the extensionless path.

## Reproduction

Against the live production domain:

1. `curl -I https://www.rajdeepratan.com/slashforge/guides/introduction` → **404 NOT_FOUND** (no redirect)
2. `curl -I https://www.rajdeepratan.com/slashforge/guides/introduction/` → **308** redirect to `…/introduction` (which then 404s — a redirect into a dead end)
3. `curl -I https://www.rajdeepratan.com/slashforge/guides/introduction.html` → **200 OK**
4. `curl -I https://www.rajdeepratan.com/slashforge` (landing) → **200 OK**
5. `curl -I https://www.rajdeepratan.com/slashforge/` → **308** redirect to `/slashforge` → 200

So: the `.html` file serves, the extensionless URL 404s, the trailing-slash URL redirects *into* the 404, and only the landing page escapes.

## Root cause

Two facts combine:

**1. The production domain is serving this unmerged branch.** The live `…/introduction.html` contains branch-only markup added on `docs/homepage-copy-node-and-highlighter` (`agent-tabs`, `data-target-opt`, "Coding agent"). `main` is 13 commits behind and still uses Astro defaults (`build.format: 'directory'`), so production is **not** serving `main`. The slashless branch is what is live — before PR #114 merged.

**2. `build.format: 'file'` + Vercel Clean URLs off = extensionless nested URLs 404.** On this branch `docs/astro.config.mjs:30-31` sets `trailingSlash: 'never'` and `build: { format: 'file' }`. That emits `dist/slashforge/guides/introduction.html` — a named file, with **no** `guides/introduction/index.html` directory. Vercel serves that file only at `/guides/introduction.html`. It would also serve it at the extensionless `/guides/introduction` **only if the project's Clean URLs setting (`cleanUrls: true`) were enabled** — and it is not: the probe shows `.html` returns 200 *without* redirecting to the clean URL, and the clean URL 404s. That is the definitive Clean-URLs-off signature.

Meanwhile the whole site now points at the extensionless path: built internal links are `href="/slashforge/guides/introduction"` and the canonical is `https://www.rajdeepratan.com/slashforge/guides/introduction` (confirmed in `dist/slashforge/guides/introduction.html`). Every nav click, every canonical, every sitemap entry and every pagefind result therefore resolves to a URL Vercel 404s.

**Why the landing page survives:** the landing is emitted as `dist/slashforge/index.html`. Vercel resolves a directory request (`/slashforge`) to its `index.html` natively, independent of Clean URLs. Nested pages are named files, not directory indexes, so they get no such fallback. This is also why `main` worked before the rewrite: directory format produced `guides/introduction/index.html`, which Vercel served at the extensionless URL via that same directory-index resolution.

The slashless rewrite was intended to make links, canonical and final URL agree (commit `f227ad4`). On this Vercel project it does the opposite: it moved every nested page onto a URL shape that only resolves with a Vercel setting that is not on.

## Affected scope

- **Versions:** branch `docs/homepage-copy-node-and-highlighter` (PR #114), introduced by `f227ad4` ("serve slashless URLs"). Not present on `main`.
- **Environments:** the live Vercel deployment serving `www.rajdeepratan.com/slashforge`. Reproducible with `npm run build` locally (output shape is identical; the 404 itself is Vercel-serving behaviour, not reproducible with `astro preview`, which resolves `.html` differently).
- **Users:** everyone. Every nested documentation page is unreachable from any in-site link, from search, or from a shared/canonical URL. Only the landing page loads, and every link off it 404s.

## Suggested next step

Two fixes resolve it; pick one deliberately.

- **Option A — enable Clean URLs (smallest change, keeps the slashless intent).** Add `docs/vercel.json` with `{ "cleanUrls": true, "trailingSlash": false }` (if the Vercel project root is `docs/`), or toggle "Clean URLs" on in the Vercel project settings. Vercel then serves `guides/introduction.html` at `/guides/introduction` and redirects the `.html` form to the clean URL. This matches the current build output and the existing extensionless links/canonical, so nothing else changes.
- **Option B — revert to directory format (repo-only, no Vercel setting needed).** Drop `build: { format: 'file' }` (and reconsider `trailingSlash`) so nested pages emit as `guides/introduction/index.html`. Vercel serves those at the extensionless URL via directory indexing with no Clean-URLs dependency — the same mechanism that already keeps the landing page working. This is the configuration `main` used and is the most robust against Vercel settings drift, but it reopens the original trailing-slash question that the rewrite set out to solve.

Either way, also confirm **why the production domain is serving an unmerged branch** — the production branch in Vercel may be pointed at `docs/homepage-copy-node-and-highlighter`, or this branch was manually promoted. If production should track `main`, that mapping needs fixing too, independent of the 404.

Recommended: Option A as the direct fix for the current build, verified post-deploy with the same curl probes above (all five should be 200 except the trailing-slash 308, which should land on a 200).
