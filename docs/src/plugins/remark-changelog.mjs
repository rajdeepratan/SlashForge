/**
 * Renders the changelog as the design's release blocks.
 *
 * The source is `/CHANGELOG.md` in Keep a Changelog format — `## [4.0.1] -
 * 2026-08-01`, then `### Added`, then bullets. The design wants each release as
 * a titled block with a version, a date, a severity tag, and one row per entry
 * labelled with its kind:
 *
 *   <div class="release">
 *     <div class="release__head">
 *       <h2 id="v4-0-1">4.0.1</h2><span class="release__date">…</span>
 *       <span class="release__tag is-breaking">Breaking</span>
 *     </div>
 *     <div class="release__row"><span class="release__kind">Added</span><div>…</div></div>
 *   </div>
 *
 * The version stays a real `<h2>` inside the head rather than becoming a span,
 * because Astro extracts the on-this-page rail from heading nodes — turn it
 * into a div and the changelog silently loses its rail. Keeping the date and
 * tag as siblings (not heading children) also keeps the rail label as a bare
 * version number instead of "4.0.1 2026-08-01 Patch".
 */

const HEADING = /^\[?([^\]\s]+)\]?(?:\s*[-–]\s*(.+))?$/;

/** Plain text of a node, for matching — not for rendering. */
function text(node) {
  if (node.value) return node.value;
  return (node.children ?? []).map(text).join('');
}

/**
 * Breaking beats semver: a release that says BREAKING is breaking regardless of
 * how the number moved. Otherwise the number decides.
 */
function tagFor(version, body) {
  if (/BREAKING/i.test(body)) return { label: 'Breaking', breaking: true };
  const [major, minor, patch] = version.split('.').map(Number);
  if (Number.isNaN(major)) return { label: 'Release', breaking: false };
  if (patch > 0) return { label: 'Patch', breaking: false };
  if (minor > 0) return { label: 'Minor', breaking: false };
  return { label: 'Major', breaking: true };
}

export function remarkChangelog() {
  return (tree, file) => {
    if (!/changelog\.md$/.test(file.history[0] ?? '')) return;

    const out = [];
    let i = 0;
    let isFirst = true;

    // Anything before the first release heading (the intro paragraph) passes
    // through untouched.
    while (i < tree.children.length && !(tree.children[i].type === 'heading' && tree.children[i].depth === 2)) {
      out.push(tree.children[i++]);
    }

    while (i < tree.children.length) {
      const heading = tree.children[i++];
      const match = HEADING.exec(text(heading).trim());
      const version = match?.[1] ?? text(heading).trim();
      const date = match?.[2]?.trim();

      // Collect everything up to the next release.
      const body = [];
      while (i < tree.children.length && !(tree.children[i].type === 'heading' && tree.children[i].depth === 2)) {
        body.push(tree.children[i++]);
      }

      // An empty `## [Unreleased]` is scaffolding, not a release.
      if (!body.length) continue;

      const tag = tagFor(version, body.map(text).join(' '));

      // The version heading keeps its node identity so the rail still sees it.
      heading.children = [{ type: 'text', value: version }];

      const head = {
        type: 'paragraph',
        data: { hName: 'div', hProperties: { class: 'release__head' } },
        children: [heading],
      };
      if (date) {
        head.children.push({
          type: 'paragraph',
          data: { hName: 'span', hProperties: { class: 'release__date' } },
          children: [{ type: 'text', value: date }],
        });
      }
      head.children.push({
        type: 'paragraph',
        data: {
          hName: 'span',
          hProperties: { class: `release__tag${tag.breaking ? ' is-breaking' : ''}` },
        },
        children: [{ type: 'text', value: tag.label }],
      });

      // `### Kind` followed by a list becomes one labelled row per bullet.
      const rows = [];
      let kind = '';
      for (const node of body) {
        if (node.type === 'heading' && node.depth === 3) {
          kind = text(node).trim();
          continue;
        }
        if (node.type === 'list') {
          for (const item of node.children) {
            rows.push({
              type: 'paragraph',
              data: { hName: 'div', hProperties: { class: 'release__row' } },
              children: [
                {
                  type: 'paragraph',
                  data: { hName: 'span', hProperties: { class: 'release__kind' } },
                  children: [{ type: 'text', value: kind }],
                },
                {
                  type: 'paragraph',
                  data: { hName: 'div', hProperties: { class: 'release__body' } },
                  // A bullet's content is wrapped in a paragraph; unwrap the
                  // first one so a one-line entry does not gain a block margin,
                  // but keep richer content (tables, extra paragraphs) intact.
                  children: item.children.flatMap((c, n) =>
                    n === 0 && c.type === 'paragraph' ? c.children : [c]
                  ),
                },
              ],
            });
          }
          continue;
        }
        // Anything else (a stray paragraph) rides along under the last kind.
        rows.push(node);
      }

      out.push({
        type: 'paragraph',
        data: {
          hName: 'div',
          hProperties: { class: `release${isFirst ? ' is-first' : ''}` },
        },
        children: [head, ...rows],
      });
      isFirst = false;
    }

    tree.children = out;
  };
}
