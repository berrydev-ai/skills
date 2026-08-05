---
name: pr-description
description: Generate or revise pull request and merge request descriptions. Use when asked to draft, improve, review, or update a PR or MR body from a branch, diff, commits, issue, or repository template.
---

# Pull Request Description

Write a concise review guide that explains the change, its purpose, the important decisions, and the proof that it is ready.

## 1. Gather evidence

- Read the repository instructions and pull or merge request template. Its required headings and wording take priority over this skill.
- Inspect the full change against the correct base branch, including the diff and commit list. Determine the base branch instead of assuming one.
- Read linked issues or specifications when they are available.
- Record tests that were actually run and their results.
- Identify user-visible effects, security or privacy concerns, data or schema changes, configuration or deployment steps, compatibility risks, and rollback needs.

**Completion:** Every statement is supported by inspected evidence or clearly marked as unknown.

## 2. Choose the structure

Use the repository template when one exists. Otherwise use:

```markdown
## What?

## Why?

## How?

## Testing?

## Screenshots (optional)

## Anything Else?
```

Fill the sections as follows:

- **What:** State the overall effect in a few explicit sentences. Link a ticket only after explaining the change.
- **Why:** Explain the business or engineering goal and the problem this change solves.
- **How:** Highlight significant design choices and non-obvious tradeoffs. Let the diff explain routine details.
- **Testing:** Name the checks that ran and their outcomes. State any untested conditions, why they were not tested, and the resulting risk. Use `Not run` with a reason when no test was run.
- **Screenshots:** Add real before-and-after images for visual changes. Use real command or plan output when it materially helps with command-line, backend, or infrastructure changes.
- **Anything Else:** Add review focus, risks, rollout or rollback notes, breaking changes, follow-up tickets, or alternatives worth considering.

Omit optional empty sections unless the repository template requires them.

## 3. Write for the reviewer

- Use short, complete sentences in active voice.
- Make the description understandable without requiring the reviewer to open the linked ticket first.
- Point reviewers toward the files, decisions, edge cases, and risks that need the closest attention.
- Describe the net effect instead of repeating the diff file by file.
- Include only links, screenshots, commands, and results that were verified.
- Keep the description proportional to the change. If a clear summary requires a long design document, flag that the change may be too large for one review.

**Completion:** A reviewer can quickly state what changed, why it matters, how confidence was established, and where risk remains.

## 4. Verify the draft

Before returning or publishing the description, confirm:

- The repository template is followed.
- No required section is empty.
- No placeholder text remains.
- Test claims match the observed results.
- Untested behavior and known risk are explicit.
- Visual evidence is included when it would materially shorten review.
- Links and issue references are real and relevant.
- The text is concise, plain, and ready to paste.

Return the finished description without a preamble. If required facts are missing, add a short **Missing information** list after the draft rather than inventing them.
