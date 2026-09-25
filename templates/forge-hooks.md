---
name: Claude Setup — Hooks
<!--target:claude-->
description: How to configure automated behaviors via hooks in .claude/settings.json
<!--/target-->
<!--target:cursor-->
description: How to configure automated behaviors via hooks in .cursor/hooks.json
<!--/target-->
<!--target:codex-->
description: How to configure automated behaviors via hooks in .codex/hooks.json
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
(global). Every source loads and all matching hooks run. A hook is a process that reads
JSON on stdin and may answer with JSON on stdout, invoked at stages of the agent loop.

Cursor's hook model is its own — camelCase event names, a flat list of hooks per event,
and a required `"version": 1`. Hook configs written for other agents do not work here,
so write every hook from the events and examples below.
<!--/target-->
<!--target:codex-->
Hooks = **user-defined shell scripts that run automatically at points in the agent loop**. Use them when the team wants something to happen deterministically — not "remind the agent to do it" but "the harness does it every time."

If the team wants the agent to *remember* something, that's `AGENTS.md`. If they want
something to *always happen* regardless of what the agent decides, that's a hook.

**Location:** `.codex/hooks.json` (project, checked in) or `~/.codex/hooks.json`
(global); hooks can also be inline `[hooks]` tables in `config.toml`. Every source loads.
Project hooks load only once the repo's `.codex/` is trusted — say so when you propose one,
or the team will think the hook is broken.

Hooks are on by default. A team that turned them off has this in `config.toml`, and needs
it back to `true`:

```toml
[features]
hooks = true
```

`/hooks` in the CLI inspects hook sources, shows new or changed hooks, and trusts or
disables individual ones.
<!--/target-->

---

<!--target:claude-->
## Where Hooks Live — `settings.json` Scopes

All hooks are configured in `settings.json`. Choose scope based on who the hook applies to:

| Scope | File | Applies to | Commit to git? |
|---|---|---|---|
| Managed | OS-level managed path | All users on the machine | N/A — deployed by IT |
| User | `~/.claude/settings.json` | You, across all projects | No |
| Project | `.claude/settings.json` | All collaborators on this repo | **Yes** |
| Local | `.claude/settings.local.json` | You, this repo only | No — gitignore it |

Team-wide automated behaviors → project scope. Personal preferences → user scope. Experiments → local scope.
<!--/target-->
<!--target:cursor-->
## Where Hooks Live — `hooks.json` Scopes

| Scope | File | Applies to | Commit to git? |
|---|---|---|---|
| Enterprise | `/Library/Application Support/Cursor/hooks.json`, `/etc/cursor/hooks.json`, `C:\ProgramData\Cursor\hooks.json` | All users on the machine | N/A — deployed by IT |
| Project | `.cursor/hooks.json` | All collaborators on this repo | **Yes** |
| User | `~/.cursor/hooks.json` | You, across all projects | No |

Every source loads and all matching hooks run; when their answers differ, `deny` beats
`ask` beats `allow`. There is no local scope, so anything you do not want shared belongs
in the user file.

Team-wide automated behaviors → project scope. Personal preferences → user scope.
<!--/target-->
<!--target:codex-->
## Where Hooks Live

| Scope | File | Applies to | Commit to git? |
|---|---|---|---|
| User | `~/.codex/hooks.json` | You, across all projects | No |
| Project | `.codex/hooks.json` | All collaborators on this repo | **Yes** |

Every source loads; a later layer adds to an earlier one rather than replacing it. There is
no local scope, so anything you do not want shared belongs in the user file.

Team-wide automated behaviors → project scope. Personal preferences → user scope.
<!--/target-->

---

<!--target:claude-->
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

<!--/target-->
<!--target:cursor-->
## Hook Types

| Type | What it does |
|---|---|
| `command` | Runs a shell command, receives JSON on stdin, may answer with JSON on stdout. The default. |
| `prompt` | Asks a model to judge a natural-language condition. |

---

## Common Events

Cursor documents more events than these. The ones most relevant to repo setup:

