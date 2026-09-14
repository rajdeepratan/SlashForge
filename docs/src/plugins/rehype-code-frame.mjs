import { visit } from 'unist-util-visit';
import { TARGETS, DEFAULT_TARGET } from '../targets.mjs';

const TARGET_LABELS = { claude: 'Claude', cursor: 'Cursor', codex: 'Codex' };

/**
 * The per-target tab strip, which takes the bar's left slot on a block that
 * contains switchable command names. Every other block keeps its language
 * label. rehype-command-names.mjs sets the data-has-cmd flag this reads.
 */
function targetTablist() {
  return {
    type: 'element',
    tagName: 'div',
    properties: { class: 'code__tabs', role: 'tablist', 'aria-label': 'Coding agent' },
    children: TARGETS.map((t) => ({
      type: 'element',
      tagName: 'button',
      properties: {
        type: 'button',
        role: 'tab',
        'data-target-opt': t,
        'aria-selected': String(t === DEFAULT_TARGET),
      },
      children: [{ type: 'text', value: TARGET_LABELS[t] }],
    })),
  };
}

/**
 * Wraps every code block in the design's labelled frame.
 *
 * The reference draws code as a bordered box with a bar across the top
 * carrying the language on the left and a Copy control on the right:
 *
 *   <div class="code">
 *     <div class="code__bar"><span>bash</span><button …>Copy</button></div>
 *     <pre>…</pre>
 *   </div>
 *
 * Expressive Code used to provide this and went with Starlight. Shiki (built
 * into Astro) only emits the `<pre>`, so the frame is added here.
 *
 * The language label falls back to "code" for a fenced block with no language,
 * rather than rendering an empty bar.
 */
export function rehypeCodeFrame() {
  return (tree) => {
    visit(tree, 'element', (node, index, parent) => {
      if (node.tagName !== 'pre' || !parent || index === null) return;
      // Already wrapped — visit() walks what we insert.
      if (parent.type === 'element' && parent.properties?.class === 'code') return;

      const code = node.children?.find((c) => c.tagName === 'code');
      const fromClass = (code?.properties?.className ?? [])
        .map(String)
        .find((c) => c.startsWith('language-'));
      const lang = node.properties?.dataLanguage ?? fromClass?.slice('language-'.length) ?? 'code';

      parent.children[index] = {
        type: 'element',
        tagName: 'div',
        properties: { class: 'code' },
        children: [
          {
            type: 'element',
            tagName: 'div',
            properties: { class: 'code__bar' },
            children: [
              node.properties?.['data-has-cmd'] !== undefined
                ? targetTablist()
                : { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: String(lang) }] },
              {
                type: 'element',
                tagName: 'button',
                properties: { type: 'button', class: 'code__copy', 'data-copy': true },
                children: [{ type: 'text', value: 'Copy' }],
              },
            ],
          },
          node,
        ],
      };
    });
  };
}
