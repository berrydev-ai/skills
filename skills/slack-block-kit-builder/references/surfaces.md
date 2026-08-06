# Surfaces

## Comparison

| Surface | Limit | Best for | API shape |
| --- | --- | --- | --- |
| Message | 50 blocks | Shared updates, replies, alerts, AI responses | `{ text, blocks }` |
| Modal | 100 blocks | Focused forms and confirmations | `{ type: "modal", title, blocks }` |
| Home tab | 100 blocks | Personalized dashboards | `{ type: "home", blocks }` |

## Message

- Include top-level `text` when predictable notifications and screen-reader fallback matter.
- Use `thread_ts` to reply in a thread.
- Use `chat.update` and the original `ts` to update a message.
- Use `chat.postEphemeral` for a user-only response.
- Use streaming methods for incremental AI text when the app supports Slack's streaming contract.

Message-only blocks include `container`, `context_actions`, `data_visualization`, `file`, `markdown`, `plan`, and `task_card`.

## Modal

- Keep the title short.
- Use `input` blocks for submitted values.
- Use `callback_id` to route submissions.
- Read submitted values by `block_id` and `action_id`.
- Return field errors against the matching `block_id`.
- Use `views.open`, `views.update`, or `views.push` according to the view flow.

`alert` is currently modal-only.

## Home Tab

- Publish with `views.publish` for one user.
- Keep content personalized and stable enough to act as an app landing page.
- Refresh on the app-home-open event when data changes.
- Use message-and-Home blocks such as `carousel`, `data_table`, and `table` only after confirming current field support.

## Compatibility Rule

Do not assume a new block works on all three surfaces. Check the block's official reference page before composing the payload.

Official block inventory: https://docs.slack.dev/reference/block-kit/blocks/
