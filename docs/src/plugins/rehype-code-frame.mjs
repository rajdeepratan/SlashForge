import { visit } from 'unist-util-visit';

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
              { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: String(lang) }] },
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
