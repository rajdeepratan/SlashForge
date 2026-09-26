---
name: Claude Setup — Hooks
description: How to configure automated behaviors via hooks in .claude/settings.json
---

# Configuring Hooks

Hooks = **user-defined actions that run automatically at specific points in Claude Code's lifecycle**. Use them when the team wants something to happen deterministically — not "remind Claude to do it" but "the harness does it every time."

If the team wants Claude to *remember* something, that's CLAUDE.md or memory. If they want something to *always happen* regardless of what Claude decides, that's a hook.

---

## Where Hooks Live — `settings.json` Scopes

All hooks are configured in `settings.json`. Choose scope based on who the hook applies to:

| Scope | File | Applies to | Commit to git? |
|---|---|---|---|
| Managed | OS-level managed path | All users on the machine | N/A — deployed by IT |
| User | `~/.claude/settings.json` | You, across all projects | No |
| Project | `.claude/settings.json` | All collaborators on this repo | **Yes** |
| Local | `.claude/settings.local.json` | You, this repo only | No — gitignore it |

Team-wide automated behaviors → project scope. Personal preferences → user scope. Experiments → local scope.

---

## Hook Types

| Type | What it does |
|---|---|
| `command` | Runs a shell command, receives JSON on stdin. Most common. |
| `http` | POSTs event payload to a URL. For Slack/webhook integrations. |
| `prompt` | Sends a prompt to Claude for a yes/no judgment. |
| `agent` | Spawns a subagent with tool access to handle the event. |

---

## Common Events

Anthropic documents 28 event types. The ones most relevant to repo setup:

| Event | Fires when | Typical use |
|---|---|---|
| `SessionStart` | A Claude Code session opens | Prepend context, export env vars |
| `UserPromptSubmit` | User sends a prompt | Audit logging, redaction |
| `PreToolUse` | Before any tool runs | Block `rm -rf`, secret scanning, auto-approve known safe commands |
| `PostToolUse` | After a tool succeeds | Auto-run lint/tests after `Edit`, auto-invoke `code-reviewer` |
| `Stop` | Claude finishes a turn | Post to Slack, run verification |
| `Notification` | Permission prompts, approvals | Route approvals to phone/desktop notification |
| `PreCompact` / `PostCompact` | Before/after context compaction | Persist important facts to memory |
| `SubagentStop` | A subagent finishes | Capture subagent output for audit |

Match events by tool name using `matcher` — e.g. only fire on `Edit|Write`, or on `Bash` commands matching `git commit *`.

---

## Config Structure

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/run-lint.sh",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Exit codes:
- `0` → success
- `2` → **blocking error**; stderr is fed back to Claude as feedback
- Any other non-zero → non-blocking error; Claude continues

Only exit code `2` blocks. Exit `1` does not — that's a common surprise.

---

## Common Patterns for Repo Setup

- **Auto-run code-reviewer after implementation** — `PostToolUse` on `Edit|Write` that invokes the review agent
- **Block secret commits** — `PreToolUse` on `Bash(git commit *)` that greps the staged diff for API keys, tokens, or `.env` content
- **Auto-approve safe reads** — `PreToolUse` that returns `{"permissionDecision": "allow"}` for idempotent commands (`ls`, `git status`, `npm ls`)
- **Post-session Slack ping** — `Stop` hook with `type: "http"` to a webhook
- **Prepend repo context** — `SessionStart` hook that outputs the current branch or recent commits

Keep hook scripts in `.claude/hooks/` and reference them via `$CLAUDE_PROJECT_DIR` so they work regardless of Claude's current directory.

---

## Setting Up Hooks in a Repo

1. Ask the team what should happen *automatically* vs what should be agent-guided behavior
2. Decide scope (project if team-shared, local if personal)
3. Use the `update-config` skill if it's available:
   ```
   /update-config
   ```
4. Or edit `.claude/settings.json` directly — add the `hooks` section
5. Document any project-scoped hooks in `CLAUDE.md` under an **Automated Behaviors** section so the team knows what runs without being asked
6. Test by triggering the event (run an edit, start a session) and checking logs or side effects

---

## Security

- Hooks run with the same permissions as Claude Code — they can read/write anywhere the user can
- Never put secrets in the command string — use `$CLAUDE_PROJECT_DIR` + env vars
- For org-wide policies (e.g. "always block writing to `/etc`"), use managed scope so individual developers can't disable them
- `"disableAllHooks": true` in settings disables hooks (except managed)

---

## Scope of This Guide

- Focus on hooks teams commonly want for repo setup — not an exhaustive event reference
- If a team needs a hook the kit's examples don't cover, read [Anthropic's hooks docs](https://code.claude.com/docs/en/hooks) for the full event list and JSON schemas
- Hooks are deterministic — use them for enforcement, not for "nudging" Claude
