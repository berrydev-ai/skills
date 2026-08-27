# Berry Development Agent Skills

[![skills.sh](https://skills.sh/b/berrydev-ai/skills)](https://skills.sh/berrydev-ai/skills)

**Berry Development Agent Skills** is a collection of portable
[Agent Skills](https://agentskills.io) built and maintained by
[Berry Development](mailto:eric@berrydev.ai). Each skill is self-contained and
can be installed independently on compatible agents.

The repository follows the skills.sh catalog convention: every skill lives at
`skills/<name>/SKILL.md`, with its scripts and references beside it.

## Requirements

- Node.js 22.20 or later
- Git

This repository is public, so GitHub authentication is not required to install
its skills.

## Skills

| Skill | What it does |
| --- | --- |
| [`dicebear-image-generator`](skills/dicebear-image-generator) | Generate deterministic DiceBear avatar images and DiceBear integration guidance. |
| [`issue-readiness`](skills/issue-readiness) | Assess whether a GitHub issue is ready to implement, then draft any missing goal, acceptance criteria, scope, or context. |
| [`mastra-api-cli`](skills/mastra-api-cli) | Inspect and operate Mastra servers through the `mastra api` CLI. |
| [`pr-description`](skills/pr-description) | Generate or revise evidence-based pull request and merge request descriptions. |
| [`slack-block-kit-builder`](skills/slack-block-kit-builder) | Build, debug, and validate Slack Block Kit payloads. |
| [`slack-post`](skills/slack-post) | Send an explicitly approved Slack text message with a configured bot. |
| [`slack-thread-capture`](skills/slack-thread-capture) | Capture an authorized Slack thread as JSON, JSONL, text, and summary evidence. |
| [`sync-with-primary`](skills/sync-with-primary) | Sync a repository's primary branch and merge it into the current branch. |
| [`use-orchestration`](skills/use-orchestration) | Plan, coordinate, execute, and verify non-trivial engineering work. |

## Install with Agent Skills

List the skills in this repository:

```bash
npx --yes skills add berrydev-ai/skills --list
```

Choose skills interactively for any compatible agent:

```bash
npx --yes skills add berrydev-ai/skills
```

Install one skill:

```bash
npx --yes skills add berrydev-ai/skills --skill issue-readiness
```

### Codex

Install all skills for Codex in the current project:

```bash
npx --yes skills add berrydev-ai/skills --agent codex --skill '*' -y
```

Install one skill for Codex in the current project:

```bash
npx --yes skills add berrydev-ai/skills --agent codex --skill mastra-api-cli -y
```

Add `-g` to install globally:

```bash
npx --yes skills add berrydev-ai/skills -g --agent codex --skill '*' -y
```

If a newly installed or updated skill does not appear in the current Codex
task, start a new task. Quote `'*'` so the shell does not expand it into local
filenames.

### Claude Code

Install all skills for Claude Code in the current project:

```bash
npx --yes skills add berrydev-ai/skills --agent claude-code --skill '*' -y
```

Install one skill for Claude Code:

```bash
npx --yes skills add berrydev-ai/skills --agent claude-code --skill issue-readiness -y
```

Add `-g` to either command for a global installation:

```bash
npx --yes skills add berrydev-ai/skills -g --agent claude-code --skill '*' -y
```

If a newly installed or updated skill does not appear in the current Claude
Code session, start a new session.

## Repository layout

```text
berrydev-ai/skills/
├── skills/
│   ├── dicebear-image-generator/
│   │   ├── SKILL.md
│   │   ├── agents/openai.yaml
│   │   └── scripts/dicebear_avatar.py
│   ├── issue-readiness/
│   │   ├── SKILL.md
│   │   └── scripts/fetch-issue.sh
│   ├── mastra-api-cli/
│   ├── pr-description/
│   ├── slack-block-kit-builder/
│   ├── slack-post/
│   ├── slack-thread-capture/
│   ├── sync-with-primary/
│   └── use-orchestration/
├── scripts/
│   ├── check-public-release.mjs
│   └── check-public-release.test.mjs
└── skills.sh.json
```

`skills.sh.json` controls how the skills are grouped on skills.sh. It does not
change the skill directories or their runtime behavior.

## Add a new skill

> [!WARNING]
> For now, outside contributions are not accepted because this repository is
> primarily intended for Berry Development's own workflows.

1. Create `skills/<skill-name>/` with a name that is globally unique within
   this repository.
2. Add a `SKILL.md` whose frontmatter `name` exactly matches its parent
   directory.
3. Bundle helper files beneath that skill directory. Instructions must resolve
   `SKILL_DIR` from the loaded `SKILL.md` and reference helpers beneath it,
   such as `$SKILL_DIR/scripts/tool.sh`.
4. Add deterministic tests for executable behavior.
5. Add the skill to the appropriate group in `skills.sh.json`.
6. Run every validation below.

## Validate and test locally

The public-release checker reads Git's staged index. Stage the intended changes
before running these validations.

```bash
# Staged public-tree paths, skill identities, portability, and sensitive signatures
node scripts/check-public-release.mjs

# All dependency-free Node tests
node --test scripts/*.test.mjs skills/*/scripts/*.test.mjs

# Every tracked shell script
git ls-files -z '*.sh' | xargs -0 -n1 bash -n

# Every JSON file outside .git
node -e 'for (const file of require("node:fs").globSync("**/*.json", { exclude: [".git/**"] })) JSON.parse(require("node:fs").readFileSync(file, "utf8"))'

# Agent-neutral discovery
npx --yes skills add . --list
```

## Versioning

Skills are versioned with this repository. After publishing changes, users can
refresh installed skills with `npx skills update` or reinstall them with
`npx skills add`.

## License

[MIT](LICENSE) © Berry Development
