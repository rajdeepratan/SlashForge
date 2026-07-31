// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import lucode from 'lucode-starlight';

// Hosting is not settled yet. Both values are env-overridable so the same build
// works for GitHub Pages (rajdeepratan.github.io/SlashForge) and for a proxied
// custom domain (rajdeepratan.com/SlashForge) without editing this file.
const site = process.env.DOCS_SITE ?? 'https://rajdeepratan.github.io';
const base = process.env.DOCS_BASE_PATH ?? '/SlashForge';

export default defineConfig({
  site,
  base,

  integrations: [
    starlight({
      title: 'SlashForge',
      description:
        'Workflow slash commands for AI coding agents — /forge:setup, /forge:code, /forge:investigate.',
      logo: {
        // The lockup draws its wordmark in Ink, which disappears on a dark
        // background — so ship both variants rather than one.
        light: './src/assets/lockup-light.svg',
        dark: './src/assets/lockup-dark.svg',
        alt: 'SlashForge',
        replacesTitle: true,
      },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/theme.css'],
      editLink: {
        baseUrl: 'https://github.com/rajdeepratan/SlashForge/edit/main/docs',
      },
      lastUpdated: true,
      plugins: [
        lucode({
          navLinks: [
            { label: 'Docs', link: '/guides/introduction/' },
            { label: 'Commands', link: '/commands/forge-setup/' },
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
            { label: '/forge:setup', slug: 'commands/forge-setup' },
            { label: '/forge:code', slug: 'commands/forge-code' },
            { label: '/forge:investigate', slug: 'commands/forge-investigate' },
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
            { label: '/forge:setup vs /init', slug: 'guides/vs-init' },
          ],
        },
        {
          label: 'Migrating',
          items: [
            { label: 'From claude-setup-kit', slug: 'guides/migrating-from-claude-setup-kit' },
            { label: 'v2 to v3', slug: 'guides/migrating-to-v3' },
          ],
        },
        // Generated from /CHANGELOG.md by scripts/sync-changelog.mjs.
        { label: 'Changelog', slug: 'changelog' },
      ],
    }),
  ],
});
