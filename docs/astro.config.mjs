// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import remarkDirective from 'remark-directive';
import { remarkCallouts } from './src/plugins/remark-callouts.mjs';
import { remarkChangelog } from './src/plugins/remark-changelog.mjs';
import { rehypeCodeFrame } from './src/plugins/rehype-code-frame.mjs';
import { rehypeTableWrap } from './src/plugins/rehype-table-wrap.mjs';

// Hosting is not settled yet. Both values are env-overridable so the same build
// works for any hosting target without editing this file.
//
// The canonical path is lowercase `/slashforge`. `/SlashForge` redirects to it
// — URL paths are case-sensitive, so serving both would be duplicate content.
// `site` feeds canonical URLs and the sitemap, so it must be the public origin
// the docs are actually served from — not the Vercel deployment URL, which is
// only ever reached through a rewrite from the apex domain.
const site = process.env.DOCS_SITE ?? 'https://www.rajdeepratan.com';
const base = process.env.DOCS_BASE_PATH ?? '/slashforge';

export default defineConfig({
  site,
  base,

  // Every URL this site has previously served that no longer exists, pointed at
  // where its content went. The site is live at www.rajdeepratan.com/slashforge,
  // so these are real published URLs — a rename without a redirect is a 404 for
  // anyone holding a link.
  //
  // Astro applies `base` to the source route (it decides where the file is
  // emitted) but writes the destination into the meta refresh verbatim, so the
  // target has to carry `base` itself.
  redirects: {
    // Three migration guides merged into one page.
    '/guides/migrating-to-v4/': `${base}/reference/migrating/`,
    '/guides/migrating-to-v3/': `${base}/reference/migrating/`,
    '/guides/migrating-from-claude-setup-kit/': `${base}/reference/migrating/`,
    // Merged page then moved from guides/ to reference/, to match its group.
    '/guides/migrating/': `${base}/reference/migrating/`,
    // Retitled: the page is now as much about plan mode as about /init.
    '/guides/vs-init/': `${base}/guides/plan-mode-and-init/`,
    // Retitled in v4.2.0: superpowers stopped being a preflight gate, and the
    // page became the documentation for the skills SlashForge ships itself.
    '/guides/superpowers/': `${base}/guides/skills/`,
  },

  // Emit into dist/<base>/ so the built paths match the served URLs exactly.
  // Astro's `base` only rewrites URLs inside the HTML — it does not nest the
  // output — so on a host that serves dist/ at the domain root (Vercel), every
  // /slashforge/... URL would 404. Nesting outDir removes the need for a
  // rewrite rule, and works the same on any static host.
  outDir: `./dist${base}`,

  integrations: [sitemap()],

  vite: {
    build: {
      // Astro's CSS minifier rewrites `(max-width: 640px)` into the Level 4
      // range syntax `(width <= 640px)`, which Safari only understands from
      // 16.4. On an older iPhone every media query in the stylesheet would be
      // dropped — the site would render with no responsive rules whatsoever.
      // Pinning the target keeps the classic syntax in the output.
      cssTarget: ['safari13', 'chrome80', 'firefox78', 'edge88'],
    },
  },

  markdown: {
    // Shiki, built into Astro. Expressive Code went with Starlight; the design
    // does not ask for tab bars or line highlighting, so plain Shiki plus the
    // frame plugin below covers it.
    shikiConfig: {
      themes: { light: 'github-light', dark: 'github-dark' },
      wrap: false,
    },
    // remark-directive parses the `:::note` syntax; remarkCallouts turns it
    // into the design's callout markup. Order matters — the parser has to run
    // first or there are no directive nodes to transform.
    remarkPlugins: [remarkDirective, remarkCallouts, remarkChangelog],
    rehypePlugins: [rehypeCodeFrame, rehypeTableWrap],
  },
});
