# Latest Block Kit Coverage

Verified against Slack's official Block Kit reference, Block Kit Builder links, and Block Kit changelog on 2026-08-06. The changelog still lists the June 29 container block as the newest tagged Block Kit release; the field-level notes below reflect the current reference.

## Contents

- Recent additions
- Current block inventory
- Newer block constraints
- Streaming
- Source links

## Recent Additions

| Date | Addition | Purpose |
| --- | --- | --- |
| 2026-06-29 | `container` | Group up to 10 supported child blocks in one message container. |
| 2026-06-16 | `data_visualization` | Render pie, bar, area, or line charts in messages. |
| 2026-05-20 | `data_table` | Render rich tables with paging, sorting, filtering, and interaction. |
| 2026-04-16 | `alert`, `card`, `carousel` | Render modal alerts, rich cards, and grouped card browsing. |
| 2026-03-06 | Expanded markdown and rich text | Render code, tables, task lists, dividers, and variable-sized headers. |
| 2026-02-11 | `task_card`, `plan`, URL source | Show agent tasks, status, output, and citations. |
| 2025-10-07 | `context_actions`, feedback and icon buttons, streaming methods | Add AI response feedback and streamed responses. |
| 2025-08-14 | `table` | Render simpler structured tables. |
| 2025-02-03 | `markdown` | Render standard markdown for AI responses. |

## Current Block Inventory

- `actions`
- `alert`
- `card`
- `carousel`
- `container`
- `context`
- `context_actions`
- `data_table`
- `data_visualization`
- `divider`
- `file`
- `header`
- `image`
- `input`
- `markdown`
- `plan`
- `rich_text`
- `section`
- `table`
- `task_card`
- `video`

## Newer Block Constraints

### Container

- Use only in messages.
- Provide `title` or `rich_text_title`.
- Put 1 to 10 supported blocks in `child_blocks`.
- Supported children are `actions`, `context`, `divider`, `file`, `header`, `image`, `input`, `rich_text`, `section`, `table`, and `video`.
- Use `narrow`, `standard`, `wide`, or `full` for `width`.
- Keep `title` and `subtitle` at or below 150 characters.
- Use `is_collapsible` to enable collapsing, `default_collapsed` only with collapsing enabled, and `has_header_divider` only for a non-collapsible header divider.
- Use `icon` for an optional accessible image next to the title.

### Data Visualization

- Use only in messages.
- Use at most two per message.
- Provide a title and a `pie`, `bar`, `area`, or `line` chart.
- Keep the title at or below 50 characters.
- Use 1 to 12 pie segments or data series.
- Keep segment labels, series names, point labels, and axis categories at or below 20 characters.
- Use positive pie values. Non-pie values may be negative.
- Keep series names unique. Use 1 to 20 data points per series and provide exactly one point for every axis category.
- Keep optional axis labels at or below 50 characters.

### Data Table

- Use in messages or Home tabs.
- Provide an accessible `caption`.
- Include a header plus at least one data row; use at most 201 total rows and 20 columns.
- Keep every row the same width.
- Use `raw_text` or `raw_number` in header cells. Use `raw_text`, `raw_number`, or `rich_text` in data cells.
- Use `page_size` from 1 to 100; the default is 5.
- Use `row_header_column_index` to identify an existing column for screen readers; the default is 0.
- Keep aggregate cell text within Slack's current 20,000-character limit.

### Alert

- Use only in modals.
- Keep alert text at or below 200 characters.
- Use `default`, `info`, `warning`, `error`, or `success` for `level`.

### Card and Carousel

- Use 1 to 10 cards in `carousel.elements`.
- Give a card at least one of `hero_image`, `title`, `actions`, or `body`.
- Use at most three button actions.
- Keep `title` and `subtitle` at or below 150 characters; keep `body` and `subtext` at or below 200.
- Use either `icon` or `slack_icon`, not both.

### Markdown and Tables

- Keep cumulative `markdown` block text within 12,000 characters per payload. Slack ignores and does not retain a markdown block's `block_id`.
- Keep `table` cell text within 10,000 characters per table and per message; use at most 100 rows, 20 cells per row, and one table per message.
- Treat `file` blocks as objects that appear when retrieving messages containing remote files; do not add them directly to an app surface.

### Element Surface Exceptions

- Use `email_text_input`, `file_input`, `number_input`, and `url_text_input` only in modals.
- Use `datetimepicker` in messages or modals, not Home tabs.
- Use `rich_text_input` in modals or Home tabs, not messages.
- Use `workflow_button`, `feedback_buttons`, and `icon_button` only in messages and only in their compatible parent blocks.

## Streaming

Use `chat.startStream`, `chat.appendStream`, and `chat.stopStream` for incremental AI responses. Confirm current method fields in Slack's reference before implementing because streaming contracts change independently from static Block Kit JSON.

## Source Links

- Block inventory: https://docs.slack.dev/reference/block-kit/blocks/
- Container: https://docs.slack.dev/reference/block-kit/blocks/container-block/
- Data visualization: https://docs.slack.dev/reference/block-kit/blocks/data-visualization-block/
- Data table: https://docs.slack.dev/reference/block-kit/blocks/data-table-block/
- Alert: https://docs.slack.dev/reference/block-kit/blocks/alert-block/
- Card: https://docs.slack.dev/reference/block-kit/blocks/card-block/
- Markdown: https://docs.slack.dev/reference/block-kit/blocks/markdown-block/
- Block elements: https://docs.slack.dev/reference/block-kit/block-elements/
- File: https://docs.slack.dev/reference/block-kit/blocks/file-block/
- Block Kit changelog: https://docs.slack.dev/changelog/tags/block-kit/
