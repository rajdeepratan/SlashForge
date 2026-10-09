# SlashForge — Constitution

The project's non-negotiables. These are enforced by tests and CI, and the
generated `.claude/rules/` reference this file rather than restating it. Changing
one of these is a deliberate, reviewed decision — not a routine edit.

## 1. Zero runtime dependencies

The installer (`bin/install.js`) uses only Node built-ins (`fs`, `path`, `os`,
`readline`). The published package ships only `bin/` and `templates/`, and the root
`package.json` has **no `dependencies` block**. Tests assert this. Never add a
runtime dependency to the CLI — if a feature seems to need one, it almost certainly
doesn't.

*(The `docs/` Astro workspace has its own dependencies; this rule is about the
published CLI, not the docs site.)*

## 2. Line limits on every shipped guide

Every guide/command Markdown file is **≤ 200 lines**, except a skill's `SKILL.md`,
which may run to **≤ 500 lines**. Over the limit, split the file by meaning and link
the sibling — never truncate and never raise the limit to make something fit. Tests
enforce the counts.

## 3. `main` is always releasable

A `package.json` version bump merged to `main` auto-publishes to npm
(`auto-release.yml` tags the release; `publish.yml` publishes via OIDC trusted
publishing). Therefore:

- `main` must always be green — never merge a branch with failing CI.
- A version bump is a release action, performed deliberately on a `release/<version>`
  branch (see `/cut-release`), never an incidental change on a feature branch.
- Publishing uses OIDC with **no** `NODE_AUTH_TOKEN` — a present token overrides OIDC
  and breaks publishing with an EOTP/2FA error.

## 4. The Claude render is pinned

`test/fixtures/claude-render` is a byte-for-byte snapshot of what a Claude install
produces (`claude-render.test.js`). When a template change alters that output, the
test fails by design. Regenerate the fixture with
`node scripts/snapshot-claude-render.js` and review the diff — **never hand-edit a
fixture to make the test pass**. The fixture must always be real installer output.

---

*These are the hard constraints. Day-to-day conventions (naming, style, per-host
target blocks, testing patterns) live in `.claude/rules/` and reference this file
where they touch a non-negotiable.*
