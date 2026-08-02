---
name: /slashforge:review-pr
description: Review a pull request against this repo's own rules and conventions, then post line-level comments or approve — only after you confirm. Lists PRs awaiting your review; pass --assigned, --mine or --all to change what it looks for.
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

Parse the argument first. It is one of four things:

| Argument | Meaning |
|---|---|
| a number, e.g. `42` | Review that PR. Skip discovery entirely, go to Step 2 |
| `--assigned` | Discover by `assignee:@me` only |
| `--mine` | Discover your own PRs (`author:@me`) |
| `--all` | Discover all three relationships, grouped and labelled |
| nothing | Default discovery, below |

These are SlashForge's own flags. Do not pass them through to `gh` — they select which query to
run, and the queries below are the only ones you run.

### Default discovery

**Review-requested first**, because that is what "waiting on me" means on GitHub. `assignee` is a
different relationship — it is the same field issues use, meaning "responsible for this" — and
most teams never set it on PRs.

```bash
gh pr list --search "review-requested:@me" --state open \
  --json number,title,author,isDraft,additions,deletions,changedFiles
```

If that returns nothing, widen to assignee once, and **say that you widened** so the result is not
mistaken for a review request:

```bash
gh pr list --assignee "@me" --state open \
  --json number,title,author,isDraft,additions,deletions,changedFiles
```

### The explicit flags

- **`--assigned`** — run only the assignee query. Use this when the team routes reviews by
  assigning rather than requesting. No fallback and no "widened" notice, since it was asked for.
- **`--mine`** — run `gh pr list --author "@me"`. This is self-review: GitHub refuses to let
  anyone approve their own pull request, so **`approve` is unavailable for every PR in this set**.
  Say that when listing, not at the gate — the user should know before choosing what to spend time
  on.
- **`--all`** — run all three and present them in labelled groups, most actionable first:

  ```
  Awaiting your review
    1. #42  Add retry to the upload queue        alice   +180 −24  (6 files)

  Assigned to you
    2. #51  Flaky integration test               carol    +40 −8   (2 files)

  Yours (comment only — GitHub blocks self-approval)
    3. #55  Bump astro to 7.2                    you      +12 −12  (2 files)
  ```

  A PR can appear in more than one relationship. List it once, under the most actionable group.

### In every mode

**Skip drafts** unless the user asks for them — a draft is explicitly not ready.

**Zero PRs** → say so plainly and stop, naming which query came back empty so the user can try
another flag: *"No open PRs are awaiting your review in this repo. Try `--mine` for your own, or
`--all` to see everything."* Do not invent work.

**Exactly one** → say which one and go to Step 2. Do not offer a menu of one.

**More than one** → numbered list with author and size. Size determines whether a review can be
meaningful at all, so it belongs in the list, not buried in Step 2.

```
1. #42  Add retry to the upload queue          alice    +180 −24  (6 files)
2. #47  Bump astro to 7.2                      bob       +12 −12  (2 files)
```

Ask which to review. Accept a list position or a PR number.

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

- **approve** — only if there are no blocking findings, and only if the PR is not the user's own. Withdrawn entirely under `--mine`, and whenever Step 2 found the author is the current user.
- **comment** — leaves the findings without blocking the merge.
- **request-changes** — blocks the merge until resolved. A stronger act than a comment; never
  choose it on the user's behalf.
- **edit** — they revise the text, then re-confirm.
- **cancel** — the document stays on disk, nothing is posted.

Never infer the choice from severity. Blocking findings make `request-changes` the obvious
suggestion, and you should say so — but the user picks.

## Step 6 — Post it

Line comments and the summary go up as **one review**, through the reviews API.

### Build the payload without escaping prose by hand

Findings are prose you wrote. They will contain quotes, apostrophes, backticks, newlines and
occasionally backslashes. Interpolating that into a JSON string literal by hand is how the payload
gets corrupted — and a corrupted payload either fails outright or, worse, posts something mangled
under the user's name.

So **prose never touches JSON syntax.** Write it to plain-text files, keep only anchors in JSON,
and let `JSON.stringify` do the escaping:

```bash
d=$(mktemp -d)

# 1. The top-level summary — plain text, nothing to escape.
cat > "$d/body.txt"    # write the summary here

# 2. One plain-text file per line comment — again, nothing to escape.
cat > "$d/c1.txt"      # the finding for the first anchor
cat > "$d/c2.txt"      # ...and so on

# 3. Anchors only: paths, line numbers, sides. No prose, so this is safe to
#    write as literal JSON.
cat > "$d/anchors.json" <<'JSON'
[
  { "path": "src/x.js", "line": 42, "side": "RIGHT", "bodyFile": "c1.txt" },
  { "path": "src/y.js", "line": 88, "side": "RIGHT", "bodyFile": "c2.txt" }
]
JSON

# 4. Assemble. JSON.stringify escapes every string correctly, by construction.
node -e '
const fs = require("fs"), path = require("path");
const [dir, event, out] = process.argv.slice(1);
const anchors = JSON.parse(fs.readFileSync(path.join(dir, "anchors.json"), "utf8"));
fs.writeFileSync(out, JSON.stringify({
  event,
  body: fs.readFileSync(path.join(dir, "body.txt"), "utf8"),
  comments: anchors.map((a) => ({
    path: a.path,
    line: a.line,
    side: a.side || "RIGHT",
    body: fs.readFileSync(path.join(dir, a.bodyFile), "utf8"),
  })),
}));
' "$d" "<EVENT>" "$d/payload.json"
```

`<EVENT>` is `APPROVE`, `COMMENT`, or `REQUEST_CHANGES` — taken from the gate, never inferred.

An approval carries no line comments. If the gate chose `APPROVE`, write an empty
`anchors.json` (`[]`) and let the summary stand alone.

### Send it

```bash
repo=$(gh repo view --json nameWithOwner -q .nameWithOwner)
gh api "repos/$repo/pulls/<N>/reviews" --input "$d/payload.json"
```

Then `rm -rf "$d"` — the scratch files are not part of the deliverable.

### When it fails

- **422 with an out-of-diff line.** `line` must be a line **present in the diff**; one outside it
  rejects the entire review, not just that comment. Remove those anchors, append their findings to
  `body.txt` instead, rebuild, and send again. Tell the user which findings moved and why.
- **422 on an approval of the user's own PR.** GitHub does not allow it. Not recoverable — fall
  back to `COMMENT`.
- **Anything else.** Show the actual error. Do not retry blindly, and do not fall back to a
  different event than the one the user chose.

`side` is `RIGHT` for added or unchanged lines, `LEFT` for removed ones. Getting it wrong on a
deleted line is another route to a 422.

## Step 7 — Confirm

State what was posted, to which PR, with which event, and how many line comments landed. Link the
PR. Mention the review document path — it stays as the local record whether or not anything was
posted.

If findings were moved out of line comments into the body, say so here too.
