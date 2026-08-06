# Surfaces

## Comparison

| Surface | Limit | Best for | API shape |
| --- | --- | --- | --- |
| Message | 50 blocks | Shared updates, replies, alerts, AI responses | `{ text, blocks }` |
| Modal | 100 blocks | Focused forms and confirmations | `{ type: "modal", title, blocks }` |
| Home tab | 100 blocks | Personalized dashboards | `{ type: "home", blocks }` |

## Message

- For accessibility, either include all necessary content in top-level `text` or omit `text` intentionally so Slack can derive it from supported blocks. Prefer explicit `text` when predictable notifications matter.
- Use `thread_ts` to reply in a thread.
- Use `chat.update` and the original `ts` to update a message.
- Use `chat.postEphemeral` for a user-only response.
- Use streaming methods for incremental AI text when the app supports Slack's streaming contract.

Message-only authorable blocks include `container`, `context_actions`, `data_visualization`, `markdown`, `plan`, and `task_card`.

`file` is listed as a message block because it appears in retrieved messages containing remote files; Slack's reference says not to add it directly to an app surface.

## Modal

- Keep the title short.
- Use `input` blocks for submitted values.
- Use `callback_id` to route submissions.
- Read submitted values by `block_id` and `action_id`.
- Return field errors against the matching `block_id`.
- Use `views.open`, `views.update`, or `views.push` according to the view flow.

`alert` is currently modal-only.

Modal-only input elements include `email_text_input`, `file_input`, `number_input`, and `url_text_input`. `datetimepicker` also works in messages; `rich_text_input` also works in Home tabs.

## Home Tab

- Publish with `views.publish` for one user.
- Keep content personalized and stable enough to act as an app landing page.
- Refresh on the app-home-open event when data changes.
- Use message-and-Home blocks such as `carousel`, `data_table`, and `table` only after confirming current field support.
- Use `rich_text_input` when formatted input is required.
- Do not use `email_text_input`, `file_input`, `number_input`, `url_text_input`, `datetimepicker`, or `workflow_button` on Home tabs. Move modal-only fields to a modal and trigger the modal with a regular Home-tab button.

## Compatibility Rule

Do not assume a new block works on all three surfaces. Check the block's official reference page before composing the payload.

Official block inventory: https://docs.slack.dev/reference/block-kit/blocks/
