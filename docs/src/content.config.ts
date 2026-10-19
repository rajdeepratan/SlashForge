import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The docs collection.
 *
 * Previously this used Starlight's `docsLoader()` and `docsSchema()`. With
 * Starlight removed it is a plain glob collection — the frontmatter every page
 * already carries (`title`, `description`) is all the layout needs, so the
 * schema is deliberately small rather than a reimplementation of Starlight's.
 *
 * `index.mdx` is excluded: the home page is a route (`src/pages/index.astro`),
 * not a content entry, because it is bespoke markup rather than prose.
 */
export const collections = {
  docs: defineCollection({
    loader: glob({ pattern: ['**/*.md', '!index.*'], base: './src/content/docs' }),
    schema: z.object({
      title: z.string(),
      description: z.string().optional(),
      /**
       * Optional per-agent lede. When present, the page subtitle switches with
       * the header Agent picker (DocsLayout renders one per target); the single
       * `description` above stays the agent-neutral <meta> string. A partial map
       * is fine: a missing target falls back to `description`.
       */
      descriptions: z
        .object({ claude: z.string(), cursor: z.string(), codex: z.string() })
        .partial()
        .optional(),
      /**
       * Optional per-agent H1. When present, the page heading switches with the
       * target; the single `title` above stays the canonical <title> and routing
       * source. A partial map is fine: a missing target falls back to `title`.
       */
      titles: z
        .object({ claude: z.string(), cursor: z.string(), codex: z.string() })
        .partial()
        .optional(),
      /** Opt a page out of the search index. Nothing uses it yet. */
      noindex: z.boolean().optional(),
    }),
  }),
};
