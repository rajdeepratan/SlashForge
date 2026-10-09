---
name: cut-release
description: Prepare a release — bump the version, finalize the changelog, and open the release PR that publishes on merge
disable-model-invocation: true
argument-hint: [major|minor|patch|<version>]
generated_by: slashforge@5.1.1
generated_at: 2026-10-08T22:04:35.424Z
---

Cut a release of `slashforge`. The version bump is the publish trigger: merging a
`package.json` version change to `main` runs `.github/workflows/auto-release.yml`
(creates the GitHub release tag), which runs `.github/workflows/publish.yml`
(tests, then OIDC trusted-publish to npm — no token). So treat this as a
deliberate, human-gated action.

Argument `$ARGUMENTS` is the bump (`major` / `minor` / `patch`) or an explicit
version. If absent, ask.

## Steps

1. **Confirm the tree is green and clean.** Run `npm test` and `git status`. Do not proceed on a red or dirty tree.
2. **Confirm the current and target version** with the user before changing anything — read the current version from `package.json`.
3. **Finalize `CHANGELOG.md`.** Move everything under `## [Unreleased]` into a new dated section for the target version (Keep a Changelog format). Leave a fresh empty `## [Unreleased]`.
4. **Bump the version** in `package.json` to the target. Do this on a `release/<version>` branch — never commit the bump directly to `main`.
5. **Open a PR** targeting `main` (ask who reviews). The PR body lists the changelog entries for this version.
6. **Explain the publish chain** to the user and stop: on merge, auto-release creates the tag and publish.yml publishes to npm via OIDC. If publish fails with an EOTP/2FA error, it means a `NODE_AUTH_TOKEN` is set and overriding OIDC — it must be absent for trusted publishing to work.

## Verify

- [ ] `npm test` green and tree clean before bumping
- [ ] Target version confirmed with the user
- [ ] `CHANGELOG.md` has a dated section for this version and a fresh empty `## [Unreleased]`
- [ ] Version bump is on a `release/<version>` branch, not `main`
- [ ] PR opened against `main` with reviewers assigned
- [ ] User understands the merge publishes automatically
