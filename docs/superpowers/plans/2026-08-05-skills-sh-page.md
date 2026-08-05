# skills.sh Repository Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated skills.sh repository-page configuration and make the page discoverable from the README.

**Architecture:** A root `skills.sh.json` will be the single source of truth for skills.sh display groupings. The README will contain only the documented badge and page link; it will not duplicate grouping metadata.

**Tech Stack:** JSON, Markdown, Node.js built-in assertions for validation, Claude Code plugin validator

## Global Constraints

- Use the official schema URL `https://skills.sh/schemas/skills.sh.schema.json`.
- Set `notGrouped` to `bottom` so newly added, uncurated skills remain visible after the curated groups.
- Include all nine current `SKILL.md` frontmatter names exactly once.
- Link the README badge to `https://skills.sh/berrydev-ai/skills`.
- Do not change skill discovery, installation, plugin metadata, or any `SKILL.md` content.
- Do not remove or consolidate legacy skill directories.
- Do not add a permanent test harness for this static metadata.

---

### Task 1: Add and expose the curated skills.sh page

**Files:**
- Create: `skills.sh.json`
- Modify: `README.md:1-4`
- Reference: `docs/superpowers/specs/2026-08-05-skills-sh-page-design.md`

**Interfaces:**
- Consumes: skills.sh's documented root-level `skills.sh.json` format and badge endpoint.
- Produces: Three ordered page groupings and a README link to the generated repository page.

- [ ] **Step 1: Run the page contract before implementation and verify it fails**

```bash
node --input-type=module -e '
  import assert from "node:assert/strict";
  import { readFile } from "node:fs/promises";

  const config = JSON.parse(await readFile("skills.sh.json", "utf8"));
  const expectedGroups = [
    {
      title: "Engineering Workflow",
      description: "Skills for planning, reviewing, and maintaining software changes.",
      skills: ["issue-readiness", "pr-description", "sync-with-primary", "use-orchestration"]
    },
    {
      title: "Mastra",
      description: "Skills for inspecting and operating Mastra servers.",
      skills: ["mastra-api-cli", "mastra-cli"]
    },
    {
      title: "Slack",
      description: "Skills for building, posting, and capturing Slack content.",
      skills: ["slack-block-kit-builder", "slack-post", "slack-thread-capture"]
    }
  ];

  assert.equal(config.$schema, "https://skills.sh/schemas/skills.sh.schema.json");
  assert.equal(config.notGrouped, "bottom");
  assert.deepEqual(config.groupings, expectedGroups);

  const names = config.groupings.flatMap(({ skills }) => skills);
  assert.equal(names.length, new Set(names).size, "skill names must not be duplicated");

  const readme = await readFile("README.md", "utf8");
  assert.match(
    readme,
    /\[!\[skills\.sh\]\(https:\/\/skills\.sh\/b\/berrydev-ai\/skills\)\]\(https:\/\/skills\.sh\/berrydev-ai\/skills\)/
  );
'
```

Expected: FAIL with `ENOENT` for `skills.sh.json`, proving the contract detects the missing feature.

- [ ] **Step 2: Add the root skills.sh configuration**

Create `skills.sh.json` with exactly:

```json
{
  "$schema": "https://skills.sh/schemas/skills.sh.schema.json",
  "notGrouped": "bottom",
  "groupings": [
    {
      "title": "Engineering Workflow",
      "description": "Skills for planning, reviewing, and maintaining software changes.",
      "skills": [
        "issue-readiness",
        "pr-description",
        "sync-with-primary",
        "use-orchestration"
      ]
    },
    {
      "title": "Mastra",
      "description": "Skills for inspecting and operating Mastra servers.",
      "skills": [
        "mastra-api-cli",
        "mastra-cli"
      ]
    },
    {
      "title": "Slack",
      "description": "Skills for building, posting, and capturing Slack content.",
      "skills": [
        "slack-block-kit-builder",
        "slack-post",
        "slack-thread-capture"
      ]
    }
  ]
}
```

- [ ] **Step 3: Add the documented badge beneath the README title**

Change the opening of `README.md` to:

```markdown
# Berry Development Skills

[![skills.sh](https://skills.sh/b/berrydev-ai/skills)](https://skills.sh/berrydev-ai/skills)

**Berry Development Skills** is the [Claude Code plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
```

- [ ] **Step 4: Re-run the page contract and verify it passes**

Run the exact Node.js command from Step 1.

Expected: exit code 0 with no output.

- [ ] **Step 5: Verify every repository skill is covered by the configuration**

```bash
for skill_file in $(find . -name SKILL.md -not -path './.git/*' | sort); do
  sed -n 's/^name: //p' "$skill_file"
done
```

Expected names, each present exactly once in `skills.sh.json`:

```text
mastra-cli
issue-readiness
mastra-api-cli
pr-description
sync-with-primary
use-orchestration
slack-block-kit-builder
slack-post
slack-thread-capture
```

- [ ] **Step 6: Run repository validation**

```bash
git diff --check
claude plugin validate .
```

Expected: both commands exit 0. If the Claude CLI is not installed, report that limitation explicitly; do not substitute a network-dependent validation command.

- [ ] **Step 7: Review the final diff for scope**

```bash
git diff -- README.md skills.sh.json
git status --short
```

Expected: only `README.md`, `skills.sh.json`, and this plan are uncommitted; no `SKILL.md` or plugin metadata is modified.

- [ ] **Step 8: Commit the implementation**

```bash
git add -- README.md skills.sh.json docs/superpowers/plans/2026-08-05-skills-sh-page.md
git commit -m "feat: customize skills.sh repository page"
```
