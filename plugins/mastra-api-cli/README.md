# mastra-api-cli

Inspect and operate [Mastra](https://mastra.ai) servers through the `mastra api`
CLI — agents, workflows, tools, MCP, memory, observability, datasets, and
experiments. Treats the installed CLI and the live server schema as the source
of truth, and starts read-only by default.

## Install with Agent Skills

```bash
npx --yes skills add berrydev-ai/skills --skill mastra-api-cli
```

### Claude Code marketplace adapter

The optional adapter installs the same portable skill as a Claude Code plugin:

```bash
/plugin marketplace add berrydev-ai/skills
/plugin install mastra-api-cli@berrydev-skills
```

## Use

Ask Claude to inspect or operate a Mastra server, for example:

- "List the agents on $MASTRA_URL."
- "Show the most recent error log on my local Mastra server and trace it."
- "Inspect the last few workflow runs for &lt;workflowId&gt;."

Provide the server URL (and token, if needed) in your request or as an exported
shell variable — the skill will not read `.env` files to discover them.

## Requirements

- The Mastra CLI (`mastra`) installed and on `PATH`.
- [`jq`](https://jqlang.github.io/jq/) for the example pipelines.

## Contents

- `skills/mastra-api-cli/SKILL.md` — the skill, sourced from
  [this gist](https://gist.github.com/coderberry/b858a67efa5a661034d6eb90ea62bae2)
- `.claude-plugin/plugin.json` — optional Claude Code distribution metadata
