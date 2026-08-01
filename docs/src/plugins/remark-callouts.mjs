import { visit } from 'unist-util-visit';

/**
 * Renders `:::note` / `:::caution` / `:::tip` blocks as the design's callout.
 *
 * Starlight shipped this syntax via its own aside plugin. With Starlight gone
 * the directives would otherwise render as literal `:::note` text in the body,
 * so this reimplements just the part the content uses — and emits the
 * reference markup directly:
 *
 *   <div class="note">
 *     <div class="note__label">Note</div>
 *     <p>…</p>
 *   </div>
 *
 * The optional bracket label (`:::caution[Honest limit]`) becomes the label
 * block; without one the directive name is title-cased.
 */

const KNOWN = new Set(['note', 'tip', 'caution', 'danger', 'warning']);

/**
 * `:::steps` wrapping an ordered list becomes the design's numbered procedure:
 * hairlined cells inside one ruled frame, each numbered `01`, `02`, … in ember
 * mono.
 *
 *   :::steps
 *   1. Do the first thing.
 *   2. Then the second.
 *   :::
 *
 * The numbers are rendered rather than left to the list marker, because the
 * design sets them in a different face and colour than the step text — which
 * `::marker` cannot do for a two-digit zero-padded label.
 */
function toSteps(node) {
  const list = node.children.find((c) => c.type === 'list');
  if (!list) return false;

  node.data = { ...node.data, hName: 'div', hProperties: { class: 'steps' } };
  node.children = list.children.map((item, i) => ({
    type: 'paragraph',
    data: { hName: 'div' },
    children: [
      {
        type: 'strong',
        data: { hName: 'b' },
        children: [{ type: 'text', value: String(i + 1).padStart(2, '0') }],
      },
      {
        type: 'paragraph',
        data: { hName: 'span' },
        // A list item wraps its content in a paragraph; unwrap it so the step
        // text sits directly in the cell rather than in a nested block.
        children: item.children.flatMap((c) => (c.type === 'paragraph' ? c.children : [c])),
      },
    ],
  }));
  return true;
}

export function remarkCallouts() {
  return (tree, file) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective') return;

      if (node.name === 'steps') {
        if (toSteps(node)) return;
        file.message('":::steps" needs an ordered list inside it.', node);
        return;
      }

      if (!KNOWN.has(node.name)) {
        file.message(`Unknown callout ":::${node.name}" — rendered as a plain note.`, node);
      }

      // remark-directive parses `:::caution[Label]` into a leading paragraph
      // marked `directiveLabel`. Pull it out so it does not render as body copy.
      let label = node.name.charAt(0).toUpperCase() + node.name.slice(1);
      const first = node.children[0];
      if (first?.data?.directiveLabel && first.children?.length) {
        label = first.children.map((c) => c.value ?? '').join('');
        node.children.shift();
      }

      node.data = {
        ...node.data,
        hName: 'div',
        hProperties: { class: 'note' },
      };

      node.children.unshift({
        type: 'paragraph',
        data: { hName: 'div', hProperties: { class: 'note__label' } },
        children: [{ type: 'text', value: label }],
      });
    });
  };
}
