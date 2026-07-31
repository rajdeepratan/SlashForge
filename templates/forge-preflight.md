---
name: Claude Setup — Preflight Checks
description: Shared preflight check for superpowers. Run before any command that depends on it. Detects missing dependency, explains why it matters, offers install, proceeds or runs explicitly degraded. Session-scoped decline memory — never re-asks in the same session.
---

# Preflight Checks

Loaded by every command that lists a `preflight:` in its frontmatter. Goal: **never let a command run silently degraded.** If a required dependency is missing, ask once, explain why, offer install, and either proceed with full capability or continue explicitly degraded.

Run only the checks a command lists in its frontmatter. **Session-scoped answers** — if the user declines, remember that choice for the rest of the conversation and do not re-ask.

---

## Superpowers Check

Triggered by `preflight: superpowers`.

### Why it matters (show verbatim to the user when prompting)

> **Why superpowers matters for this workflow:** the 10-phase flow depends on five skills — `superpowers:brainstorming` (Phase 1), `superpowers:writing-plans` (Phase 2), `superpowers:test-driven-development` (Phase 5, features), `superpowers:systematic-debugging` (Phase 5, bugs), `superpowers:verification-before-completion` (Phase 6). Without them the phases still run but the discipline layer is gone — most importantly, for bug fixes you lose the "failing regression test must exist and must have failed before the fix" guarantee.

### Detection

```bash
ls ~/.claude/plugins/cache/*/superpowers 2>/dev/null && echo "INSTALLED" || echo "MISSING"
```

`INSTALLED` → proceed silently. `MISSING` → install flow.

### Install flow

1. Print the **Why it matters** block above.
2. Ask: **"Install superpowers now? (y/n)"**
3. On `y`: tell the user to type `/plugin install superpowers@claude-plugins-official` into chat (Claude cannot run `/plugin` on their behalf). Wait for confirmation, re-run detection. If still `MISSING`, ask whether to continue degraded or abort.
4. On `n`: warn once — *"Proceeding in degraded mode. Phase 1 brainstorming, Phase 2 plan structuring, Phase 5 TDD / systematic-debugging, and Phase 6 verification will skip their skill invocations. For bug fixes this means no enforced red→green regression test."* Remember the decline.

---

## What a declined check means, per command

- **Superpowers declined** → all `superpowers:` skill calls replaced with their written fallback from the workflow files. State the degradation once at run start. Never silently skip a skill.
