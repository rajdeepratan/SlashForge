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
      /** Opt a page out of the search index. Nothing uses it yet. */
      noindex: z.boolean().optional(),
    }),
  }),
};
