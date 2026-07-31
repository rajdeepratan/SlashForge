# SlashForge docs site

[Astro](https://astro.build) + [Starlight](https://starlight.astro.build), themed
with [lucode-starlight](https://github.com/lucas-labs/lucode-starlight-theme).

## Running it

```bash
cd docs
npm install
npm run dev       # http://localhost:4321/SlashForge/
```

**Note the `/SlashForge` path** — the site is built with a base path, so plain
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
DOCS_SITE=https://rajdeepratan.com DOCS_BASE_PATH=/SlashForge npm run build
```

| Variable | Default |
| --- | --- |
| `DOCS_SITE` | `https://rajdeepratan.github.io` |
| `DOCS_BASE_PATH` | `/SlashForge` |

Because the base path is configurable, **write internal links as relative**
(`../installation/`), never as `/SlashForge/...`. Hardcoding the base breaks
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
