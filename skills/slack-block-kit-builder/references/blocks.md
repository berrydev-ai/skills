# Block Types

Use this as a selection guide. Confirm exact fields in Slack's official block reference before shipping a new block type.

## Selection

| Need | Block | Main constraint |
| --- | --- | --- |
| Buttons and menus | `actions` | Up to 25 elements. |
| Modal status callout | `alert` | Modal only; 200-character text. |
| Compact record | `card` | Provide content or actions; at most 3 buttons. |
| Card collection | `carousel` | Messages and Home tabs; 1 to 10 cards. |
| Grouped message content | `container` | Message only; 1 to 10 supported child blocks. |
| Metadata | `context` | Up to 10 text or image elements. |
| AI feedback and delete actions | `context_actions` | Message only; up to 5 supported controls. |
| Rich interactive table | `data_table` | Messages and Home tabs; caption required. |
| Chart | `data_visualization` | Message only; at most 2 per message. |
| Separation | `divider` | No content fields. |
| Remote file returned by Slack | `file` | Retrieval-only; do not add directly to a published surface. |
| Title | `header` | Plain text; 150 characters. |
| Standalone image | `image` | Require `alt_text`. |
| Form field | `input` | Require a label and one element. |
| LLM markdown | `markdown` | Message only; 12,000 cumulative characters per payload. |
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
Keep its cell text within 10,000 characters per table and per message.

`data_table` includes its header in `rows`, supports up to 201 total rows and 20 columns, and requires a caption.
Keep every row the same width, use only `raw_text` or `raw_number` in the header, and keep aggregate cell text within 20,000 characters per table and per message. `page_size` is 1 to 100; `row_header_column_index` must identify an existing column.

## Newer Display Details

- `card` supports `subtext` and `slack_icon`; do not combine `slack_icon` with `icon`.
- `container` supports `narrow`, `standard`, `wide`, and `full` widths plus collapsible and header-divider fields.
- `data_visualization` titles are limited to 50 characters. Pie values must be positive; non-pie series names must be unique and provide exactly one point per axis category.

## Accessibility

- Give every image useful `alt_text`.
- Either provide a complete top-level message `text` fallback or omit it intentionally so Slack can derive accessible text from supported blocks; prefer explicit text for predictable notifications.
- Provide accessible captions for data tables.
- Keep headings and labels meaningful outside visual context.

Official reference: https://docs.slack.dev/reference/block-kit/blocks/
