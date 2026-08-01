/**
 * ⌘K search, backed by Pagefind.
 *
 * Pagefind ships a UI bundle, but it brings its own markup and stylesheet —
 * which would then have to be fought back into the design's shape. Its JS API
 * returns plain data instead, so the rows below are rendered directly as the
 * `.hit` markup `site.css` already styles, grouped by the sidebar group each
 * page belongs to.
 *
 * The index is generated after the build (see the `postbuild` script), so this
 * returns nothing under `astro dev` — that is expected, not a fault.
 */
import { FLAT } from '../nav';

type PagefindResult = {
  url: string;
  meta: { title?: string };
  excerpt: string;
};

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

const modal = document.querySelector<HTMLElement>('[data-modal]');
const input = document.querySelector<HTMLInputElement>('[data-search-input]');
const list = document.querySelector<HTMLElement>('[data-search-results]');
const count = document.querySelector<HTMLElement>('[data-search-count]');

if (modal && input && list && count) {
  let pagefind: any = null;

  /** Loaded on first open, so the index is not fetched by every page view. */
  async function ensureIndex() {
    if (pagefind) return pagefind;
    try {
      // Vite must not try to resolve this: the bundle does not exist until
      // Pagefind runs over dist/ after the build.
      pagefind = await import(/* @vite-ignore */ `${base}/pagefind/pagefind.js`);
      await pagefind.options({ excerptLength: 24 });
    } catch {
      pagefind = null;
    }
    return pagefind;
  }

  /** Strip the base path and trailing slash so a URL matches a nav slug. */
  function slugOf(url: string) {
    return url
      .replace(/^.*?\/\/[^/]+/, '')
      .replace(base, '')
      .replace(/^\/|\/$/g, '')
      .replace(/\.html$/, '');
  }

  function render(results: { title: string; excerpt: string; url: string }[], query: string) {
    count.textContent = results.length === 1 ? '1 result' : `${results.length} results`;

    if (!results.length) {
      list.innerHTML = `<div class="modal__empty"><b>No matches for “${escapeHtml(query)}”</b>Try a command name, a phase, or a filename — the index covers page titles, headings, and body copy.</div>`;
      return;
    }

    // Group in sidebar order, so the modal reads like the navigation.
    const groups = new Map<string, typeof results>();
    for (const r of results) {
      const entry = FLAT.find((f) => f.slug === slugOf(r.url));
      const label = entry?.group ?? 'Reference';
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label)!.push(r);
    }

    let html = '';
    let first = true;
    for (const [label, hits] of groups) {
      html += `<div class="modal__group">${escapeHtml(label)}</div>`;
      for (const hit of hits) {
        const crumb = slugOf(hit.url).split('/')[0] || 'docs';
        html +=
          `<a class="hit" href="${hit.url}"${first ? ' aria-selected="true"' : ''}>` +
          `<svg width="12" height="12" viewBox="0 0 64 64" style="align-self:center" aria-hidden="true"><path d="M40 6 H48 L52.4 13.2 L30 58 H22 L17.6 50.8 Z" fill="#EC3013"/></svg>` +
          `<span><b>${escapeHtml(hit.title)}</b><p>${hit.excerpt}</p></span>` +
          `<em>${escapeHtml(crumb)}</em></a>`;
        first = false;
      }
    }
    list.innerHTML = html;
  }

  function escapeHtml(s: string) {
    return s.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
    );
  }

  let token = 0;
  async function run(query: string) {
    const mine = ++token;
    const q = query.trim();

    if (!q) {
      list.innerHTML = '';
      count.textContent = '';
      return;
    }

    const pf = await ensureIndex();
    if (!pf) {
      list.innerHTML = `<div class="modal__empty"><b>Search index unavailable</b>The index is built with the site — run <code>npm run build</code> and preview the result.</div>`;
      count.textContent = '';
      return;
    }

    const search = await pf.search(q);
    // A slower keystroke's results must not overwrite a faster one's.
    if (mine !== token) return;

    const data: PagefindResult[] = await Promise.all(search.results.slice(0, 12).map((r: any) => r.data()));
    if (mine !== token) return;

    render(
      data.map((d) => ({
        title: d.meta?.title ?? 'Untitled',
        excerpt: d.excerpt,
        url: d.url,
      })),
      q
    );
  }

  input.addEventListener('input', () => run(input.value));

  // Warm the index as soon as the modal opens, so the first keystroke is not
  // waiting on a network round trip.
  document.querySelectorAll('[data-open-search]').forEach((b) => {
    b.addEventListener('click', () => void ensureIndex());
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) void ensureIndex();
  });
}
