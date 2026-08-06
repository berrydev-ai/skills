# Interactive Components

Choose an element that is supported by both the containing block and the target surface.

## Containers

| Container | Typical elements |
| --- | --- |
| `actions` | Buttons, checkboxes, date and time pickers, selects, overflow, radio buttons, workflow buttons. |
| `section.accessory` | One button, image, checkbox group, picker, select, overflow, radio group, or workflow button. |
| `input.element` | One input, picker, select, checkbox group, radio group, or file input. |
| `context_actions.elements` | Feedback buttons and icon buttons. |
| `task_card.sources` | URL source elements. |

## Selection

| Need | Element |
| --- | --- |
| Direct action or link | `button` |
| One fixed choice | `static_select` or `radio_buttons` |
| Several fixed choices | `checkboxes` or multi-select |
| Large or remote choice list | `external_select` or external multi-select |
| Slack member | `users_select` |
| Public channel | `channels_select` |
| Any visible conversation | `conversations_select` |
| Date or time | `datepicker`, `timepicker`, or `datetimepicker` |
| Compact secondary menu | `overflow` |
| Text, URL, email, or number | Matching input element inside `input` |
| Formatted text | `rich_text_input` |
| Upload | `file_input` |
| AI rating | `feedback_buttons` inside `context_actions` |
| Compact contextual action | `icon_button` inside `context_actions` |
| Agent citation | URL source inside `task_card` |
| Slack workflow | `workflow_button` |

## IDs and Values

- Keep `action_id` stable and descriptive, using a verb and noun.
- Keep `block_id` stable enough to locate submitted values, but change it when updating a message or view iteration if Slack's contract requires uniqueness.
- Keep button and option `value` fields opaque and non-secret.
- Record modal value paths as `view.state.values[block_id][action_id]`.

## Safety and Accessibility

- Add a confirmation object to destructive controls.
- Use one primary action per decision area.
- Put the most important actions first for mobile layouts.
- Add `accessibility_label` when the visible control text does not explain the action.
- Handle the matching interaction payload before shipping an interactive control.

Official reference: https://docs.slack.dev/reference/block-kit/block-elements/
