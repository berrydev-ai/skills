# use-orchestration

Plan, coordinate, execute, and verify non-trivial engineering work. The skill
keeps a checkable task plan, delegates focused work, fixes bugs from root-cause
evidence, verifies results, and turns user corrections into reusable lessons.

## Install with Agent Skills

```bash
npx --yes skills add berrydev-ai/skills --skill use-orchestration
```

### Claude Code marketplace adapter

The optional adapter installs the same portable skill as a Claude Code plugin:

```bash
/plugin marketplace add berrydev-ai/skills
/plugin install use-orchestration@berrydev-skills
```

## Use

Ask Claude to handle a non-trivial engineering task, for example:

- "Plan and implement this feature."
- "Fix this bug and prove the regression is covered."
- "Investigate and repair the failing CI checks."
- "Coordinate the work across subagents."

The skill activates automatically for work with three or more meaningful steps,
architectural decisions, complex implementation, bug reports, or failing tests
and CI.

## Behavior

- Records non-trivial plans and verification in `tasks/todo.md`.
- Uses focused subagents for independent research, exploration, and validation.
- Diagnoses and fixes bugs without shifting investigation work to the user.
- Requires fresh evidence before declaring work complete.
- Captures reusable prevention rules in `tasks/lessons.md` after user corrections.
- Prefers simple, root-cause fixes with minimal impact.

## Contents

- `skills/use-orchestration/SKILL.md` — the orchestration workflow.
- `skills/use-orchestration/agents/openai.yaml` — Codex UI metadata.
- `.claude-plugin/plugin.json` — optional Claude Code distribution metadata.
