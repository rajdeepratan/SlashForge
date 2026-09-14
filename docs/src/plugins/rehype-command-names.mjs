import { visit } from 'unist-util-visit';
import { COMMAND_RE, commandForm, DEFAULT_TARGET } from '../targets.mjs';

/**
 * Wraps every switchable command name in a span the client script can rewrite.
 *
 *   /slashforge:code  ->  <span data-cmd="code">/slashforge:code</span>
 *
 * The span ships already rendered in the Claude Code form, so the page is
 * correct before any script runs and stays correct if scripts never run. Only
 * the text swaps later; the markup does not change.
 *
 * One pass splits matching text nodes, a second flags the enclosing <pre>.
 * The text pass covers fenced blocks and inline <code> alike, because both are
 * plain text nodes by the time rehype runs — for the plaintext fences this
 * site uses, Shiki emits one text node per line.
 */
export function rehypeCommandNames() {
  return (tree, file) => {
    // The changelog is generated from /CHANGELOG.md and is a historical
    // record. Rewriting a v4.0.0 entry would misstate what actually shipped.
    const path = String(file?.path ?? file?.history?.[0] ?? '');
    if (path.endsWith('changelog.md')) return;

    visit(tree, 'text', (node, index, parent) => {
      if (!parent || index === null) return;
      COMMAND_RE.lastIndex = 0;
      if (!COMMAND_RE.test(node.value)) return;

      const out = [];
      let last = 0;
      let m;
      COMMAND_RE.lastIndex = 0;
      while ((m = COMMAND_RE.exec(node.value)) !== null) {
        if (m.index > last) {
          out.push({ type: 'text', value: node.value.slice(last, m.index) });
        }
        out.push({
          type: 'element',
          tagName: 'span',
          properties: { 'data-cmd': m[1] },
          children: [{ type: 'text', value: commandForm(m[1], DEFAULT_TARGET) }],
        });
        last = m.index + m[0].length;
      }
      if (last < node.value.length) {
        out.push({ type: 'text', value: node.value.slice(last) });
      }

      parent.children.splice(index, 1, ...out);
      // Continue past what was inserted, or visit() walks into the new spans.
      return index + out.length;
    });

    visit(tree, 'element', (node) => {
      if (node.tagName !== 'pre') return;
      let has = false;
      visit(node, 'element', (n) => {
        if (n.properties && n.properties['data-cmd'] !== undefined) has = true;
      });
      if (has) node.properties = { ...(node.properties ?? {}), 'data-has-cmd': '' };
    });
  };
}
