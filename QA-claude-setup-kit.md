# QA-claude-setup-kit — Test Plan

> Toby QA onboarding · 2026-08-19

---

## Existing Test Infrastructure

| Layer | Tool | Status |
|---|---|---|
| Unit + CLI integration | Node built-in test runner (`node --test`) | Active — 1 file: `test/install.test.js` |
| CI matrix | GitHub Actions `ci.yml` | Node 16, 18, 20, 22 |
| Docs CI | `ci.yml` `docs` job | Astro build + 3 custom lint scripts (`check-docs-links`, `check-docs-a11y`, `check-docs-facts`) |
| Publish | `publish.yml` | Runs tests before `npm publish` |

**Notable test design:** Tests run the actual template scripts (the investigate splice script and review-pr payload assembler are extracted and executed, not re-implemented). Superpowers-free enforcement is actively tested (line 409 of `install.test.js`). Jesse Vincent attribution check is tested per skill file.

---

## Coverage Gaps

| Area | Gap |
|---|---|
| `renderTemplate()` — all three tokens | `{{INSTALL_PATH}}`, `{{KIT_VERSION}}`, `{{KIT_PACKAGE}}` substitution coverage is partial; combined token interactions not tested |
| `warnIfOutdated()` — timeout/failure paths | The 1.5s npm registry check silent-failure path is not tested |
| `uninstallFiles()` — legacy cleanup | `LEGACY_COMMAND_FILES` removal verified conceptually; no test verifies files are absent post-uninstall |
| `REMOVED_GUIDE_FILES` cleanup on upgrade | No test simulates a prior install with `forge-preflight.md` present and verifies it is removed |
| Global vs project mode parity | Most tests likely cover one mode; explicit parity check across both install targets is unclear |
| Concurrent / re-entrant install | No test for running install twice without `--yes` and verifying idempotency or prompting |
| Docs lockfile (macOS/Linux parity) | Known trap: macOS-generated lockfile omits Linux optionals; no automated check flags this |
| Node 16 compatibility | Matrix covers it, but `node --test` stability on Node 16 is minimal-runner territory |

---

## Critical Flows

| Flow | Status |
|---|---|
| Global install (default) writes all files to `~/.claude/` | Tested |
| Project install (`--project`) writes to `./.claude/` | Tested |
| `--dry-run` makes no writes | Tested |
| `parseFrontmatter()` rejects missing `name`/`description` | Tested |
| `validateTemplates()` blocks partial install on any bad template | Tested |
| `isNewerVersion()` semver comparison | Tested |
| `uninstall --yes` removes files | Tested (extent unclear — see gap above) |
| `status` command outputs installed state | Tested |
| No `superpowers:*` in any template | Tested (line 409) |
| Jesse Vincent attribution present in skill files | Tested |
| Template scripts execute without error | Tested (actual execution, not duplication) |

---

## Risky Areas (priority order)

### 1. Partial Install Atomicity
**Risk:** `validateTemplates()` is supposed to block any write on a bad template. If validation is bypassed or partial, a broken install leaves the user's `~/.claude/` in an inconsistent state with no rollback.
**Plan:** Test: corrupt one template file, run install, assert zero files were written and error is returned. Test the reverse: fix template, run install, assert all files present.

### 2. `REMOVED_GUIDE_FILES` / Legacy Cleanup on Upgrade
**Risk:** Upgrading from a prior version must delete `forge-preflight.md` and legacy command paths. If cleanup is skipped, stale files confuse the agent with outdated instructions.
**Plan:** Test: pre-seed `~/.claude/` with the legacy paths + `forge-preflight.md`, run install, assert those paths are absent afterward.

### 3. `isNewerVersion()` Edge Cases
**Risk:** The function returns `false` on any unparseable input. If the npm registry returns an unexpected version string (pre-release tag, `latest`, empty), the function silently skips the outdated warning.
**Plan:** Unit tests for: pre-release strings (`1.0.0-beta.1`), equal versions, non-semver strings, empty string, `null`.

### 4. Global vs Project Mode File Isolation
**Risk:** If the install target resolution (`resolveTarget()`) mixes global and project paths, a project install could corrupt the global install.
**Plan:** Test: run global install then project install in the same environment; assert global paths unchanged and project paths contain correct files.

### 5. `warnIfOutdated()` Silent Failure
**Risk:** The 1.5s timeout on the npm registry check is meant to fail silently. If it throws instead of catching, CLI crashes for offline users.
**Plan:** Unit test: mock fetch to throw or time out; assert function resolves without error and emits no output.

### 6. Docs Lockfile (CI Breakage Risk)
**Risk:** macOS-generated `docs/package-lock.json` omits Linux optionals; `npm ci` fails on CI silently if the wrong lockfile is committed.
**Plan:** CI check: run `npm ci --ignore-scripts` in `docs/` on Linux; fail the job if it errors. Add note to contributing docs: regenerate lockfile on Linux only.

---

## Top 3 QA Priorities

1. **Partial install atomicity test** — a broken `~/.claude/` is the worst user-facing outcome; the validate-before-write contract needs an explicit failure-mode test.
2. **Legacy/removed file cleanup on upgrade** — stale skill files silently confuse the agent; no test currently covers the `forge-preflight.md` removal path.
3. **`isNewerVersion()` edge-case coverage** — the version comparison is the last guard against `npx` staleness; pre-release and unparseable inputs are not covered.
