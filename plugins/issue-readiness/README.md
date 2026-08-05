# issue-readiness

Assess whether a GitHub issue is ready to implement, and draft whatever is
missing. Read-only against GitHub — it never edits issues or posts comments; it
surfaces the assessment and ready-to-paste drafts in chat.

## Install with Agent Skills

```bash
npx --yes skills add berrydev-ai/skills --skill issue-readiness
```

### Claude Code marketplace adapter

The optional adapter installs the same portable skill as a Claude Code plugin:

```bash
/plugin marketplace add berrydev-ai/skills
/plugin install issue-readiness@berrydev-skills
```

## Use

Ask Claude to assess an issue, for example:

- "Is issue #142 ready to work on?"
- "Vet https://github.com/owner/repo/issues/88 before I start."

The skill scores four criteria — goal/purpose, testable acceptance criteria,
scope/tasks, and context/links — gives a **Ready / Needs work / Blocked**
verdict, and drafts the missing sections as Markdown you can paste into the
issue.

## Requirements

- The [`gh`](https://cli.github.com) CLI, authenticated (`gh auth login`), with
  read access to the target repository.

## Contents

- `skills/issue-readiness/SKILL.md` — the skill
- `skills/issue-readiness/scripts/fetch-issue.sh` — fetches an issue (body +
  comments + metadata) as one JSON object via `gh`
- `.claude-plugin/plugin.json` — optional Claude Code distribution metadata
