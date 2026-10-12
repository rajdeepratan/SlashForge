import { visit } from 'unist-util-visit';

/**
 * Wraps every table in a horizontally scrollable container and labels each body
 * cell with its column header.
 *
 * The first column is set in mono (`td:first-child`) because it is almost
 * always a path or identifier. A long one like `~/.agents/setup/slashforge/`
 * is wide enough that on a phone the table would push the whole page sideways;
 * `.table-wrap` confines any overflow to the one element.
 *
 * On narrow screens the CSS stacks each table as label-over-value instead of
 * scrolling (see the `max-width: 640px` block in site.css). That needs every
 * body cell to know its column's header, so we copy the header text onto each
 * `td` as `data-label`; `td::before` renders it. Markdown gives us no per-cell
 * label, so it is derived here from the header row.
 */

function textOf(node) {
  if (!node) return '';
  if (node.type === 'text') return node.value;
  return (node.children || []).map(textOf).join('');
}

function elementChild(node, tagName) {
  return (node.children || []).find((c) => c.type === 'element' && c.tagName === tagName);
}

function elementChildren(node, tagName) {
  return (node?.children || []).filter((c) => c.type === 'element' && c.tagName === tagName);
}

function labelCells(table) {
  const head = elementChild(table, 'thead');
  const body = elementChild(table, 'tbody');
  const headerRow = head && elementChildren(head, 'tr')[0];
  if (!headerRow || !body) return;

  const labels = elementChildren(headerRow, 'th').map((th) => textOf(th).trim());
  for (const row of elementChildren(body, 'tr')) {
    elementChildren(row, 'td').forEach((td, i) => {
      if (!labels[i]) return;
      td.properties = td.properties || {};
      td.properties.dataLabel = labels[i];
    });
  }
}

export function rehypeTableWrap() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'table' || !parent || index === null) return;
      if (parent.type === 'element' && parent.properties?.class === 'table-wrap') return;

      labelCells(node);

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'table-wrap' },
        children: [node],
      };
    });
  };
}
