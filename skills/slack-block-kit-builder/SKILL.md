---
name: slack-block-kit-builder
description: Use when building, debugging, or validating Slack Block Kit JSON for messages, modals, Home tabs, AI responses, tables, charts, cards, containers, task plans, feedback controls, interactive elements, invalid_blocks errors, slack-block-builder output, or accessibility.
---

# Slack Block Kit Builder

Design Block Kit payloads, validate the locally checkable structure, then use Slack's Block Kit Builder when exact rendering matters.

Read [latest Block Kit coverage](references/latest-block-kit.md) before using newer blocks or fields.

## Workflow

1. Choose the surface: message, modal, or Home tab.
2. Read [surface compatibility](references/surfaces.md).
3. Choose blocks from [block types](references/blocks.md).
4. Add controls using [interactive components](references/interactive-components.md), checking both their parent block and surface.
5. If requested controls conflict with the surface, list the conflicts and choose a supported surface or split the flow before emitting JSON.
6. Apply [layout rules](references/layout-patterns.md).
7. Include stable `action_id` and `callback_id` values where interactions require them; use unique `block_id` values for each payload iteration.
8. Run the bundled validator and fix every error.
9. Use Slack Block Kit Builder for visual confirmation, then confirm server acceptance through the target Slack API method in a test workspace.

## Core Rules

- Keep normal blocks in the top-level `blocks` array.
- Nest block-like objects only in schema-defined fields: supported blocks in `container.child_blocks`, cards in `carousel.elements`, and task cards in `plan.tasks`.
- For message accessibility, either include a complete top-level `text` fallback or intentionally omit it so Slack can derive accessible text from supported blocks.
- Use at most 50 top-level blocks in messages and 100 in modals or Home tabs.
- Use `alert` only in modals, `container` only in messages, and `data_visualization` only in messages.
- Use at most one `table` block and two `data_visualization` blocks per message.
- Use `data_table` for paging, sorting, filtering, and richer interaction. Use `table` for simpler structured data.
- Keep cumulative `markdown` block text within 12,000 characters per payload.
- Treat `file` blocks as retrieval-only; publish remote files through Slack's file flow.
- Do not put modal-only email, file, number, or URL inputs on messages or Home tabs.
- Do not put `datetimepicker` or `workflow_button` on Home tabs; do not put `rich_text_input` in messages.
- Add `alt_text` to images and clear labels to ambiguous or icon-only controls.
- Use confirmation dialogs for destructive actions.
- Prefer concise labels that remain readable on mobile.
- Verify the target surface in current Slack docs because Block Kit evolves quickly.

## Validate

Resolve `SKILL_DIR` as the absolute directory containing this `SKILL.md`, using
the file location from which the agent host loaded this skill. `SKILL_DIR` is a
local shell variable for this invocation, not a runtime variable supplied by
any particular host.

```sh
node "$SKILL_DIR/scripts/validate-block-kit.mjs" "$BLOCK_KIT_PAYLOAD"
```

Or pipe JSON through standard input:

```sh
node "$SKILL_DIR/scripts/validate-block-kit.mjs" < "$BLOCK_KIT_PAYLOAD"
```

The validator has no package dependency. It checks:

- JSON shape and known block types
- surface compatibility
- block counts
- required fields for common and newer blocks
- block-element compatibility by parent and surface
- container child blocks
- table, data-table, chart, card, container, and markdown limits
- fallback and accessibility warnings

It does not call Slack and cannot prove rendering or server acceptance. Validate visually at https://app.slack.com/block-kit-builder and exercise the target Slack API method in a test workspace before treating a new or changed payload as finished.

## Output Contract

When producing a payload, provide:

1. The chosen surface and reason.
2. API-ready JSON.
3. Interaction IDs and submitted value paths when interactive.
4. Any requested feature that is incompatible with the chosen surface and the supported alternative.
5. Accessibility and limit notes.
6. Validation result and any remaining live-rendering gap.

Provide library-specific code only when the caller asks or the target project already uses that library. Prefer raw JSON for newly released blocks until the library proves support.

## References

- [Block types](references/blocks.md)
- [Interactive components](references/interactive-components.md)
- [Layout patterns](references/layout-patterns.md)
- [Surfaces](references/surfaces.md)
- [Latest Block Kit coverage](references/latest-block-kit.md)
- Slack Block Kit docs: https://docs.slack.dev/block-kit
- Slack blocks reference: https://docs.slack.dev/reference/block-kit/blocks/
