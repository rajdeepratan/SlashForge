import { visit } from 'unist-util-visit';
import { TARGETS } from '../targets.mjs';

/**
 * Renders `:::agent[claude]` / `:::agent[claude,codex]` as a block shown only
 * when that coding agent is the selected target.
 *
 * The docs already switch command spellings, example paths and the accent
 * colour off a single `data-target` on <html>. What they could not do was mark
 * a passage — a paragraph, a list, a whole table — as belonging to one agent,
 * so most pages were written as a side-by-side comparison of all three. This
 * directive supplies that: it emits
 *
 *   <div class="agent-only" data-agent="claude codex">…</div>
 *
 * and site.css shows the block whose `data-agent` holds the active target.
 * Visibility is pure CSS, and the built HTML defaults to Claude Code
 * (data-target on <html>), so a reader with JavaScript off still sees the
 * Claude content.
 *
 * The bracket label is one or more comma-separated target names, because some
 * facts are shared by two agents but not the third (for example, a built-in
 * `/init` exists on Claude Code and Codex but not Cursor). It mirrors how
 * remark-callouts pulls the label off `:::caution[Label]`.
 */

const VALID = new Set(TARGETS);

export function remarkAgentOnly() {
  return (tree, file) => {
    visit(tree, (node) => {
      if (node.type !== 'containerDirective' || node.name !== 'agent') return;

      // remark-directive parses `[claude,codex]` into a leading paragraph
      // flagged directiveLabel. Pull it out so it is not rendered as body copy.
      let raw = '';
      const first = node.children[0];
      if (first?.data?.directiveLabel && first.children?.length) {
        raw = first.children.map((c) => c.value ?? '').join('');
        node.children.shift();
      }

      const agents = raw.split(',').map((s) => s.trim()).filter(Boolean);
      const valid = agents.filter((a) => VALID.has(a));
      const unknown = agents.filter((a) => !VALID.has(a));

      if (!agents.length) {
        file.message('":::agent" needs a target, e.g. :::agent[claude].', node);
      }
      if (unknown.length) {
        file.message(`":::agent" has unknown target(s): ${unknown.join(', ')}.`, node);
      }

      node.data = {
        ...node.data,
        hName: 'div',
        hProperties: { class: 'agent-only', 'data-agent': valid.join(' ') },
      };
    });
  };
}
