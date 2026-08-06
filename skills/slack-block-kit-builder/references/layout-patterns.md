# Layout Patterns

## Nesting

- Put normal blocks in the top-level `blocks` array.
- Put elements inside compatible blocks.
- Use one accessory in `section.accessory`.
- Use one form control in `input.element`.
- Nest block-like objects only in schema-defined fields: supported blocks in `container.child_blocks`, cards in `carousel.elements`, and task cards in `plan.tasks`.
- Do not put `blocks` inside `section`, `actions`, `context`, or `input`.

## Ordering

Use the smallest useful sequence:

1. Title or status.
2. Main content.
3. Supporting table, image, chart, or task detail.
4. Related actions.
5. Context and attribution.

Use dividers only where they improve scanning.

## Incompatible Requirements

When requested controls do not share a surface:

1. Name each incompatible element and its supported surface.
2. Choose the surface that supports the primary task.
3. Move remaining controls to a modal or message, linked with a compatible regular button when needed.
4. Validate each emitted payload independently.

Never claim a requested all-in-one layout passed validation by omitting element-level surface checks.

## Common Patterns

| Pattern | Recommended blocks |
| --- | --- |
| Announcement | `header`, `section`, optional `context` |
| Record card | `card` or `section` plus `context` |
| Record collection | `carousel` |
| Grouped message panel | `container` with supported children |
| AI answer | `markdown`, then `context_actions` |
| Agent progress | `plan` with `task_card` tasks |
| Modal warning | `alert`, then form `input` blocks |
| Simple metrics | `section.fields` |
| Simple grid | `table` |
| Rich grid | `data_table` |
| Chart | `data_visualization` |

## Mobile

- Keep labels short and put primary controls first.
- Avoid filling an `actions` block to its desktop maximum.
- Split long content into meaningful sections instead of many tiny blocks.
- Use an overflow or select for secondary choices.

## Updating

- Update an existing message when it represents one changing object.
- Preserve the message timestamp needed by `chat.update`.
- Use fresh block IDs for a new iteration when interaction routing depends on Slack's uniqueness rule.
- Keep top-level fallback text synchronized with the visible blocks.
