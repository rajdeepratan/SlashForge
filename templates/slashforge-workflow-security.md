---
name: SlashForge Workflow — Security Audit
description: The dual-track security and dependency audit and its blocking gate, shared by Phase 7 of /slashforge-code (and /slashforge-fix) and by Phase R3 of /slashforge-review-pr. Track A scans dependency diffs with npm audit; Track B is a rigid AppSec OWASP pass over source diffs.
---

# Security Audit (dual-track, blocking)

Read when a run reaches the security audit — Phase 7 of `slashforge-workflow.md`, or Phase R3 of
`slashforge-workflow-review-pr.md`. The audit has two independent tracks; run whichever the diff
triggers (both, if both apply). Every finding from either track is `category: security` and, when it
meets the bar below, `severity: blocking`.

## Track A — deterministic dependency scan

*Trigger:* the diff touches `package.json`, `package-lock.json`, or `yarn.lock`.

*Action:* run `npm audit --json` and parse it through the shipped helper, which maps every advisory
of severity `high` or `critical` to a blocking security finding. Parsing matters — the audit exit
code alone flags moderate/low advisories too, which do not block:

```bash
mkdir -p .slashforge
npm audit --json > .slashforge/npm-audit.json 2>/dev/null
node "{{INSTALL_PATH}}/slashforge-audit.js" .slashforge/npm-audit.json
```

`slashforge-audit.js` prints one line per `high`/`critical` advisory and exits non-zero when any
exist, so the gate is deterministic — the same diff always produces the same verdict. A repo on Yarn
or pnpm: run that tool's audit (`yarn npm audit --json` / `pnpm audit --json`) and apply the same
High/Critical bar.

## Track B — AppSec LLM pass

*Trigger:* the diff touches source files (`.ts`, `.js`, `.py`, `.go`, `.rb`, etc.).

*Action:* a **separate pass, stripped of style and architecture context** — not the same pass as the
Phase 7 review checklist. Hold to this constraint exactly:

> *"You are a rigid AppSec engineer. Scan strictly for OWASP vulnerabilities (Hardcoded secrets,
> Injection, Unbounded loops / DoS, Broken Access Control). Output ONLY security vulnerabilities."*

Report nothing but security vulnerabilities from this pass. Each is `category: security`,
`severity: blocking`.

## The gate

**If *any* finding has `category: security` and `severity: blocking`:**

- **In `/slashforge-code` / `/slashforge-fix` (Phase 7):** Phase 7 halts immediately and Phase 8 (PR
  creation) does not run. Report the findings with file, category and remediation, return to Phase 5
  to fix them (a dependency finding may mean a version bump rather than a code change), and re-run
  the audit. The run does not advance to push/PR while a blocking security finding stands — it is
  never deferred to a follow-up.
- **In `/slashforge-review-pr` (Phase R3):** these are reported separately from the ordinary
  findings, under their own `SECURITY FINDINGS` header rendered in red in the review document, and
  listed first in the chat summary. They make `request-changes` the obvious recommendation — which
  you say — but, as always in a read-only review, the user still chooses the event at the gate.
