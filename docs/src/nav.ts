/**
 * The sidebar, and the single source of reading order.
 *
 * This replaces Starlight's `sidebar` config. It drives three things at once —
 * the sidebar groups, the prev/next pager, and the search index's group labels
 * — so a page added here appears everywhere without a second edit.
 *
 * `slug` matches the content collection id, which is the file path under
 * `src/content/docs/` minus the extension. Order within a group is reading
 * order, and the flattened order across groups is what the pager walks.
 */

export type NavItem = { label: string; slug: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV: NavGroup[] = [
  // Order follows a new reader's path: what it is, the two objections that
  // block adoption, proof that it works, what it does to the machine, then
  // install. Reference and migration notes are last.
  {
    label: 'Start here',
    items: [
      { label: 'Introduction', slug: 'guides/introduction' },
      { label: 'Plan mode and /init', slug: 'guides/plan-mode-and-init' },
      { label: 'What a run looks like', slug: 'guides/example-run' },
      { label: 'What it does to your machine', slug: 'guides/trust' },
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
      { label: 'Troubleshooting', slug: 'reference/troubleshooting' },
      { label: 'CLI reference', slug: 'reference/cli' },
      { label: 'Migrating', slug: 'reference/migrating' },
      // Generated from /CHANGELOG.md by scripts/sync-changelog.mjs.
      { label: 'Changelog', slug: 'changelog' },
    ],
  },
];

/** Reading order across every group, for the prev/next pager. */
export const FLAT: (NavItem & { group: string })[] = NAV.flatMap((g) =>
  g.items.map((i) => ({ ...i, group: g.label }))
);

/** The group a slug belongs to — used for the page kicker. */
export function groupOf(slug: string): string {
  return FLAT.find((i) => i.slug === slug)?.group ?? '';
}

export type Neighbour = { label: string; href: string };

/**
 * Previous and next in reading order.
 *
 * The reading order is a line, not a loop, and it does not run off either end.
 * The prototype gives the first page a Previous of "Home" and wraps the last
 * page's Next back to the Introduction; both are dropped. The pager is for
 * moving through the sequence, so at the ends there is simply nothing to point
 * at — a cell naming a page outside the sequence, or one already read, is
 * noise rather than navigation.
 */
export function neighbours(
  slug: string,
  base: string
): { prev?: Neighbour; next?: Neighbour } {
  const link = (item: NavItem): Neighbour => ({
    label: item.label,
    href: `${base}/${item.slug}/`,
  });
  const i = FLAT.findIndex((x) => x.slug === slug);

  return {
    prev: i > 0 ? link(FLAT[i - 1]) : undefined,
    next: i >= 0 && i < FLAT.length - 1 ? link(FLAT[i + 1]) : undefined,
  };
}
