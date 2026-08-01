# SlashForge docs site

[Astro](https://astro.build) + [Starlight](https://starlight.astro.build), themed
with [lucode-starlight](https://github.com/lucas-labs/lucode-starlight-theme).

## Running it

```bash
cd docs
npm install
npm run dev       # http://localhost:4321/slashforge/
```

**Note the `/slashforge` path** — the site is built with a base path, so plain
`localhost:4321` will 404.

```bash
npm run build     # production build into dist/
npm run preview   # serve dist/ — what actually deploys
```

Judge layout and styling against `npm run preview`, not `npm run dev`. Dev
injects CSS through Vite and can render unstyled on a cold first paint.

## Base path and hosting

`site` and `base` are environment-overridable, so the same source builds for
whichever hosting target is chosen:

```bash
DOCS_SITE=https://rajdeepratan.com DOCS_BASE_PATH=/slashforge npm run build
```

| Variable | Default |
| --- | --- |
| `DOCS_SITE` | `https://rajdeepratan.github.io` |
| `DOCS_BASE_PATH` | `/slashforge` |

Because the base path is configurable, **write internal links as relative**
(`../installation/`), never as `/slashforge/...`. Hardcoding the base breaks
every cross-link the moment hosting changes.

## Adding a page

1. Create the markdown under `src/content/docs/`
2. Add it to the `sidebar` in `astro.config.mjs` — an entry whose slug does not
   resolve fails the build
3. `npm run build` to confirm

## Structure

```
src/
├─ content/docs/
│  ├─ index.mdx          landing page (splash template)
│  ├─ guides/            introduction, installation, migration, integrations
│  └─ commands/          one page per command
├─ content.config.ts     Starlight collection — required, build fails without it
├─ styles/theme.css      brand palette over the theme
└─ assets/               logo lockups (light + dark)
```

## Branding

Palette and rules live in [`../assets/README.md`](../assets/README.md). The short
version: Ember `#EC3013`, Ink `#201E1D`, and the ember is never recoloured.

## Not shipped to npm

`docs/` is outside the `files` allowlist in the root `package.json`, so none of
this reaches the published package.

## Changelog page

`src/content/docs/changelog.md` is **generated** from the repo root
`CHANGELOG.md` by `scripts/sync-changelog.mjs`, which runs automatically via the
`predev` and `prebuild` npm scripts.

Do not edit it — edit `/CHANGELOG.md`. The generated file is gitignored, so
there is never a second copy in git to drift out of sync.

## Hosting on Vercel

Deployed as its own Vercel project with **Root Directory = `docs`**. Build
settings come from `vercel.json`.

### Why `vercel.json` has a rewrite

Astro's `base: '/slashforge'` rewrites the URLs *inside* the generated HTML, but
it does **not** nest the build output — `dist/` contains `index.html`,
`guides/`, `commands/` at its top level, with no `slashforge/` directory.

GitHub Pages serves a project repo under `/<repo>/` itself, so `base` alone
lines up there. Vercel serves `dist/` at the domain root, so every
`/slashforge/...` URL in the HTML would hit nothing and render Starlight's 404.
The rewrite maps the prefix back onto the filesystem:

```json
{ "source": "/slashforge/:path*", "destination": "/:path*" }
```

Remove that rewrite only if you also remove `base`, and vice versa — they are a
pair.

### Serving it from rajdeepratan.com/slashforge

The apex domain is a separate Vercel project (the Next.js personal site), so it
proxies through with a rewrite in **that** repo's `vercel.json`:

```json
{
  "rewrites": [
    {
      "source": "/slashforge/:path*",
      "destination": "https://slash-forge.vercel.app/slashforge/:path*"
    }
  ]
}
```

The prefix is preserved on both hops; the docs project strips it internally.

### Both casings

`/slashforge` is canonical. `/SlashForge` **301s** to it — URL paths are
case-sensitive, so serving both would be duplicate content and split any SEO
value between two URLs.

The redirect lives in `docs/vercel.json` so it also works on the bare deployment
URL. On the apex domain, add the same redirect to the personal site's
`vercel.json` so the bounce happens on `rajdeepratan.com` rather than exposing
the Vercel deployment URL to the browser.

### Why `outDir` is nested

The build emits into `dist/<base>/` (`outDir: './dist' + base`), so
`/slashforge/...` exists **on disk** and needs no host rewrite rule.

Astro's `base` only rewrites URLs inside the generated HTML — it does not nest
the output. GitHub Pages happens to serve a project repo under `/<repo>/`, which
masks this; any host serving `dist/` at the domain root (Vercel, Netlify, S3,
nginx) would 404 on every URL instead.

Nesting `outDir` makes the layout match the URLs on every host. `postbuild` then
writes a small `dist/index.html` redirecting `/` to the base path, since the
nesting leaves the output root without an index.

Change `base` and both follow automatically — they read the same value.

### Canonical host

`site` is `https://www.rajdeepratan.com` — the **www** host, not the apex. The
apex 307s to www, so canonical URLs and the sitemap must name the host that
actually serves, or every canonical points at a redirect.
