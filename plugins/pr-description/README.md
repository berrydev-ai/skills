# pr-description

Generate or revise concise pull request and merge request descriptions from
inspected repository evidence. The skill follows repository templates, reports
the checks that actually ran, and makes missing information or remaining risk
explicit.

## Install with Agent Skills

```bash
npx --yes skills add berrydev-ai/skills --skill pr-description
```

### Claude Code marketplace adapter

The optional adapter installs the same portable skill as a Claude Code plugin:

```bash
/plugin marketplace add berrydev-ai/skills
/plugin install pr-description@berrydev-skills
```

## Use

Ask Claude to:

- Draft a pull request description for the current branch.
- Improve an existing pull request description.
- Review a merge request body against its diff and commits.

The skill inspects repository instructions, templates, changes, commits, linked
issues, and test results before producing a ready-to-paste description.

## Requirements

- A Git checkout containing the change.
- Access to linked issues or specifications when they are needed for context.

## Contents

- `skills/pr-description/SKILL.md` — the skill
- `.claude-plugin/plugin.json` — optional Claude Code distribution metadata
