/* Reference behaviour: theme toggle, target switcher, search modal, terminal
   replay. Plain JS, no build step. Port the behaviour, not necessarily the
   code. */

import {
  TARGETS,
  DEFAULT_TARGET,
  STORAGE_KEY,
  commandForm,
  renderReplayLine,
  examplePathFor,
} from '../targets.mjs';

(function () {
  var root = document.documentElement;

  /* ---- theme ---- */
  var saved = null;
  try { saved = localStorage.getItem('sf-theme'); } catch (e) {}
  if (saved) root.setAttribute('data-theme', saved);

  function syncLabel() {
    var dark = root.getAttribute('data-theme') === 'dark';
    document.querySelectorAll('[data-toggle-theme]').forEach(function (b) {
      b.textContent = dark ? 'Light' : 'Dark';
    });
  }
  syncLabel();

  document.querySelectorAll('[data-toggle-theme]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('sf-theme', next); } catch (e) {}
      syncLabel();
    });
  });

  /* ---- coding-agent target ---- */

  /* Command names ship in the Claude Code form and are rewritten here, so the
     page is already correct before this runs and stays correct without it.
     Both controls — the tab strip in each command block and the header
     switcher — carry data-target-opt, so one delegated listener drives them
     all and they cannot fall out of sync. */
  function readTarget() {
    try {
      var v = localStorage.getItem(STORAGE_KEY);
      return TARGETS.indexOf(v) >= 0 ? v : DEFAULT_TARGET;
    } catch (e) {
      return DEFAULT_TARGET;
    }
  }

  function applyTarget(t) {
    root.setAttribute('data-target', t);
    document.querySelectorAll('[data-cmd]').forEach(function (el) {
      el.textContent = commandForm(el.getAttribute('data-cmd'), t);
    });
    document.querySelectorAll('[data-example-path]').forEach(function (el) {
      el.textContent = examplePathFor(el.getAttribute('data-example-path'), t);
    });
    /* Block tabs are tablist options; the header menu holds radio items. */
    document.querySelectorAll('[data-target-opt]').forEach(function (b) {
      var on = String(b.getAttribute('data-target-opt') === t);
      if (b.getAttribute('role') === 'menuitemradio') b.setAttribute('aria-checked', on);
      else b.setAttribute('aria-selected', on);
    });
    document.querySelectorAll('[data-target-value]').forEach(function (el) {
      el.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    });
    /* The terminal replay animates by writing textContent, so its lines are
       plain text by the time anyone switches — it cannot be updated by walking
       [data-cmd] like everything else. It rebuilds itself on this event. */
    document.dispatchEvent(new CustomEvent('sf:target', { detail: t }));
  }

  function setTarget(t) {
    applyTarget(t);
    try { localStorage.setItem(STORAGE_KEY, t); } catch (e) {}
  }

  applyTarget(readTarget());

  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-target-opt]');
    if (btn) setTarget(btn.getAttribute('data-target-opt'));
  });

  /* The header menu. A real panel rather than a native select popup, so the
     open/close behaviour has to be written: outside click, Escape, and closing
     after a choice. */
  var trigger = document.querySelector('[data-agent-trigger]');
  var menu = document.getElementById('agent-menu');

  function openMenu(open) {
    if (!trigger || !menu) return;
    trigger.setAttribute('aria-expanded', String(open));
    menu.hidden = !open;
  }

  if (trigger && menu) {
    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      openMenu(trigger.getAttribute('aria-expanded') !== 'true');
    });

    menu.addEventListener('click', function () {
      openMenu(false);
      trigger.focus();
    });

    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target) && e.target !== trigger) openMenu(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || menu.hidden) return;
      openMenu(false);
      trigger.focus();
    });

    /* Down from the trigger opens the menu and lands on the first item. */
    trigger.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown') return;
      e.preventDefault();
      openMenu(true);
      var first = menu.querySelector('[data-target-opt]');
      if (first) first.focus();
    });
  }

  /* Arrow keys. A tablist activates on arrow — that is the automatic-activation
     pattern and it is what makes the block tabs feel immediate. A menu must not:
     arrowing through options is browsing, and committing on the way past would
     rewrite the page under the reader. So the menu moves focus only, and the
     choice is made by activating the item. */
  document.addEventListener('keydown', function (e) {
    var btn = e.target.closest('[data-target-opt]');
    if (!btn) return;

    var isMenu = btn.getAttribute('role') === 'menuitemradio';
    var forward = isMenu ? 'ArrowDown' : 'ArrowRight';
    var back = isMenu ? 'ArrowUp' : 'ArrowLeft';

    var i = TARGETS.indexOf(btn.getAttribute('data-target-opt'));
    var next = e.key === forward ? i + 1 : e.key === back ? i - 1 : -1;
    if (next < 0 || next >= TARGETS.length) return;

    e.preventDefault();
    if (!isMenu) setTarget(TARGETS[next]);
    var sel = btn.parentNode.querySelector('[data-target-opt="' + TARGETS[next] + '"]');
    if (sel) sel.focus();
  });

  /* ---- search modal ---- */
  var modal = document.querySelector('[data-modal]');
  var input = document.querySelector('[data-search-input]');

  function openSearch() {
    if (!modal) return;
    modal.hidden = false;
    if (input) input.focus();
  }
  function closeSearch() {
    if (modal) modal.hidden = true;
  }

  document.querySelectorAll('[data-open-search]').forEach(function (b) {
    b.addEventListener('click', openSearch);
  });
  if (modal) {
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeSearch();
    });
  }
  window.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
    if (modal && modal.hidden) return;

    var hits = Array.prototype.slice.call(document.querySelectorAll('.hit'));
    if (!hits.length) return;
    var i = hits.findIndex(function (h) { return h.getAttribute('aria-selected') === 'true'; });
    if (i < 0) i = 0;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      hits[i].removeAttribute('aria-selected');
      i = e.key === 'ArrowDown' ? Math.min(hits.length - 1, i + 1) : Math.max(0, i - 1);
      hits[i].setAttribute('aria-selected', 'true');
    }
    if (e.key === 'Enter') hits[i].click();
  });

  /* ---- terminal replay ----
     Lines are rendered in full in the HTML and trimmed on load, so the content
     is real text: it survives with JS off, it is selectable, and screen readers
     get the finished output rather than a stream of partial words. */
  /* Each replay runs independently — its own timer, its own observer — so a
     second terminal further down the page is not driven by the first. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-replay]'), function (section) {
    var body = section.querySelector('[data-replay-body]');
    var status = section.querySelector('[data-replay-status]');
    var button = section.querySelector('[data-replay-btn]');
    if (!body) return;

    var lines = Array.prototype.slice.call(body.children);
    var total = 0;

    /* data-line carries the canonical Claude Code text. The rendered form is
       derived from it every time, so switching target after the animation has
       flattened the markup still produces the right line. */
    function rebuild(target) {
      lines.forEach(function (el) {
        var src = el.getAttribute('data-line');
        el.dataset.full = src === null ? el.textContent : renderReplayLine(src, target);
      });
      total = lines.reduce(function (n, el) { return n + el.dataset.full.length + 1; }, 0);
    }

    rebuild(readTarget());

    var timer = 0;
    var painted = 0;
    var started = false;

    function paint(budget) {
      painted = budget;
      var left = budget;
      lines.forEach(function (el) {
        var full = el.dataset.full;
        var shown = Math.max(0, Math.min(full.length, left));
        var typing = left > 0 && left <= full.length && budget < total;
        el.textContent = full.slice(0, shown) + (typing ? '▌' : '');
        left -= full.length + 1;
      });
      if (status) status.textContent = budget >= total ? 'complete' : 'running';
    }

    function play() {
      started = true;
      clearInterval(timer);
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        paint(total);
        return;
      }
      var n = 0;
      paint(0);
      timer = setInterval(function () {
        n += 3;
        if (n >= total) { clearInterval(timer); paint(total); }
        else paint(n);
      }, 26);
    }

    /* Rebuild in place: the reader keeps their position in the animation
       rather than having it restart under them. */
    document.addEventListener('sf:target', function (e) {
      /* Before the replay runs, the lines still hold their server-rendered
         markup and [data-cmd] has already been updated like everywhere else.
         Repainting then would blank the terminal, so only the cached text is
         rebuilt. */
      var done = painted >= total;
      rebuild(e.detail);
      if (started) paint(done ? total : painted);
    });

    if (button) button.addEventListener('click', play);

    var played = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting && !played) { played = true; play(); }
      });
    }, { threshold: 0.25 });
    io.observe(section);
  });
})();

