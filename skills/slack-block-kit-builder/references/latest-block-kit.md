# Latest Block Kit Coverage

Verified against Slack's official Block Kit reference and changelog on 2026-07-31.

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

### Data Visualization

- Use only in messages.
- Use at most two per message.
- Provide a title and a `pie`, `bar`, `area`, or `line` chart.
- Use 1 to 12 pie segments or data series.
- Use up to 20 data points per series and match every point label to the axis categories.

### Data Table

- Use in messages or Home tabs.
- Provide an accessible `caption`.
- Include a header plus at least one data row; use at most 201 total rows and 20 columns.
- Use `raw_text` or `raw_number` in header cells. Use `raw_text`, `raw_number`, or `rich_text` in data cells.
- Use `page_size` from 1 to 100; the default is 5.
- Keep aggregate cell text within Slack's current 20,000-character limit.

### Alert

- Use only in modals.
- Keep alert text at or below 200 characters.
- Use `default`, `info`, `warning`, `error`, or `success` for `level`.

## Streaming

Use `chat.startStream`, `chat.appendStream`, and `chat.stopStream` for incremental AI responses. Confirm current method fields in Slack's reference before implementing because streaming contracts change independently from static Block Kit JSON.

## Source Links

- Block inventory: https://docs.slack.dev/reference/block-kit/blocks/
- Container: https://docs.slack.dev/reference/block-kit/blocks/container-block/
- Data visualization: https://docs.slack.dev/reference/block-kit/blocks/data-visualization-block/
- Data table: https://docs.slack.dev/reference/block-kit/blocks/data-table-block/
- Alert: https://docs.slack.dev/reference/block-kit/blocks/alert-block/
- Block Kit changelog: https://docs.slack.dev/changelog/tags/block-kit/
