---
name: /slashforge:review-pr
description: Review a pull request against this repo's own rules and conventions, then post line-level comments or approve — only after you confirm. Lists PRs awaiting your review when there is more than one.
preflight: superpowers
---

Read `{{INSTALL_PATH}}/forge-workflow-agents.md` in full before starting.

This command is **read-only against your repo**. No branches, no commits, no edits to code. The
only writes are to GitHub, and only after you approve the exact text.

## Preflight

`gh` must be installed and authenticated, or nothing here works:

```bash
gh auth status >/dev/null 2>&1 || echo "NOT_AUTHENTICATED"
```

If not authenticated, stop and tell the user to run `gh auth login`. Do not attempt a workaround.

## Step 1 — Find the PRs

The argument, if any, is a PR number (`/slashforge:review-pr 42`) — use it directly and skip to
Step 2.

Otherwise list what is waiting on the user. **Review-requested is the default**, because that is
what "waiting on me" means on GitHub; `assignee` is a different relationship and is usually empty.

```bash
gh pr list --search "review-requested:@me" --state open --json number,title,author,isDraft,additions,deletions,changedFiles
```

If that returns nothing, widen once and say you widened:

```bash
gh pr list --assignee "@me" --state open --json number,title,author,isDraft,additions,deletions,changedFiles
```

**Skip drafts** unless the user asks for them — a draft is explicitly not ready.

**Zero PRs** → say so plainly and stop: *"No open PRs are waiting on your review in this repo."*
Do not invent work.

**Exactly one** → say which one and go straight to Step 2. Do not make the user choose from a
list of one.

**More than one** → show them as a numbered list with the size, because size determines whether a
review is meaningful:

```
1. #42  Add retry to the upload queue          alice    +180 −24  (6 files)
2. #47  Bump astro to 7.2                      bob       +12 −12  (2 files)
```

Ask which to review. Accept a number from the list or a PR number.

## Step 2 — Gather context before reading the diff

```bash
gh pr view <N> --json number,title,body,author,baseRefName,headRefName,isDraft,additions,deletions,changedFiles,reviews,comments
gh pr checks <N>
gh pr diff <N>
```

Three things to establish first:

- **Is it the user's own PR?** GitHub refuses to let anyone approve their own pull request. If
  `author` is the current user, approval is off the table for this run — say so at the gate and
  offer comment-only.
- **What has already been said?** Read existing reviews and comments. Repeating a point someone
  already made is noise, and contradicting it without acknowledgement is worse.
- **Is CI green?** `gh pr checks` is cheap. Approving over red checks is a bad look; mention the
  state in the summary either way.

**Size check.** Over roughly 1,500 changed lines, a single pass produces vague generalities. Say
so, then either ask which paths matter most or review the highest-risk files and state plainly
which ones you covered and which you did not. Never imply full coverage you did not achieve.

## Step 3 — Review against *this* repo

The standard is the Phase 7 checklist from `forge-workflow.md`, plus whatever this repo already
says about itself. Read, in this order:

1. `CLAUDE.md` — the repo's own instructions
2. `.claude/rules/` — any rule whose path scope matches the changed files
3. The surrounding code — match the conventions actually in use, not the ones you would pick

Then check:

- Does it do what the PR description claims, and nothing else? Scope creep is a finding.
- Duplicate code, dead code, debug leftovers, hardcoded secrets or credentials.
- Breaking changes to public APIs, exports, or shared interfaces — called out or accidental?
- Error handling at boundaries; unsafe assumptions about input, ordering, or nullability.
- Tests: do they cover the change? For a bugfix, does a test actually fail without the fix?
- Does it follow `.claude/rules/` and the repo's existing style?

**Severity matters more than volume.** Three findings that would break production beat twenty
style nits. Sort by severity and say which are blocking.

## Step 4 — Write the review document

`docs/slashforge/reviews/<YYYY-MM-DD>-pr-<N>.html`, built from the shared document shell — the
same one investigation reports, specs and plans use. Write **only the body fragment**.

