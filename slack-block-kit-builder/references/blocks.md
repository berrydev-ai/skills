# Block Types

Use this as a selection guide. Confirm exact fields in Slack's official block reference before shipping a new block type.

## Selection

| Need | Block | Main constraint |
| --- | --- | --- |
| Buttons and menus | `actions` | Up to 25 elements. |
| Modal status callout | `alert` | Modal only; 200-character text. |
| Compact record | `card` | Provide content or actions. |
| Card collection | `carousel` | Messages and Home tabs; 1 to 10 cards. |
| Grouped message content | `container` | Message only; 1 to 10 supported child blocks. |
| Metadata | `context` | Up to 10 text or image elements. |
| AI feedback and delete actions | `context_actions` | Message only; up to 5 supported controls. |
| Rich interactive table | `data_table` | Messages and Home tabs; caption required. |
| Chart | `data_visualization` | Message only; at most 2 per message. |
| Separation | `divider` | No content fields. |
| Remote file | `file` | Message only. |
| Title | `header` | Plain text; 150 characters. |
| Standalone image | `image` | Require `alt_text`. |
| Form field | `input` | Require a label and one element. |
| LLM markdown | `markdown` | Message only. |
| Grouped agent tasks | `plan` | Message only. |
| Structured formatted text | `rich_text` | Use Slack rich-text elements. |
| Main text and fields | `section` | Text or fields; optional single accessory. |
| Simple table | `table` | Messages and Home tabs; one per message. |
| One agent task | `task_card` | Message only; require task ID and title. |
| Embedded video | `video` | Confirm hosting and surface support. |

## General Limits

- Messages: 50 top-level blocks.
- Modals: 100 top-level blocks.
- Home tabs: 100 top-level blocks.
- `block_id`: 255 characters maximum and unique per payload iteration.
- `section.text`: 3,000 characters maximum.
- `section.fields`: up to 10 text objects, 2,000 characters each.
- `header.text`: 150 characters maximum.

## Table Choice

Choose `table` for a smaller, direct grid. Choose `data_table` when paging, sorting, filtering, a caption, or richer interaction matters.

`table` supports up to 100 rows and 20 cells per row. Use at most one per message.

`data_table` includes its header in `rows`, supports up to 201 total rows and 20 columns, and requires a caption.

## Accessibility

- Give every image useful `alt_text`.
- Prefer top-level message `text` as a predictable notification and screen-reader fallback.
- Provide accessible captions for data tables.
- Keep headings and labels meaningful outside visual context.

Official reference: https://docs.slack.dev/reference/block-kit/blocks/
