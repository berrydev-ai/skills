---
name: slack-block-kit-builder
description: Build, debug, and validate Slack Block Kit JSON for messages, modals, Home tabs, AI responses, tables, data tables, charts, cards, containers, task plans, feedback controls, and interactive elements. Use for raw JSON, Slack SDK payloads, slack-block-builder output, invalid_blocks errors, or accessibility.
---

# Slack Block Kit Builder

Design Block Kit payloads, validate the locally checkable structure, then use Slack's Block Kit Builder when exact rendering matters.

This skill was refreshed against Slack's official reference and changelog on 2026-07-31. Read [latest Block Kit coverage](references/latest-block-kit.md) before using newer blocks.

## Workflow

1. Choose the surface: message, modal, or Home tab.
2. Read [surface compatibility](references/surfaces.md).
3. Choose blocks from [block types](references/blocks.md).
4. Add controls using [interactive components](references/interactive-components.md).
5. Apply [layout rules](references/layout-patterns.md).
6. Include stable `block_id`, `action_id`, and `callback_id` values where interactions require them.
7. Run the bundled validator.
8. Use Slack Block Kit Builder for visual and server-side confirmation.

## Core Rules

- Keep normal blocks in the top-level `blocks` array.
- Nest blocks only in `container.child_blocks`, using Slack's supported child block types.
- Prefer a top-level message `text` fallback for predictable notifications and screen-reader output.
- Use at most 50 top-level blocks in messages and 100 in modals or Home tabs.
- Use `alert` only in modals, `container` only in messages, and `data_visualization` only in messages.
- Use at most one `table` block and two `data_visualization` blocks per message.
- Use `data_table` for paging, sorting, filtering, and richer interaction. Use `table` for simpler structured data.
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
- container child blocks
- table and data-visualization limits
- fallback and accessibility warnings

It does not call Slack and cannot prove rendering. Validate visually at https://app.slack.com/block-kit-builder before treating a new or changed payload as finished.

## Output Contract

When producing a payload, provide:

1. The chosen surface and reason.
2. API-ready JSON.
3. Interaction IDs and submitted value paths when interactive.
4. Accessibility and limit notes.
5. Validation result and any remaining live-rendering gap.

Provide library-specific code only when the caller asks or the target project already uses that library. Prefer raw JSON for newly released blocks until the library proves support.

## References

- [Block types](references/blocks.md)
- [Interactive components](references/interactive-components.md)
- [Layout patterns](references/layout-patterns.md)
- [Surfaces](references/surfaces.md)
- [Latest Block Kit coverage](references/latest-block-kit.md)
- Slack Block Kit docs: https://docs.slack.dev/block-kit
- Slack blocks reference: https://docs.slack.dev/reference/block-kit/blocks/
