---
name: issue-readiness
description: Assess whether a GitHub issue is ready to implement — checks for a clear goal/purpose, testable acceptance criteria, sufficient scope/tasks, and supporting context/links, then drafts the missing sections. Use when the user asks to assess, validate, vet, or "check if ready" a GitHub issue, asks "is this issue ready to work on", or before starting implementation on an issue.
version: 1.0.0
tags:
  - github
  - issue
  - readiness
  - acceptance-criteria
---

# Issue Readiness

Judge whether a GitHub issue contains enough to be implemented confidently, and
draft whatever is missing. Read-only against GitHub: never edit the issue or
post comments — surface the assessment and proposed fixes in chat for the user
to apply.

## Workflow

1. **Identify the issue.** Get the issue number or URL from the user. If they
   say "this issue" with no reference, ask which one.

2. **Fetch it** (do not reconstruct `gh` by hand). Resolve `SKILL_DIR` as the
   absolute directory containing this `SKILL.md`, using the file location from
   which the agent host loaded this skill. `SKILL_DIR` is a local shell
   variable for this invocation, not a runtime variable supplied by any
   particular host. Then run:
   ```bash
   bash "$SKILL_DIR/scripts/fetch-issue.sh" <number-or-url> [owner/repo]
   ```
   Pass `owner/repo` only when not in the target repo. The script returns one
   JSON object (title, body, state, labels, comments, etc.). If it errors
   (auth, not found, no repo), report that plainly and stop.

3. **Read the whole issue** — body *and* comments. Requirements are often
   clarified or added in the comment thread, not the original body.

4. **Score each criterion** below as ✅ present / ⚠️ partial / ❌ missing,
   citing a short quote as evidence (or noting its absence).

5. **Give a verdict and draft the gaps** (see Output).

## The four criteria

| Criterion | Present means… |
|---|---|
| **Goal / purpose** | Why the issue exists and the outcome it serves — the "so that". Not just a restated title. |
| **Acceptance criteria** | Concrete, **testable** conditions for done. "Works correctly" is not testable; "returns 404 for unknown IDs" is. |
| **Scope / tasks** | Enough technical detail or breakdown that an implementer knows where to start and where the edges are. |
| **Context / links** | Code pointers, designs, dependencies, related issues/PRs — anything needed to avoid guessing. |

Judge substance, not headings. Acceptance criteria living under a "Notes"
heading still count; an empty "## Acceptance Criteria" header does not.

## Verdict

- **Ready** — all four present (context may be ⚠️ if the rest is strong).
- **Needs work** — one or more ⚠️/❌ on goal, AC, or scope.
- **Blocked** — depends on an unresolved decision, another issue, or missing
  access; name the blocker.

## Output

Report in chat:

```
## Issue #<n> — <title>   →   <Ready | Needs work | Blocked>

- Goal/purpose:        <✅/⚠️/❌>  <evidence or what's missing>
- Acceptance criteria: <✅/⚠️/❌>  ...
- Scope/tasks:         <✅/⚠️/❌>  ...
- Context/links:       <✅/⚠️/❌>  ...

### Gaps & open questions
- <specific, answerable questions for whoever owns the issue>
```

Then, for every ⚠️/❌ criterion, **draft the missing section** as
ready-to-paste Markdown the user can drop into the issue — e.g. a Goal
statement, a checklist of testable acceptance criteria, or a scope breakdown.
Base drafts on the issue's actual content; where you must assume, mark it
clearly (e.g. `> ASSUMPTION: …`) so the owner can confirm rather than rubber-stamp.

Stop after presenting. Do not push edits or comments unless the user explicitly
asks you to apply them.
