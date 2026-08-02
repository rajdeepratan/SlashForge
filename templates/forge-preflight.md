---
name: Claude Setup — Preflight Checks
description: Shared capability detection for optional integrations. Run before any command that lists a preflight. Records what is available and adjusts which optional phases apply. Never blocks, never prompts.
---

# Preflight Checks

Loaded by every command that lists a `preflight:` in its frontmatter. Goal: **know what is available before the flow starts**, so optional capabilities are used when present and skipped cleanly when not.

These checks detect; they do not gate. SlashForge's disciplines ship with SlashForge, so no command has a hard dependency on anything external. Run only the checks a command lists, and record the result for the session.

---

## Superpowers Check

Triggered by `preflight: superpowers`. **This is capability detection, not a gate.** It never
blocks, never prompts, and never asks the user to install anything.

SlashForge ships its own skills for Phases 1, 2, 5, 6 and 9 — `slashforge:brainstorm`,
`slashforge:plan`, `slashforge:debug`, `slashforge:tdd`, `slashforge:verify`,
`slashforge:review-feedback`. Those are always present, so the discipline layer no longer
depends on a third-party plugin.

### Detection

```bash
ls ~/.claude/plugins/cache/*/superpowers 2>/dev/null && echo "INSTALLED" || echo "MISSING"
```

Record the result for the rest of the session. Say nothing to the user either way — a run that
opens by announcing a plugin's absence is noise when nothing is actually lost.

### What the result changes

| Result | Effect |
|---|---|
| `INSTALLED` | Three optional capabilities become available: `superpowers:using-git-worktrees` (Phase 4, when isolation is warranted), `superpowers:subagent-driven-development` (Phase 5, only for genuinely parallelisable units), and `superpowers:requesting-code-review` (Phase 7, to dispatch a reviewer subagent). |
| `MISSING` | All three are skipped. Phase 4 branches normally without a worktree; Phase 5 uses `slashforge:tdd`; Phase 7 reviews against its own checklist. Every other phase is unaffected. |

Nothing is degraded when it is missing. Do not describe it as degraded, and do not offer to
install it mid-run. If the user asks, the command is
`/plugin install superpowers@claude-plugins-official` — Claude cannot run `/plugin` on their
behalf.

---

## Optional integrations, in general

An integration is optional when its absence costs a capability rather than a guarantee. Both of
SlashForge's current integrations qualify:

- **superpowers** — three optional capabilities, as above.
- **Graphify** — a one-time offer inside `/slashforge:setup`, not a per-command check.

Neither is ever a precondition for running a command.
