# Extension Packs — Plan

## Approach
Teach `bin/install.js` to accept one or more `--ext <dir>` local extension packs. A pack is a
directory with a JSON manifest (`slashforge-ext.json`) declaring **guides**, **hooks**, and a
**config** template. The `hooks` contract is generic — any host lifecycle event mapped to any
script, with an optional matcher — so a pack can do anything a host hook can (telemetry, Slack, a
linter, an audit log, a custom plugin). OpenTelemetry is only the shipped *example*. The installer validates each pack with the existing frontmatter / target-block
/ line-limit validators, then renders and writes its files into a dedicated
`…/setup/slashforge/extensions/<id>/` subtree (out of reach of the top-level stale-file sweep),
records the pack in `meta.json`, and prints the ready-to-paste host-hook snippet. A first-party
`observability` pack in `extensions/observability/` ships as the flagship OpenTelemetry example.

**Scope for this release:** guides + hooks + config only. Extension-provided **commands** and
**agents** are deliberately deferred (see "Out of scope"), because the monitoring/telemetry goal
needs a guide + a hook, not a command, and commands pull in sigil-rewriting, flat-command naming,
and per-namespace uninstall tracking that this feature does not require.

## Tech stack
- Node.js ≥ 24, CommonJS, **zero runtime dependencies** — manifest parsed with built-in `JSON.parse`
  (no YAML parser is permitted). The reference hook emitter is a Node script using the built-in
  `https`/`http` modules (cross-platform, already how `fetchLatestVersion` posts).
- `node:test` + `node:assert` for tests.

## Global constraints
- Zero runtime dependencies; no `dependencies` block; manifest is JSON, not YAML.
- Every extension guide obeys the same rules as a built-in guide: valid frontmatter, balanced
  target blocks (names `claude`/`agents`/`cursor`/`codex`/`neutral`), ≤ 200 lines.
- Install is **atomic**: a malformed pack aborts before any file is written.
- A default install (no `--ext`) must produce byte-identical output to today — the pinned Claude
  render only changes because of the new built-in authoring guide (Task 7), which is regenerated,
  never hand-edited.
- Hook scripts are copied verbatim and never executed at install time.
- No version bump on the feature branch (`main` auto-publishes).

## Files

**Create (installer + reference pack):**
- `extensions/observability/slashforge-ext.json` — the reference manifest.
- `extensions/observability/guides/slashforge-observability.md` — observability guide (rendered like a guide).
- `extensions/observability/hooks/emit-telemetry.js` — zero-dep Node emitter (webhook / OTLP / JSONL), fail-open.
- `extensions/observability/config/observability.config.json` — config template (transport, endpoint, events, service_name).
- `extensions/observability/README.md` — how to install and point it at a sink.
- `templates/slashforge-extensions.md` — built-in authoring guide (added to `GUIDE_FILES`).
- `test/extensions.test.js` — manifest parsing, `--ext` validation/atomicity, install placement, meta, uninstall, and the observability pack's own validity.

**Modify:**
- `bin/install.js` — add `EXT_MANIFEST = 'slashforge-ext.json'`; `parseExtManifest()`,
  `resolveExtensions()`, `extInstallDir()`, `installExtensions()`, `uninstallExtensions()`; add
  `slashforge-extensions.md` to `GUIDE_FILES`; thread an `extensions` array through `install()`,
  `installFiles()`, `installAgentsFiles()`, `plannedWrites()`, `plannedAgentsWrites()`,
  `uninstallFiles()`, `uninstallAgentsFiles()`, and `meta`; parse `--ext` in `main()`; extend
  `printHelp()`; export the new functions.
- `test/fixtures/claude-render` — regenerated via `scripts/snapshot-claude-render.js` after Task 7.
- `CHANGELOG.md`, `README.md`, and the docs site — Task 9.

**Remove:** none.

## Key design details

### Manifest (`slashforge-ext.json`)
```json
{
  "schema": 1,
  "id": "observability",
  "name": "Observability",
  "version": "0.1.0",
  "description": "Emit SlashForge usage telemetry to a webhook, an OTLP collector, or a local file.",
  "provides": {
    "guides": ["guides/slashforge-observability.md"],
    "config": "config/observability.config.json",
    "hooks": [
      { "event": "Stop",       "script": "hooks/emit-telemetry.js", "description": "Emit a turn-complete event" },
      { "event": "SessionEnd", "script": "hooks/emit-telemetry.js", "description": "Emit a session-complete event" }
    ]
  }
}
```
`parseExtManifest(raw, label)` requires `schema === 1`, `id` matching `^[a-z0-9-]+$`, non-empty
`name`/`version`/`description`, and a `provides` with at least one of `guides`/`hooks`/`config`.
Any failure throws `Error(label + ': …')`.

