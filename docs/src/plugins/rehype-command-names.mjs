import { visit } from 'unist-util-visit';
import {
  COMMAND_RE,
  commandForm,
  DEFAULT_TARGET,
  PATH_RE,
  pathKind,
  installPathFor,
} from '../targets.mjs';

/**
 * Wraps per-target text in spans the client script can rewrite.
 *
 *   /slashforge-code            -> <span data-cmd="code">/slashforge-code</span>
 *   ~/.claude/setup/slashforge/ -> <span data-path="guides">…</span>
 *
 * Spans ship already rendered in the Claude Code form, so the page is correct
 * before any script runs and stays correct if scripts never run. Only the text
 * swaps later; the markup does not change.
 *
 * The text passes cover fenced blocks and inline <code> alike, because both are
 * plain text nodes by the time rehype runs — for the plaintext fences this site
 * uses, Shiki emits one text node per line. A final pass flags any <pre> that
 * ended up containing a command, which is what tells the code frame to render
 * tabs instead of a language label.
 */

/**
 * Pages that deliberately show every target side by side, or record what used
 * to be true. Rewriting these would collapse the comparison in one case and
 * falsify history in the other.
 *
 *   changelog.md — generated from /CHANGELOG.md; a v4.0.0 entry has to keep the
 *                  spelling that actually shipped
 *   migrating.md — v2/v3/v4 tables, including paths that no longer exist at all
 *   cli.md       — the Targets table contrasts ~/.claude with ~/.agents, so
 *                  switching both columns would make them identical
 */
const VERBATIM = ['changelog.md', 'migrating.md', 'cli.md'];

export function rehypeCommandNames() {
  return (tree, file) => {
    const path = String(file?.path ?? file?.history?.[0] ?? '');
    if (VERBATIM.some((f) => path.endsWith(f))) return;

    /** Marks every match of `re` in a text node, wrapping it via `wrap`. */
    const markAll = (re, wrap) => (node, index, parent) => {
      if (!parent || index === null) return;
      re.lastIndex = 0;
      if (!re.test(node.value)) return;

      const out = [];
      let last = 0;
      let m;
      re.lastIndex = 0;
      while ((m = re.exec(node.value)) !== null) {
        if (m.index > last) {
          out.push({ type: 'text', value: node.value.slice(last, m.index) });
        }
        out.push(wrap(m));
        last = m.index + m[0].length;
      }
      if (last < node.value.length) {
        out.push({ type: 'text', value: node.value.slice(last) });
      }

      parent.children.splice(index, 1, ...out);
      // Continue past what was inserted, or visit() walks into the new spans.
      return index + out.length;
    };

    visit(
      tree,
      'text',
      markAll(COMMAND_RE, (m) => ({
        type: 'element',
        tagName: 'span',
        properties: { 'data-cmd': m[1] },
        children: [{ type: 'text', value: commandForm(m[1], DEFAULT_TARGET) }],
      }))
    );

    // Where an install lands differs per target, so a reader on Cursor is
    // otherwise told their files are somewhere they are not.
    visit(
      tree,
      'text',
      markAll(PATH_RE, (m) => {
        const kind = pathKind(m[0]);
        return {
          type: 'element',
          tagName: 'span',
          properties: { 'data-path': kind },
          children: [{ type: 'text', value: installPathFor(kind, DEFAULT_TARGET) }],
        };
      })
    );

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
