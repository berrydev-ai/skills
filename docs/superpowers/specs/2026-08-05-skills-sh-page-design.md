# skills.sh Repository Page Design

## Goal

Customize the `berrydev-ai/skills` repository page on skills.sh so visitors can
scan the available skills by purpose and can reach that page from the project
README.

## Scope

- Add `skills.sh.json` at the repository root, as required by skills.sh.
- Include the official JSON Schema URL for editor support and validation.
- Group every current skill by user-facing purpose:
  - **Engineering Workflow:** `issue-readiness`, `pr-description`,
    `sync-with-primary`, and `use-orchestration`.
  - **Mastra:** `mastra-api-cli` and `mastra-cli`.
  - **Slack:** `slack-block-kit-builder`, `slack-post`, and
    `slack-thread-capture`.
- Place skills added later but not yet curated in the generated
  **Other skills** section at the bottom.
- Add a skills.sh badge beneath the README title that links to the repository
  page at `https://skills.sh/berrydev-ai/skills`.

## Behavior

skills.sh reads the root configuration after the repository is observed by its
telemetry service. The file changes only the order and grouping of skills on the
repository page. It does not alter skill discovery, installation, plugin
metadata, or any `SKILL.md` content.

The badge uses the documented skills.sh badge endpoint and links to the same
repository page. Existing installation instructions remain unchanged.

## Validation

Verification will confirm that:

1. `skills.sh.json` is valid JSON.
2. It declares the documented schema URL and `notGrouped: "bottom"`.
3. Every group has a non-empty title and at least one skill.
4. Every current `SKILL.md` frontmatter name appears in exactly one group.
5. The README badge points to the `berrydev-ai/skills` skills.sh page.

No permanent test harness will be introduced for this static metadata change;
the repository's existing validation commands will also be run where available.

## Non-goals

- Removing or consolidating duplicate or legacy skill directories.
- Changing Claude Code marketplace packaging.
- Changing skills CLI installation behavior.
- Automating future updates to `skills.sh.json`.