**The `hooks` contract is generic.** Each entry is `{ event, script, matcher?, description? }` where
`event` is any host lifecycle event name and `script` is any path inside the pack. The installer
does not interpret what the script does — it validates the shape (known event name, script exists,
`matcher` is a string if present), copies the script verbatim, and prints the host snippet. OTLP,
webhook, Slack, linting, audit logging are all just "a script on an event"; nothing in the manifest
or installer is telemetry-specific. The authoring guide (`templates/slashforge-extensions.md`)
teaches building an arbitrary pack; the observability pack is one worked example.

### Placement (survives the stale sweep)
Extension files install under a subtree the existing top-level sweep (`install.js:508`,
`fs.readdirSync(target.guidesDir)`) never scans:
- Claude: `~/.claude/setup/slashforge/extensions/<id>/…`
- Cursor/Codex: `~/.agents/setup/slashforge/<host>/extensions/<id>/…`
Guides are rendered with `renderTemplate(...)` + `toHostCommandRefs` for agent hosts, exactly like
built-in guides. Config and hook scripts are `copyFileSync`'d verbatim.

### meta.json
Add `extensions: [{ id, version }]` to the object written in `installFiles()` (`install.js:513`)
and `installAgentsFiles()` (`install.js:712`). `uninstallExtensions()` removes the whole
`extensions/` subtree under each guides dir (kit-owned; no user files live there).

### Hooks are printed, not auto-wired
The installer does not edit the user's `settings.json` / `hooks.json`. After a successful install
of a pack with `hooks`, it prints the exact snippet and the installed script's absolute path for
the user to paste (consistent with how `slashforge-hooks.md` already treats hook setup). This keeps
the installer from mutating host config it does not own.

## Risks & edge cases
- **Stale sweep eating extension files** — mitigated by the `extensions/<id>/` subtree; a test
  asserts a built-in re-install leaves the subtree intact.
- **An extension id colliding with a built-in guide name** — ids are constrained to `^[a-z0-9-]+$`
  and files live under `extensions/<id>/`, so no top-level `slashforge-*.md` collision is possible.
- **Malformed pack** — `resolveExtensions()` validates every manifest and every guide (via
  `validateTemplates`) before `install()` writes anything; a test proves atomicity.
- **Windows hook execution** — the emitter is Node (`node emit-telemetry.js`), not bash, so it runs
  wherever the host runs; `curl` is avoided for portability.
- **Telemetry endpoint down** — the emitter is fail-open: any network error exits 0 and emits
  nothing to stdout, so the agent is never blocked.
- **Secrets** — the config template holds no token; auth headers come from `OTEL_EXPORTER_OTLP_HEADERS`
  / a `SLASHFORGE_TELEMETRY_TOKEN` env var, documented in the guide. A test greps the pack for
  obvious secret patterns.
- **`--ext` pointing at a non-directory / missing manifest** — `resolveExtensions()` raises a clear
  error naming the path.

## Test strategy
`test/extensions.test.js` (new), all `node:test`, using temp dirs like the existing suite:
1. `parseExtManifest` — valid manifest round-trips; missing `id`, bad `id`, `schema !== 1`, empty
   `provides` each throw with the label.
2. Atomicity — an `--ext` pack whose guide is 201 lines (or has an unbalanced target block) throws
   from `resolveExtensions`/`validateTemplates` and writes **zero** files (assert the target dir is
   absent).
3. Placement — a minimal valid pack installs its guide + config under
   `…/extensions/<id>/` for the Claude target and for each agents host; the hook script is copied.
4. Stale-sweep safety — run a normal `installFiles` afterward and assert the `extensions/<id>/`
   subtree still exists.
5. meta — `meta.json` includes `extensions: [{id, version}]`.
6. Uninstall — `uninstallExtensions` removes the subtree; a user file placed beside it in
   `setup/slashforge/` is untouched.
7. Observability pack — load `extensions/observability/slashforge-ext.json`, assert
   `parseExtManifest` accepts it, `validateTemplates` accepts its guide, the emitter file exists,
   and the pack contains no secret-looking strings.
8. Pinned render — `claude-render.test.js` passes after Task 7 regenerates the fixture (new
   authoring guide is the only diff).
Manual check: `node bin/install.js --dry-run --ext extensions/observability` lists the extension
writes; a real install into a temp HOME shows the pasteable hook snippet.
