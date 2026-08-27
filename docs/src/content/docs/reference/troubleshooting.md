---
title: Troubleshooting
description: The handful of things that actually go wrong, and what to do about each.
---

## The commands do not appear

==By far the most common one.== You type `/` and see nothing named `slashforge`.

### In Claude Code

:::steps
1. Run `npx slashforge status` — it reports what is installed and where.
2. **Restart Claude Code.** Command files are read at startup.
3. If `status` shows a v3 `forge/` layout, you are typing the old namespace. It is `/slashforge:` now — see [Migrating](/slashforge/reference/migrating/).
4. If `status` shows nothing installed, re-run `npx slashforge` and watch for a permissions error on `~/.claude/`.
:::

### In Cursor or Codex

:::steps
1. **Check you installed the right target.** A plain `npx slashforge` installs for Claude Code only. You need `npx slashforge --target cursor`.
2. Run `npx slashforge status --target cursor` — note the `--target`, or it reports on the Claude install instead and will say "not installed" even when the agents install is fine.
3. **The names are hyphenated, not namespaced.** Type `/slashforge-code`, not `/slashforge:code`. Nothing on these targets supports the `:` form.
4. **In Codex, use `$`.** The skills are invoked as `$slashforge-code` rather than with a slash.
5. **Restart the editor.** Skills are discovered at session start.
6. Confirm the files are on disk: `ls ~/.agents/skills/`. You should see a `slashforge-code` directory containing `SKILL.md`.
:::

:::note
==`/slashforge-setup` is missing on purpose.== It provisions `.claude/` rules,
agents and hooks plus `CLAUDE.md`, which have no equivalent on Cursor or Codex.
Run `/slashforge:setup` from Claude Code to scaffold a repo.
:::

## It installed an old version

`npx slashforge` printed a version older than the one on npm, and commands you
expected are missing.

==`npx` prefers an executable already on your `PATH`.== If `npm install -g
slashforge` was ever run, `npx slashforge` runs that copy and never contacts the
registry, so it keeps installing the old release while reporting success.

```bash
which slashforge          # a path here is the problem
npm uninstall -g slashforge
npx slashforge            # now resolves the current release
```

Keep the global install instead if you prefer — `npm install -g
slashforge@latest` updates it in place. Either way `npx slashforge status` will
tell you whether the copy you just ran is current.

## A phase is being skipped

==Usually one of two things, and both are working as designed.==

- **`/slashforge:code` classified the task as trivial.** Phase 1 auto-detects
  small changes and skips brainstorming. Say `full flow` to override. See
  [Skills](/slashforge/guides/skills/) for what runs at each phase.
- **`-quick` is doing what it says.** Lean mode skips brainstorming and swaps
  the agent code review for an inline checklist. Every user gate and all
  verification stay.

:::note
==A skipped skill is always announced.== If a phase vanished with no message, that is
a bug worth reporting.
:::

## Setup will not overwrite a file

That is the `generated_by` marker working. ==A file whose marker is missing or has
been edited is treated as yours, and will only ever have gaps filled — never be
overwritten.==

==Delete the file if you genuinely want it regenerated from scratch.==

## Graphify is not being offered

`/slashforge:setup` only offers it when **at least 70% of non-trivial source
files** are in a supported language. On YAML, shell, or config-only repos it
skips silently. ==That is intended, not a failure== — see
[Graphify](/slashforge/guides/graphify/) for the supported languages.

## Verification fails but the code looks right

Phase 6 runs your repo's own lint, test, and build commands. If they pass
locally but fail in the run, ==the usual cause is a command that depends on
environment variables or services that the agent's shell does not have==. ==Fix the
command, not the workflow== — Phase 6 failing is the feature doing its job.

## Still stuck

[Open an issue](https://github.com/rajdeepratan/SlashForge/issues/new/choose)
and ==**include the output of `npx slashforge status`**==. It is the single most
useful thing you can attach.

For anything that does not belong in a public issue, email
[slashforge@rajdeepratan.com](mailto:slashforge@rajdeepratan.com).