| Event | Fires when | Typical use |
|---|---|---|
| `sessionStart` | An agent session opens | Add context, export env vars for the session |
| `beforeSubmitPrompt` | Before a prompt is sent | Audit logging, redaction; `{"continue": false}` blocks it |
| `beforeShellExecution` | Before a shell command runs | Block `rm -rf`, gate `git commit`, approve known-safe commands |
| `afterShellExecution` | After a shell command runs | Audit logging |
| `beforeMCPExecution` | Before an MCP tool call | Allow or deny by server or tool |
| `beforeReadFile` | Before the agent reads a file | Keep `.env` and secrets out of context |
| `afterFileEdit` | After the agent edits a file | Run the formatter or linter on that file |
| `preToolUse` / `postToolUse` | Around any tool call | Generic allow/deny, or add context after a tool |
| `subagentStop` | A subagent finishes | Capture its summary for audit |
| `stop` | The agent finishes | Run verification; a `followup_message` sends it back to work |

`matcher` is an optional regex that narrows which calls fire a hook — on
`beforeShellExecution`, it is matched against the command.

---

## Config Structure

```json
{
  "version": 1,
  "hooks": {
    "afterFileEdit": [
      { "command": ".cursor/hooks/run-lint.sh", "timeout": 60 }
    ],
    "beforeShellExecution": [
      { "command": ".cursor/hooks/check-commit.sh", "matcher": "git commit" }
    ]
  }
}
```

`"version": 1` is required, and each event takes a flat list of hooks — each one a
`command`, with optional `timeout`, `matcher` and `failClosed`. Project hooks run from the
project root, so a repo-relative path works.

Permission hooks (`beforeShellExecution`, `beforeMCPExecution`, `beforeReadFile`,
`preToolUse`) answer on stdout:

```
{"permission": "deny", "user_message": "Staged diff contains an API key", "agent_message": "Remove the key before committing"}
```

`permission` is `allow`, `deny` or `ask` (`preToolUse` takes only `allow` or `deny`).

Exit codes:
- `0` → success; the JSON on stdout is used. For a permission hook, invalid or mismatched JSON **blocks** the action
- `2` → **block**, the same as `"permission": "deny"`
- Any other non-zero → the hook failed and the action **proceeds**, unless the hook sets `"failClosed": true`

Fail-open is the default, so a crashing security hook lets everything through. Set
`failClosed` on any hook that guards something.

---

## Common Patterns for Repo Setup

- **Lint after an edit** — `afterFileEdit` running the linter on the `file_path` it receives
- **Block secret commits** — `beforeShellExecution` with `"matcher": "git commit"` that greps the staged diff and answers `{"permission": "deny"}`, with `"failClosed": true`
- **Keep secrets out of context** — `beforeReadFile` that denies `.env` and key files
- **Gate network commands** — `beforeShellExecution` with `"matcher": "curl|wget"` answering `ask`
- **Add repo context** — `sessionStart` returning `additional_context` with the branch or recent commits
- **Verify before finishing** — `stop` that runs the tests and, on failure, returns a `followup_message` sending the agent back

<!--/target-->
<!--target:codex-->
## Hook Types

| Type | What it does |
|---|---|
| `command` | Runs a shell command, receives JSON on stdin. Most common. |
| `mcp_tool` | Calls a tool on a connected MCP server with structured input. |

Codex parses other types but skips them.

---

## Common Events

| Event | Fires when | Typical use |
|---|---|---|
| `SessionStart` | A session starts or resumes | Add context |
| `UserPromptSubmit` | User sends a prompt | Audit logging, redaction |
| `PreToolUse` | Before a tool runs | Block `rm -rf`, secret scanning, rewrite a command |
| `PermissionRequest` | Codex asks for approval | Auto-allow or deny known cases |
| `PostToolUse` | After a tool runs | Run lint/tests after `apply_patch` |
| `Stop` | Codex finishes a turn | Run verification; block to send it back |
| `PreCompact` / `PostCompact` | Around context compaction | Persist important facts |
| `SubagentStop` | A subagent finishes | Capture its output for audit |

`matcher` is a regex. On the tool events it matches the tool name — `Bash`, `apply_patch`,
an MCP tool — and it is ignored on `UserPromptSubmit` and `Stop`.

---

