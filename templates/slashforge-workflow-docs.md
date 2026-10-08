---
name: SlashForge Workflow — Documentation Sweep
description: Phase 8 pre-push documentation step for /slashforge-code and /slashforge-fix — the Keep a Changelog update, the README public-interface sweep, and the pre-merge docs commit, so the PR carries its own CHANGELOG.md and README.md changes.
---

# Phase 8 — Documentation sweep (before pushing)

Read when a `/slashforge-code` or `/slashforge-fix` run reaches Phase 8, **before the push**, so the
docs land in the same PR as the change rather than in a follow-up. Commit the result as its own
commit, so a reviewer can read the docs change on its own.

## 1. Keep a Changelog

If the repo has a `CHANGELOG.md`, read it, then from the **git diff** and the **Phase 2 plan** write
a snippet in strict [Keep a Changelog](https://keepachangelog.com) form — only the headings that
apply, chosen from:

- `### Added` — new features or surfaces.
- `### Changed` — behaviour or interfaces that changed.
- `### Fixed` — bug fixes.
- `### Security` — security fixes. **Mandatory** whenever this change resolved a security finding
  (e.g. one raised by the Phase 7 audit).

**Prepend the snippet under the `## [Unreleased]` header** (create that header at the top of the file
if it has none). Describe user-visible behaviour, not the implementation. Do not bump the version or
add a dated release header — that is a release step, not this one.

## 2. Public-interface sweep of the README

Scan the diff for changes to the repo's **public surface**: exported functions/types, CLI flags,
environment variables, config keys. If any changed, apply **targeted** search-and-replace updates to
`README.md` (and any other doc that documents that surface) — rename the flag, update the signature,
add the new env var. Do not rewrite the README wholesale; touch only what the interface change
requires. If nothing public changed, make no README edit and say so.

## 3. Pre-merge commit

Stage and commit exactly the docs you changed:

```bash
git add CHANGELOG.md README.md   # only the files you actually changed
git commit -m "docs: auto-update changelog and readme for <feature>"
```

Substitute `<feature>` with the change slug. If the sweep found nothing to document — a pure-internal
change, or the repo has no `CHANGELOG.md` / `README.md` — skip the commit and say why. An empty docs
commit is noise.
