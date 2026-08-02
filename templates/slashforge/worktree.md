---
name: /slashforge:worktree
description: Create an isolated workspace for risky or long-running work, so the main checkout stays usable. Use when a change would disturb a running dev server, might be abandoned, or needs to run alongside the branch it came from.
---

<!--
Adapted from the `using-git-worktrees` skill in superpowers.
Copyright (c) 2025 Jesse Vincent. Licensed under the MIT License.
https://github.com/obra/superpowers

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions: the above copyright notice and this
permission notice shall be included in all copies or substantial portions of the
Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
-->

# Isolated Workspace

A worktree is a second checkout of the same repository in its own directory, sharing one `.git`.
The main checkout stays exactly as it was — still on its branch, still running whatever it was
running.

## When it is worth it

- A dev server, watcher, or long test run is live on the current branch and you need it to stay up.
- The change is risky enough that you might abandon it, and you want throwing it away to be
  `rm -rf` rather than an unpick.
- Two branches need to run side by side — comparing behaviour, or bisecting against a baseline.

**When it is not:** ordinary feature work. A branch in the current checkout is simpler, and a
worktree you did not need is a second dependency install and a directory to forget about.

## Step 1 — Check you are not already isolated

```bash
[ "$(git rev-parse --git-dir)" = "$(git rev-parse --git-common-dir)" ] \
  && echo "normal checkout" || echo "already a worktree"
```

If it already says worktree, **stop and use it**. Nesting worktrees works but leaves a tree nobody
can reason about later. A submodule also reports as separate — treat that as a normal repo.

## Step 2 — Create it

```bash
repo=$(basename "$(git rev-parse --show-toplevel)")
git worktree add "../${repo}-<branch>" -b "<branch>"
cd "../${repo}-<branch>"
```

Sibling to the repo, not inside it — a worktree nested in its own parent gets swept up by build
globs, linters, and `rm -rf`.

## Step 3 — Install dependencies

**This is the step everyone forgets.** A fresh worktree shares git history, not build artefacts.
There is no `node_modules`, no `target/`, no `.venv`, no `vendor/`. Nothing runs until you install.

Use whatever the repo actually uses:

| Ecosystem | Command |
|---|---|
| Node | `npm ci` (or `pnpm i` / `yarn`, matching the lockfile present) |
| Rust | `cargo fetch` |
| Python | recreate the venv, then install from the lockfile |
| Go | `go mod download` |

Untracked-but-required files do not come across either — `.env`, local certificates, seeded
databases. Copy what the project needs.

## Step 4 — Verify the baseline before touching anything

```bash
npm test    # or the project's equivalent
```

Run the suite **before** making a single change. If it is already red, you need to know that now —
otherwise the first failure after your edit is ambiguous, and you will spend an hour on a fault
that was there when you arrived.

State the baseline plainly: *"Baseline: 41/41 pass"* or *"Baseline: 2 pre-existing failures in X —
unrelated to this work."*

## Step 5 — Clean up when the work lands

```bash
cd -                                    # back to the main checkout
git worktree remove "../${repo}-<branch>"
git worktree prune
```

Deleting the directory by hand leaves a stale administrative entry; `git worktree remove` does
both. `git worktree list` shows what is still out there.

Do not remove a worktree with uncommitted changes in it unless the user says so — the command
refuses by default, and that refusal is a feature.
