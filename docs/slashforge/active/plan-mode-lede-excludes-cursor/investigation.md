# Investigation — "Plan mode and /init" lede excludes Cursor

**Summary:** Confirmed — not a page-visibility bug. The page *should* show for Cursor and its
body already adapts correctly; the defect is that the page **lede (subtitle) is agent-agnostic**
and its current wording foregrounds a Claude/Codex-only feature (`/init`), so a Cursor reader sees
a headline that reads as being about the other two agents.

## Reproduction
1. Build/serve the docs (`npm run dev` from `docs/`) and open
   `http://localhost:4327/slashforge/guides/plan-mode-and-init`.
2. Use the **Agent** switcher in the header to select **Cursor**.
3. Observe: every `:::agent[...]` block in the body swaps to its Cursor variant correctly (plan
   mode via Shift+Tab; the "Cursor has no built-in `/init`" section), **but** the large subtitle
   under the title still reads: *"All three agents have a plan mode, and Claude Code and Codex
   also ship /init. Here is the line between those built-ins and SlashForge — and when you need
   neither."* That sentence names only Claude Code and Codex and frames the page around `/init`,
   which Cursor lacks.

The built HTML confirms the lede is frozen to one string regardless of agent — it is the only
guide lede in `docs/dist/.../guides/*.html` that names specific agents this way.

## Root cause
The per-agent content system only switches **container blocks inside the Markdown body**. The
`:::agent[claude]` / `:::agent[cursor]` directive is handled by
`docs/src/plugins/remark-agent-only.mjs`, which emits `<div class="agent-only" data-agent="…">`
wrappers that `site.css` shows/hides off the `data-target` on `<html>`. Directives cannot appear
in frontmatter.

The page **lede** is not a body block. `docs/src/layouts/DocsLayout.astro:84` renders the
frontmatter `description` verbatim: `{description && <p class="lede">{description}</p>}`. That
`description` comes straight from the page frontmatter via
`docs/src/pages/[...slug].astro:26` (`description={page.data.description}`). So the lede is a
single static string with no agent-switching path.

`docs/src/content/docs/guides/plan-mode-and-init.md:3` sets that string to:
*"All three agents have a plan mode, and Claude Code and Codex also ship /init…"*. The body was
written to be agent-aware (it correctly handles "Cursor has no `/init`"), but the lede was not —
and its wording specifically excludes Cursor.

Compounding constraint: the same `description` is **also the SEO/meta description** (passed on to
`Base` → `Head.astro`), so it must stay a single plain string — you cannot simply drop an
`:::agent` directive into it without a new mechanism.

This is a **content/framing defect**, not a rendering defect: the mechanism works exactly as
designed; the page's own summary copy is the thing that excludes Cursor.

## Affected scope
- **Versions:** current `main` (docs site as built; reproduced against `docs/dist`).
- **Environments:** the docs site only (`docs/` Astro workspace). No effect on the installer CLI
  or shipped templates.
- **Users:** docs readers who select **Cursor** in the agent switcher. The body content is
  correct for them; only the title-area subtitle (and, to a lesser degree, the `/init` in the H1
  title) reads as not-for-them. Also surfaces in the page's `<meta name="description">`.

## Suggested next step
Cheapest correct fix (no code): rewrite the frontmatter `description` in
`docs/src/content/docs/guides/plan-mode-and-init.md:3` to be **agent-neutral**, so it reads
sensibly for all three agents while staying a valid single-string meta description. For example,
something like: *"Every agent ships a plan mode, and most ship an `/init`. Here's the line
between those built-ins and SlashForge — and when you need neither."* (Keep it em-dash-free per
project copy rules; final wording is the author's call.)

Larger option (only if agent-specific ledes are wanted broadly): add an agent-aware lede
mechanism — e.g. an optional `descriptions:` map in frontmatter keyed by target, rendered as
`data-agent` spans in `DocsLayout.astro` while a neutral `description` remains the meta string.
That's a docs-platform feature, heavier than this one page needs; defer unless other pages hit
the same wall.

No whole-page visibility change is warranted: the page is legitimately relevant to Cursor (plan
mode + the `/slashforge-setup`-instead-of-`/init` story), and there is intentionally no mechanism
to hide an entire page from one agent's nav.
