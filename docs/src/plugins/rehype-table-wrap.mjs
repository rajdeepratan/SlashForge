import { visit } from 'unist-util-visit';

/**
 * Wraps every table in a horizontally scrollable container.
 *
 * The design sets `td:first-child` in mono with `white-space: nowrap`, because
 * that column is almost always a path or an identifier and reads badly broken
 * across lines. On a phone that is unsurvivable on its own: a cell like
 * `~/.claude/setup/slashforge/` is roughly 235px, which alone nearly fills a
 * 375px screen once the gutters are taken off — the table would push the whole
 * page sideways.
 *
 * Scrolling the table rather than the document keeps the nowrap rule intact and
 * confines the overflow to the one element that needs it.
 */
export function rehypeTableWrap() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === null) return;
      if (parent.type === 'element' && parent.properties?.class === 'table-wrap') return;

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'table-wrap' },
        children: [node],
      };
    });
  };
}
