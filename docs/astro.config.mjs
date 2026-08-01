// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import lucode from 'lucode-starlight';

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

  // Emit into dist/<base>/ so the built paths match the served URLs exactly.
  // Astro's `base` only rewrites URLs inside the HTML — it does not nest the
  // output — so on a host that serves dist/ at the domain root (Vercel), every
  // /slashforge/... URL would 404. Nesting outDir removes the need for a
  // rewrite rule, and works the same on any static host.
  outDir: `./dist${base}`,

  integrations: [
    starlight({
      title: 'SlashForge',
      description:
        'Workflow slash commands for AI coding agents — /slashforge:setup, /slashforge:code, /slashforge:investigate.',
      logo: {
        // The lockup draws its wordmark in Ink, which disappears on a dark
        // background — so ship both variants rather than one.
        light: './src/assets/lockup-light.svg',
        dark: './src/assets/lockup-dark.svg',
        alt: 'SlashForge',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      head: [
        {
          // Opens the header's external links (GitHub, npm, Sponsor, Buy me a
          // coffee) in a new tab. Done here rather than in config because the
          // theme renders social icons through its own component and only
          // spreads `attrs` on some nav links, so neither is reachable.
          // Re-runs on astro:page-load for client-side navigations.
          tag: 'script',
          content: `(function(){function m(){document.querySelectorAll('header a[href^="http"]').forEach(function(a){if(a.hostname&&a.hostname!==location.hostname){a.target='_blank';a.rel=(a.rel?a.rel+' ':'')+'noopener';}});}document.addEventListener('DOMContentLoaded',m);document.addEventListener('astro:page-load',m);m();})();`,
        },
        // Starlight sets twitter:card to summary_large_image but does not emit
        // an image, so shared links rendered as a blank card. Uses the same
        // 1280x640 asset as the GitHub social preview.
        {
          tag: 'meta',
          attrs: { property: 'og:image', content: `${site}${base}/og.png` },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:width', content: '1280' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:height', content: '640' },
        },
        {
          tag: 'meta',
          attrs: { property: 'og:image:alt', content: 'SlashForge' },
        },
        {
          tag: 'meta',
          attrs: { name: 'twitter:image', content: `${site}${base}/og.png` },
        },
      ],
      customCss: ['./src/styles/theme.css'],
      editLink: {
        baseUrl: 'https://github.com/rajdeepratan/SlashForge/edit/main/docs',
      },
      lastUpdated: true,
      plugins: [
        lucode({
          navLinks: [
            { label: 'Docs', link: '/guides/introduction/' },
            { label: 'Commands', link: '/commands/slashforge-setup/' },
          ],
        }),
      ],
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/rajdeepratan/SlashForge',
        },
        {
          icon: 'npm',
          label: 'npm',
          href: 'https://www.npmjs.com/package/slashforge',
        },
        {
          // GitHub Sponsors' own mark is a heart. Starlight ships no
          // Buy Me a Coffee icon, so that link stays on the repo and README
          // rather than being given a misleading stand-in here.
          icon: 'heart',
          label: 'Sponsor',
          href: 'https://github.com/sponsors/rajdeepratan',
        },
        {
          // Starlight has no coffee icon, and this list only accepts built-in
          // names — so 'heart' is a carrier that theme.css masks over with the
          // Buy Me a Coffee logo, keyed on the href. Without the CSS this
          // degrades to a second heart rather than a broken icon.
          icon: 'heart',
          label: 'Buy me a coffee',
          href: 'https://buymeacoffee.com/rajdeepratan',
        },
      ],
      sidebar: [
        // Order follows a new user's path: what it is, how to install it, the
        // commands themselves, then optional extras. Migration guides are last
        // — they only matter to people who are already users.
        {
          label: 'Guides',
          items: [
            { label: 'Introduction', slug: 'guides/introduction' },
            { label: 'Installation', slug: 'guides/installation' },
          ],
        },
        {
          label: 'Commands',
          items: [
            { label: '/slashforge:setup', slug: 'commands/slashforge-setup' },
            { label: '/slashforge:code', slug: 'commands/slashforge-code' },
            { label: '/slashforge:investigate', slug: 'commands/slashforge-investigate' },
          ],
        },
        {
          label: 'Integrations',
          items: [
            { label: 'Superpowers preflight', slug: 'guides/superpowers' },
            { label: 'Graphify', slug: 'guides/graphify' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: '/slashforge:setup vs /init', slug: 'guides/vs-init' },
          ],
        },
        {
          label: 'Migrating',
          items: [
            { label: 'From claude-setup-kit', slug: 'guides/migrating-from-claude-setup-kit' },
            { label: 'v2 to v3', slug: 'guides/migrating-to-v3' },
            { label: 'v3 to v4', slug: 'guides/migrating-to-v4' },
          ],
        },
        // Generated from /CHANGELOG.md by scripts/sync-changelog.mjs.
        { label: 'Changelog', slug: 'changelog' },
      ],
    }),
  ],
});
