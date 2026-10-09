---
name: git
description: Branch naming, commit hygiene, and the release-on-main rule for this repo
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

# Git & Branching

## Branch naming

Branches use `type/short-description` in kebab-case:

- `feat/<short-desc>` — new capability (e.g. `feat/slashforge-spec-updates`)
- `fix/<short-desc>` — bug fix (e.g. `fix/retry-abort-baseline`)
- `docs/<short-desc>` — docs-site or README/CHANGELOG-only change
- `chore/<short-desc>` — tooling, CI, housekeeping
- `release/<version>` — a release branch carrying only the version bump (e.g. `release/5.1.1`)

## Before branching

- Always ask which branch to create the new branch from before starting work.
- After the base branch is named, fetch the latest remote state and check whether it is behind. If it is, warn the user and ask whether to pull before branching.
- Never start work on `main` directly — `main` is protected and auto-publishes (see below).

## `main` is the release trigger

Pushing a `package.json` **version bump to `main` auto-publishes to npm** (`.github/workflows/auto-release.yml` + `publish.yml`). Consequences:

- `main` must always be green and releasable — never merge a red branch.
- A version bump is a release action, not a routine edit. Bump the version only as part of an intentional release (see `/cut-release`), never incidentally.
- See `docs/slashforge/constitution.md` for the full non-negotiable.

## Commits

- Clear, descriptive, imperative subject lines; reference the PR/issue where relevant.
- Follow the repo's conventional style seen in history: `fix(sdd): …`, `chore(release): …`, `feat(…): …`.

✓ Correct:

```
fix(sdd): abort rolls back the whole implementation attempt (Finding A)
```

✗ Wrong:

```
updated stuff
```

## Secrets

- Never commit `.env` files, credentials, API keys, tokens, or secrets.
- `npm` publish tokens and 2FA live outside the repo — never inline them in config or CI.
- If a sensitive file is staged accidentally, unstage it, add it to `.gitignore`, and only then commit.
