<!-- generated_by: slashforge@5.1.1 generated_at: 2026-10-08T22:04:35.424Z -->

# slashforge-docs

The documentation site for SlashForge — a standalone **Astro** workspace nested in
the kit repo. It has its own dependencies, build, and CI checks, separate from the
root CLI. See the repo root `CLAUDE.md` for the kit as a whole.

## Agent orchestration

| When the user says... | Invoke |
|---|---|
| "investigate", "reproduce this", "root-cause" | `/slashforge-investigate` |
| "build", "add a page", "change the docs", "fix Y" | `/slashforge-code` |
| "small change", "tiny fix", "one-liner" | `/slashforge-code -quick` |
| "docs page", "component", "styling", "build the site" (mid-task) | `docs-developer` |
| anything else | `developer` |

`git` and `code-reviewer` are global agents at the repo root and are inherited — do not re-list them here.

## Project References

| Type | File |
|---|---|
| Rule | `docs/.claude/rules/astro-docs.md` |
| Agent | `docs/.claude/agents/docs-developer.md` |

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Astro 7 (`astro`) |
| Module system | ESM (`"type": "module"`) |
| Search | pagefind |
| Fonts | `@fontsource-variable/archivo`, `@fontsource-variable/jetbrains-mono` |
| Markdown | `@astrojs/markdown-remark`, `remark-directive`, `unist-util-visit` |
| Node | 24 (Astro 7 needs ≥ 22.12) |

## Commands (run from `docs/`)

```bash
npm ci            # install (CI uses this)
npm run dev       # dev server (runs sync:changelog first)
npm run build     # production build (sync:changelog → astro build → pagefind)
npm run preview   # preview the built site
```

Doc-check scripts (run from `docs/` after a build):

```bash
node ../.github/scripts/check-docs-links.mjs
node ../.github/scripts/check-docs-targets.mjs
node ../.github/scripts/check-docs-width.mjs
node ../.github/scripts/check-docs-a11y.mjs
node ../.github/scripts/check-docs-facts.mjs
```

## Project structure

```
docs/
├─ astro.config.mjs        # Astro config
├─ src/
│  ├─ content/             # doc pages (changelog.md is GENERATED — don't edit)
│  ├─ components/          # UI components
│  ├─ plugins/             # build-time remark/rehype plugins (clear .astro cache after edits)
│  ├─ layouts/  pages/  styles/  assets/  scripts/
├─ scripts/                # sync-changelog.mjs, root-redirect.mjs
└─ public/                 # static assets
```

## Non-negotiable rules

- The changelog page is generated from the repo-root `CHANGELOG.md` at build time — never edit or commit `docs/src/content/docs/changelog.md`.
- Never hand-write the version into a page; it's derived from `package.json` (`check-docs-facts.mjs`).
- Don't commit a macOS-only `package-lock.json` — CI's `npm ci` needs the Linux optional deps. See `docs/.claude/rules/astro-docs.md`.
- After editing `src/plugins/`, clear `docs/node_modules/.astro` and `docs/.astro` if the change doesn't take effect.
- Keep the site passing every `check-docs-*` script — Astro won't fail a dead in-page link on its own.
