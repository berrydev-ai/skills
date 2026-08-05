# Berry Development Agent Skills

[![skills.sh](https://skills.sh/b/berrydev-ai/skills)](https://skills.sh/berrydev-ai/skills)

**Berry Development Agent Skills** is a collection of portable
[Agent Skills](https://agentskills.io) built and maintained by
[Berry Development](mailto:eric@berrydev.ai). Each skill is self-contained and
can be installed independently on compatible agents.

Claude Code marketplace metadata is included as an optional distribution
adapter. It does not define the skills' identity or runtime contract.

## Skills

| Skill | What it does |
| --- | --- |
| [`issue-readiness`](plugins/issue-readiness/skills/issue-readiness) | Assess whether a GitHub issue is ready to implement, then draft any missing goal, acceptance criteria, scope, or context. |
| [`mastra-api-cli`](plugins/mastra-api-cli/skills/mastra-api-cli) | Inspect and operate Mastra servers through the `mastra api` CLI. |
| [`pr-description`](plugins/pr-description/skills/pr-description) | Generate or revise evidence-based pull request and merge request descriptions. |
| [`slack-block-kit-builder`](slack-block-kit-builder) | Build, debug, and validate Slack Block Kit payloads. |
| [`slack-post`](slack-post) | Send an explicitly approved Slack text message with a configured bot. |
| [`slack-thread-capture`](slack-thread-capture) | Capture an authorized Slack thread as JSON, JSONL, text, and summary evidence. |
| [`sync-with-primary`](plugins/sync-with-primary/skills/sync-with-primary) | Sync a repository's primary branch and merge it into the current branch. |
| [`use-orchestration`](plugins/use-orchestration/skills/use-orchestration) | Plan, coordinate, execute, and verify non-trivial engineering work. |

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

Restart Codex after installing or updating skills. Quote `'*'` so the shell
does not expand it into local filenames.

### Claude Code marketplace adapter

The optional marketplace adapter installs each portable skill as an independent
Claude Code plugin. Add the marketplace once:

```bash
/plugin marketplace add berrydev-ai/skills
```

Then install the skills you want:

```bash
/plugin install issue-readiness@berrydev-skills
/plugin install mastra-api-cli@berrydev-skills
/plugin install pr-description@berrydev-skills
/plugin install sync-with-primary@berrydev-skills
/plugin install use-orchestration@berrydev-skills
```

The equivalent non-interactive CLI form is:

```bash
claude plugin install issue-readiness@berrydev-skills --scope user
```

Use `--scope project` for a shared project installation or `--scope local`
for a local-only installation. Restart Claude Code after installing.

## Repository layout

```text
berrydev-skills/
├── .claude-plugin/
│   └── marketplace.json          # optional Claude Code catalog adapter
├── plugins/
│   ├── issue-readiness/
│   │   ├── .claude-plugin/plugin.json
│   │   └── skills/issue-readiness/
│   │       ├── SKILL.md
│   │       └── scripts/fetch-issue.sh
│   ├── mastra-api-cli/
│   ├── pr-description/
│   ├── sync-with-primary/
│   └── use-orchestration/
├── scripts/
│   ├── check-public-release.mjs
│   └── check-public-release.test.mjs
├── slack-block-kit-builder/
├── slack-post/
└── slack-thread-capture/
```

Every portable skill is rooted at the directory containing its `SKILL.md`.
Plugin folders add distribution metadata around that portable directory; the
three Slack skills are already repository-root skill directories.

## Add a new skill

> [!WARNING]
> For now, outside contributions are not accepted because this repository is
> primarily intended for Berry Development's own workflows.

1. Create a skill directory whose name is globally unique within this
   repository.
2. Add a `SKILL.md` whose frontmatter `name` exactly matches its parent
   directory.
3. Bundle helper files beneath that skill directory. Instructions must resolve
   `SKILL_DIR` from the loaded `SKILL.md` and reference helpers beneath it,
   such as `$SKILL_DIR/scripts/tool.sh`.
4. Add deterministic tests for executable behavior.
5. If Claude Code marketplace distribution is needed, wrap the portable skill
   in `plugins/<skill-name>/`, add `.claude-plugin/plugin.json`, and register
   that adapter in `.claude-plugin/marketplace.json`.
6. Run every validation below.

## Validate and test locally

```bash
# Public-tree paths, skill identities, portability, and sensitive signatures
node scripts/check-public-release.mjs

# All dependency-free Node tests
node --test scripts/*.test.mjs slack-*/scripts/*.test.mjs

# Every tracked shell script
git ls-files -z '*.sh' | xargs -0 -n1 bash -n

# Every JSON file outside .git
node -e 'for (const file of require("node:fs").globSync("**/*.json", { exclude: [".git/**"] })) JSON.parse(require("node:fs").readFileSync(file, "utf8"))'

# Agent-neutral discovery
npx --yes skills add . --list

# Optional Claude Code marketplace adapter
claude plugin validate .
for plugin in plugins/*; do claude plugin validate "$plugin"; done
```

## Versioning

Portable skills do not depend on marketplace versions. For the optional Claude
Code adapter, each plugin's version lives in its own
`.claude-plugin/plugin.json`. Bump it when that plugin changes so installed
Claude Code users can receive the update. Versions are intentionally not
duplicated in `marketplace.json`.

## License

[MIT](LICENSE) © Berry Development