## Config Structure

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "apply_patch",
        "hooks": [
          {
            "type": "command",
            "command": "\"$(git rev-parse --show-toplevel)/.codex/hooks/run-lint.sh\"",
            "timeout": 60
          }
        ]
      }
    ]
  }
}
```

Commands run in the session's working directory, so anchor repo scripts at the git root as
above — a bare relative path breaks when Codex starts in a subfolder.

Exit codes:
- `0` → success; stdout is read as JSON
- `2` → **blocking**, with stderr fed back — on `PreToolUse`, `PostToolUse`, `UserPromptSubmit` and `PermissionRequest`. On other events it counts as a failure
- Any other non-zero → the hook failed; Codex continues

---

## Common Patterns for Repo Setup

- **Lint after an edit** — `PostToolUse` on `apply_patch` that runs the linter
- **Block secret commits** — `PreToolUse` on `Bash` that checks for `git commit`, greps the staged diff, and denies with `permissionDecision: "deny"`
- **Add repo context** — `SessionStart` that prints the branch or recent commits
- **Verify before finishing** — `Stop` that runs the tests and returns `{"decision": "block", "reason": ...}` to send Codex back

<!--/target-->
<!--target:claude-->
Keep hook scripts in `.claude/hooks/` and reference them via `$CLAUDE_PROJECT_DIR` so they work regardless of Claude's current directory.
<!--/target-->
<!--target:cursor-->
Keep hook scripts in `.cursor/hooks/` and reference them by a repo-relative path — project hooks run from the project root. `$CURSOR_PROJECT_DIR` is also set if a script needs the root.
<!--/target-->
<!--target:codex-->
Keep hook scripts in `.codex/hooks/` and reference them from the git root (`$(git rev-parse --show-toplevel)/.codex/hooks/…`) so they work regardless of the agent's current directory.
<!--/target-->

---

## Setting Up Hooks in a Repo

1. Ask the team what should happen *automatically* vs what should be agent-guided behavior
<!--target:claude-->
2. Decide scope (project if team-shared, local if personal)
3. Use the `update-config` skill if it's available:
   ```
   /update-config
   ```
4. Or edit `.claude/settings.json` directly — add the `hooks` section
5. Document any project-scoped hooks in `CLAUDE.md` under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
<!--target:cursor-->
2. Decide scope (project if team-shared, user if personal)
3. Edit `.cursor/hooks.json` — keep `"version": 1` at the top
4. Document any project-scoped hooks in `AGENTS.md` under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
<!--target:codex-->
2. Decide scope (project if team-shared, user if personal)
3. Edit `.codex/hooks.json` — and check `[features] hooks` isn't set to `false` in `config.toml`
4. Document any project-scoped hooks in the root `AGENTS.md` under an **Automated Behaviors** section so the team knows what runs without being asked
<!--/target-->
<!--target:claude-->
6. Test by triggering the event (run an edit, start a session) and checking logs or side effects
<!--/target-->
<!--target:agents-->
5. Test by triggering the event (run an edit, start a session) and checking logs or side effects
<!--/target-->

---

## Security

<!--target:claude-->
- Hooks run with the same permissions as Claude Code — they can read/write anywhere the user can
- Never put secrets in the command string — use `$CLAUDE_PROJECT_DIR` + env vars
- For org-wide policies (e.g. "always block writing to `/etc`"), use managed scope so individual developers can't disable them
- `"disableAllHooks": true` in settings disables hooks (except managed)
<!--/target-->
<!--target:cursor-->
- Hooks run with the same permissions as the agent — they can read/write anywhere the user can
- Never put secrets in the command string — use env vars
- For org-wide policies, use the enterprise `hooks.json` so individual developers can't remove them
- Set `"failClosed": true` on any hook that enforces something; the default lets the action through when the hook crashes
<!--/target-->
<!--target:codex-->
- Hooks run with the same permissions as the agent — they can read/write anywhere the user can
- Never put secrets in the command string — use env vars
<!--/target-->

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
- If a team needs a hook the kit's examples don't cover, read [Codex's hooks docs](https://learn.chatgpt.com/docs/hooks) for the full event list and JSON schemas
<!--/target-->
<!--target:claude-->
- Hooks are deterministic — use them for enforcement, not for "nudging" Claude
<!--/target-->
<!--target:agents-->
- Hooks are deterministic — use them for enforcement, not for "nudging" the agent
<!--/target-->
