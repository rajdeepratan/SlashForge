import { visit } from 'unist-util-visit';

/**
 * Renders `==highlighted==` as `<mark>`.
 *
 * Markdown has no highlight syntax, and the docs are long enough that a reader
 * skimming for the one sentence that matters has nothing to aim at. Bold is
 * already spoken for — it marks defined terms — so the highlight is its own
 * mark, styled as an ember wash in `.main mark`.
 *
 * The pair spans sibling nodes, so a highlight may open on inline code, close
 * on it, or contain a link:
 *
 *   ==`--project` vendors the guides into your repo==
 *
 * A marker only counts where a highlight could plausibly start or end: an
 * opener needs a non-space after it, a closer a non-space before it. That is
 * what keeps `x == y` in prose from opening one. At a node boundary the
 * neighbouring node supplies that non-space — `==` at the end of a text node is
 * an opener when something follows it, and `==` at the start of one is a closer
 * when the highlight already holds content. An unpaired marker is left exactly
 * as it was written.
 *
 * Runs on paragraphs, list items and table cells — not headings, where a wash
 * behind display type reads as a highlighter accident rather than emphasis.
 */

const HOSTS = new Set(['paragraph', 'listItem', 'tableCell', 'blockquote', 'emphasis', 'strong']);

const text = (value) => ({ type: 'text', value });
const html = (value) => ({ type: 'html', value });
const empty = (node) => node.type === 'text' && node.value === '';

function transform(children) {
  const out = [];
  /** Nodes collected since the opening `==`, or null when outside a highlight. */
  let held = null;
  let changed = false;

  const emit = (node) => (held ? held.push(node) : out.push(node));

  for (const child of children) {
    if (child.type !== 'text') {
      emit(child);
      continue;
    }

    // Text that belongs to whichever side of the marker we are currently on.
    let buffered = '';
    let rest = child.value;

    while (rest) {
      const at = rest.indexOf('==');
      if (at === -1) break;

      const before = rest.slice(0, at);
      const after = rest.slice(at + 2);
      const valid = held
        ? before.length
          ? !/\s$/.test(before)
          : held.some((n) => !empty(n))
        : after.length
          ? !/^\s/.test(after)
          : true;

      // Not a marker — a bare `==` in prose. Put it back and keep scanning.
      if (!valid) {
        buffered += `${before}==`;
        rest = after;
        continue;
      }

      if (held) {
        held.push(text(buffered + before));
        out.push(html('<mark>'), ...held, html('</mark>'));
        held = null;
        changed = true;
      } else {
        out.push(text(buffered + before));
        held = [];
      }

      buffered = '';
      rest = after;
    }

    if (buffered + rest) emit(text(buffered + rest));
  }

  // Unpaired opener: put the text back the way the author wrote it.
  if (held) out.push(text('=='), ...held);

  return changed ? out.filter((node) => !empty(node)) : null;
}

export function remarkMark() {
  return (tree) => {
    visit(tree, (node) => {
      if (!HOSTS.has(node.type) || !node.children) return;
      const next = transform(node.children);
      if (next) node.children = next;
    });
  };
}