```html
<h1>Review — PR #<N>: <title></h1>

<div class="summary">
  <!-- .needs-info if blocking findings exist, default green if approving -->
  <strong>Verdict:</strong> <approve / changes requested, in one line>
</div>

<h2>What this PR does</h2>
<p>In your own words, from reading the diff — not a restatement of the description.</p>

<h2>Findings</h2>
<table>
  <tr><th>Severity</th><th>File</th><th>Finding</th></tr>
  <tr><td>Blocking</td><td><code>src/x.js:42</code></td><td>...</td></tr>
  <tr><td>Should fix</td><td><code>src/y.js:88</code></td><td>...</td></tr>
  <tr><td>Nit</td><td><code>src/z.js:12</code></td><td>...</td></tr>
</table>

<h2>Checks</h2>
<ul>
  <li><strong>CI:</strong> ...</li>
  <li><strong>Tests cover the change:</strong> ...</li>
  <li><strong>Repo conventions:</strong> ...</li>
  <li><strong>Coverage of this review:</strong> which files were read, and any not reviewed</li>
</ul>
```

```bash
mkdir -p docs/slashforge/reviews
review="docs/slashforge/reviews/<YYYY-MM-DD>-pr-<N>.html"

node -e '
const fs = require("fs");
const [shell, frag, out, title] = process.argv.slice(1);
const body = fs.readFileSync(frag, "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
fs.writeFileSync(out, fs.readFileSync(shell, "utf8")
  .replace("<!--TITLE-->",   () => esc(title))
  .replace("<!--CONTENT-->", () => body));
' "{{INSTALL_PATH}}/forge-report-shell.html" "$fragment" "$review" "Review — PR #<N> (<YYYY-MM-DD>)"

sh "{{INSTALL_PATH}}/forge-open.sh" "$review"
```

Delete the scratch fragment afterwards.

## Step 5 — The gate

**Nothing is posted to GitHub before this point, and nothing is posted without an explicit yes.**

Summarise in chat: the verdict, the blocking findings, the counts by severity, and the file path.
Do not print the HTML.

Then show the **exact text that will appear on GitHub** — the top-level body and every line
comment, verbatim, not a paraphrase. It is public and attributed to the user.

Then ask, in one question:

> **"Post this review? `approve` · `comment` · `request-changes` · `edit` · `cancel`"**

- **approve** — only if there are no blocking findings, and only if the PR is not the user's own.
- **comment** — leaves the findings without blocking the merge.
- **request-changes** — blocks the merge until resolved. A stronger act than a comment; never
  choose it on the user's behalf.
- **edit** — they revise the text, then re-confirm.
- **cancel** — the document stays on disk, nothing is posted.

Never infer the choice from severity. Blocking findings make `request-changes` the obvious
suggestion, and you should say so — but the user picks.

## Step 6 — Post it

Line comments go through the reviews API, which takes them in one request alongside the body:

```bash
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)

cat > "$payload" <<'JSON'
{
  "event": "REQUEST_CHANGES",
  "body": "<the top-level summary>",
  "comments": [
    { "path": "src/x.js", "line": 42, "side": "RIGHT", "body": "<the finding>" }
  ]
}
JSON

gh api "repos/$repo/pulls/<N>/reviews" --input "$payload"
```

- `event` is `APPROVE`, `COMMENT`, or `REQUEST_CHANGES` — from the gate, never inferred.
- `line` must be a line **present in the diff**. A line outside it returns HTTP 422 and rejects
  the whole review, not just that comment.
- `side` is `RIGHT` for added or unchanged lines, `LEFT` for removed ones.

**If the request fails with 422**, do not retry blindly. The usual cause is a line comment
anchored outside the diff. Drop the offending comments into the top-level body, tell the user
which ones moved and why, and post again. An approval on the user's own PR also returns 422 —
that one is not recoverable, so fall back to `COMMENT`.

Escape the JSON properly. A stray quote or newline in a finding will corrupt the payload; build
it with `node`/`jq` rather than string-concatenating shell variables.

## Step 7 — Confirm

State what was posted, to which PR, with which event, and how many line comments landed. Link the
PR. Mention the review document path — it stays as the local record whether or not anything was
posted.

If findings were moved out of line comments into the body, say so here too.