/* ==========================================================================
   Additions for the real site
   --------------------------------------------------------------------------
   The reference is two static pages. These are the behaviours that only exist
   once the site is generated: a mobile sidebar, copy buttons on generated code
   blocks, an on-this-page rail that tracks scroll, and the platform key label.
   ========================================================================== */

(function () {
  /* ---- platform key ---- */
  /* The chip is written ⌘K in the markup; on anything that is not an Apple
     platform that shortcut does not exist, so relabel it. */
  var key = document.querySelector('[data-search-key]');
  if (key && !/(Mac|iPhone|iPod|iPad)/i.test(navigator.platform)) {
    key.textContent = 'Ctrl K';
  }

  /* ---- mobile sidebar ---- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var sidebar = document.querySelector('[data-sidebar]');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      var open = sidebar.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
  }

  /* ---- copy buttons ---- */
  document.querySelectorAll('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var pre = btn.closest('.code') && btn.closest('.code').querySelector('pre');
      if (!pre) return;
      navigator.clipboard.writeText(pre.textContent || '').then(function () {
        btn.textContent = 'Copied';
        btn.setAttribute('data-copied', '');
        setTimeout(function () {
          btn.textContent = 'Copy';
          btn.removeAttribute('data-copied');
        }, 1600);
      });
    });
  });


  /* ---- external links ---- */
  /* Anything pointing off this origin opens in a new tab, so a click never
     navigates the reader out of the docs. Applied here rather than in the
     markup because most of these links come from markdown, where there is no
     place to put an attribute. `noopener` is not optional: without it the new
     tab gets a handle on this one via window.opener. */
  document.querySelectorAll('a[href^="http"]').forEach(function (a) {
    if (!a.hostname || a.hostname === location.hostname) return;
    a.target = '_blank';
    a.rel = a.rel ? a.rel + ' noopener' : 'noopener';
  });

  /* ---- on-this-page tracking ---- */
  var links = Array.prototype.slice.call(document.querySelectorAll('.toc a'));
  if (!links.length) return;

  var targets = links
    .map(function (a) {
      return document.getElementById(decodeURIComponent(a.hash.slice(1)));
    })
    .filter(Boolean);
  if (!targets.length) return;

  /* A click wins over the scroll position for a moment.

     The last few headings on a page share one scroll position — once the
     document is scrolled to its end, there is nowhere further to go, so
     clicking any of them moves nothing and the rail would keep pointing at
     whichever heading the position implies. That reads as a dead link even
     though the target section is already on screen. Pinning the clicked entry
     gives the click an answer; the scroll position takes back over shortly
     after, which is also long enough to stop the marker skittering through
     every heading the jump passes over. */
  var pinned = null;
  var pinTimer = 0;

  function mark() {
    if (pinned) return;

    /* The heading considered "current" is the last one whose top has passed a
       reading line just below the sticky header — not the topmost one
       intersecting, which flickers between two headings on a slow scroll.

       The line is not fixed. Near the end of a page the remaining headings can
       no longer be scrolled up to it: on the changelog there is only ~350px of
       page after the third-from-last release, so the last three could never
       become current and the marker stuck on the one above them. As the page
       runs out of scroll the line slides down toward the bottom of the
       viewport, so every heading is still reachable. */
    var max = document.documentElement.scrollHeight - window.innerHeight;
    var remaining = Math.max(0, max - window.scrollY);
    var line = 140;
    if (remaining < window.innerHeight) {
      var ratio = 1 - remaining / window.innerHeight;
      line = 140 + ratio * (window.innerHeight - 140);
    }

    var seen = targets[0];
    targets.forEach(function (t) {
      if (t.getBoundingClientRect().top <= line) seen = t;
    });
    links.forEach(function (a) {
      if (decodeURIComponent(a.hash.slice(1)) === seen.id) {
        a.setAttribute('aria-current', 'true');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  links.forEach(function (a) {
    a.addEventListener('click', function () {
      pinned = a;
      links.forEach(function (l) {
        l.removeAttribute('aria-current');
      });
      a.setAttribute('aria-current', 'true');
      clearTimeout(pinTimer);
      pinTimer = setTimeout(function () {
        pinned = null;
        mark();
      }, 700);
    });
  });

  mark();
  window.addEventListener('scroll', mark, { passive: true });
  /* The reading line is derived from the viewport height, so a resize (or a
     phone rotating) has to recompute it even with no scroll. */
  window.addEventListener('resize', mark, { passive: true });
})();

/* ---- help menu on the action bar ----
   A button rather than a link, because there is more than one way to reach a
   human: the issue tracker for anything reproducible, email for anything else.
   Closes on outside click and on Escape, and returns focus to the button. */
(function () {
  var btn = document.querySelector('[data-help-toggle]');
  var menu = document.getElementById('help-menu');
  if (!btn || !menu) return;

  function setOpen(open) {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(menu.hidden);
  });

  document.addEventListener('click', function (e) {
    if (!menu.hidden && !menu.contains(e.target)) setOpen(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      btn.focus();
    }
  });
})();

/* ---- star count on the action bar ----
   A public, unauthenticated call to the GitHub API, cached in localStorage for
   six hours: the count moves slowly, and the anonymous rate limit is 60 an hour
   per IP. Every failure path is silent — the button is a link to the repo
   whether or not a number ever arrives, so a rate limit, an offline reader or a
   blocked request costs nothing. */
(function () {
  var slot = document.querySelector('[data-star-count]');
  if (!slot || typeof fetch !== 'function') return;

  var KEY = 'sf-stars';
  var TTL = 6 * 60 * 60 * 1000;

  function paint(count) {
    if (typeof count !== 'number' || !isFinite(count) || count < 0) return;
    slot.textContent =
      count >= 1000 ? (count / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(count);
    slot.hidden = false;
  }

  var cached = null;
  try {
    cached = JSON.parse(localStorage.getItem(KEY) || 'null');
  } catch (e) {}

  if (cached && typeof cached.at === 'number' && Date.now() - cached.at < TTL) {
    paint(cached.count);
    return;
  }

  fetch('https://api.github.com/repos/rajdeepratan/SlashForge', {
    headers: { Accept: 'application/vnd.github+json' },
  })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      if (!data || typeof data.stargazers_count !== 'number') return;
      paint(data.stargazers_count);
      try {
        localStorage.setItem(KEY, JSON.stringify({ count: data.stargazers_count, at: Date.now() }));
      } catch (e) {}
    })
    .catch(function () {});
})();
