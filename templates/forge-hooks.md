---
name: Claude Setup — Hooks
<!--target:claude-->
description: How to configure automated behaviors via hooks in .claude/settings.json
<!--/target-->
<!--target:cursor-->
description: How to configure automated behaviors via hooks in .cursor/hooks.json
<!--/target-->
<!--target:codex-->
description: How to configure automated behaviors via hooks in .codex/hooks.json (beta)
<!--/target-->
<!--target:neutral-->
description: How to configure automated behaviors via the host's hook configuration
<!--/target-->
---

# Configuring Hooks

<!--target:claude-->
Hooks = **user-defined actions that run automatically at specific points in Claude Code's lifecycle**. Use them when the team wants something to happen deterministically — not "remind Claude to do it" but "the harness does it every time."

If the team wants Claude to *remember* something, that's CLAUDE.md or memory. If they want something to *always happen* regardless of what Claude decides, that's a hook.
<!--/target-->
<!--target:cursor-->
Hooks = **user-defined actions that run automatically at specific points in the agent's lifecycle**. Use them when the team wants something to happen deterministically — not "remind the agent to do it" but "the harness does it every time."

If the team wants the agent to *remember* something, that's `AGENTS.md` or a rule. If they want something to *always happen* regardless of what the agent decides, that's a hook.

**Location:** `.cursor/hooks.json` (project, checked in) or `~/.cursor/hooks.json`
(global). Both load. A hook is a process that speaks JSON over stdio, invoked around
stages of the agent loop: `beforeSubmitPrompt`, `beforeShellExecution`, `afterFileEdit`,
and `stop`.
<!--/target-->
<!--target:codex-->
Hooks = **user-defined shell scripts that run automatically at points in the agent loop**. Use them when the team wants something to happen deterministically — not "remind the agent to do it" but "the harness does it every time."

If the team wants the agent to *remember* something, that's `AGENTS.md`. If they want
something to *always happen* regardless of what the agent decides, that's a hook.

**Location:** `.codex/hooks.json` (project, checked in) or `~/.codex/hooks.json`
(global). Both load, project first.

**Hooks are beta and off by default.** They require this in `config.toml`:

```toml
[features]
codex_hooks = true
```

Say so when you propose a hook — without that flag the file is inert and the team will
think the hook is broken. `/hooks` in the CLI inspects hook sources, shows new or changed
hooks, and trusts or disables individual ones.
<!--/target-->
<!--target:neutral-->
Hooks = **user-defined actions that run automatically at specific points in the agent's lifecycle**. Use them when the team wants something to happen deterministically — not "remind the agent to do it" but "the harness does it every time."

Check the host's own documentation for its hook file location and event names before
writing one.
<!--/target-->

---

## Where Hooks Live — `settings.json` Scopes

All hooks are configured in `settings.json`. Choose scope based on who the hook applies to:

| Scope | File | Applies to | Commit to git? |
|---|---|---|---|
| Managed | OS-level managed path | All users on the machine | N/A — deployed by IT |
<!--target:claude-->
| User | `~/.claude/settings.json` | You, across all projects | No |
| Project | `.claude/settings.json` | All collaborators on this repo | **Yes** |
| Local | `.claude/settings.local.json` | You, this repo only | No — gitignore it |
<!--/target-->
<!--target:cursor-->
| User | `~/.cursor/hooks.json` | You, across all projects | No |
| Project | `.cursor/hooks.json` | All collaborators on this repo | **Yes** |

Both load together; there is no separate local scope, so anything you do not want shared
belongs in the user file.
<!--/target-->
<!--target:codex-->
| User | `~/.codex/hooks.json` | You, across all projects | No |
| Project | `.codex/hooks.json` | All collaborators on this repo | **Yes** |

Both load, project first. There is no separate local scope, so anything you do not want
shared belongs in the user file.
<!--/target-->
<!--target:neutral-->
Check the host's own documentation for its hook file locations and which of them are
meant to be checked in.
<!--/target-->

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
<!--target:claude-->
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/run-lint.sh",
<!--/target-->
<!--target:cursor-->
            "command": "./.cursor/hooks/run-lint.sh",
<!--/target-->
<!--target:codex-->
            "command": "./.codex/hooks/run-lint.sh",
<!--/target-->
<!--target:neutral-->
            "command": "./hooks/run-lint.sh",
<!--/target-->
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

<!--target:claude-->
Keep hook scripts in `.claude/hooks/` and reference them via `$CLAUDE_PROJECT_DIR` so they work regardless of Claude's current directory.
<!--/target-->
<!--target:cursor-->
Keep hook scripts in `.cursor/hooks/` and reference them by a repo-relative path so they work regardless of the agent's current directory.
<!--/target-->
<!--target:codex-->
Keep hook scripts in `.codex/hooks/` and reference them by a repo-relative path so they work regardless of the agent's current directory.
<!--/target-->
<!--target:neutral-->
Keep hook scripts in a directory beside the hook config and reference them by a repo-relative path.
<!--/target-->

---

## Setting Up Hooks in a Repo

1. Ask the team what should happen *automatically* vs what should be agent-guided behavior
2. Decide scope (project if team-shared, local if personal)
3. Use the `update-config` skill if it's available:
   ```
   /update-config
   ```
<!--target:claude-->
4. Or edit `.claude/settings.json` directly — add the `hooks` section
5. Document any project-scoped hooks in `CLAUDE.md` under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
<!--target:cursor-->
4. Or edit `.cursor/hooks.json` directly
5. Document any project-scoped hooks in `AGENTS.md` under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
<!--target:codex-->
4. Or edit `.codex/hooks.json` directly — and set `[features] codex_hooks = true` in `config.toml`, or it stays inert
5. Document any project-scoped hooks in the root `AGENTS.md` under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
<!--target:neutral-->
4. Or edit the host's hook config directly
5. Document any project-scoped hooks in the entry file under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
6. Test by triggering the event (run an edit, start a session) and checking logs or side effects

---

## Security

- Hooks run with the same permissions as Claude Code — they can read/write anywhere the user can
<!--target:claude-->
- Never put secrets in the command string — use `$CLAUDE_PROJECT_DIR` + env vars
<!--/target-->
<!--target:cursor-->
- Never put secrets in the command string — use env vars
<!--/target-->
<!--target:codex-->
- Never put secrets in the command string — use env vars
<!--/target-->
<!--target:neutral-->
- Never put secrets in the command string — use env vars
<!--/target-->
- For org-wide policies (e.g. "always block writing to `/etc`"), use managed scope so individual developers can't disable them
- `"disableAllHooks": true` in settings disables hooks (except managed)

---

## Scope of This Guide

- Focus on hooks teams commonly want for repo setup — not an exhaustive event reference
<!--target:claude-->
- If a team needs a hook the kit's examples don't cover, read [Anthropic's hooks docs](https://code.claude.com/docs/en/hooks) for the full event list and JSON schemas
<!--/target-->
<!--target:cursor-->
- If a team needs a hook the kit's examples don't cover, read [Cursor's hooks docs](https://cursor.com/docs/hooks) for the full event list and JSON schemas
<!--/target-->
<!--target:codex-->
- If a team needs a hook the kit's examples don't cover, read [Codex's hooks docs](https://developers.openai.com/codex/hooks) for the full event list and JSON schemas
<!--/target-->
<!--target:neutral-->
- If a team needs a hook the kit's examples don't cover, read the host's own hooks documentation for the full event list and JSON schemas
<!--/target-->
- Hooks are deterministic — use them for enforcement, not for "nudging" Claude
