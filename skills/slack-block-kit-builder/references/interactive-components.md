# Interactive Components

Choose an element that is supported by both the containing block and the target surface.

## Containers

| Container | Typical elements |
| --- | --- |
| `actions` | Buttons, checkboxes, date and time pickers, selects, overflow, radio buttons, rich-text input, workflow buttons. |
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

## Surface Exceptions

| Element | Supported surfaces |
| --- | --- |
| `email_text_input`, `file_input`, `number_input`, `url_text_input` | Modals only |
| `datetimepicker` | Messages and modals |
| `rich_text_input` | Modals and Home tabs |
| `feedback_buttons`, `icon_button` | Messages, inside `context_actions` |
| `workflow_button` | Messages, inside `actions` or `section` |

All common buttons, checkboxes, date and time pickers, selects, overflow menus, plain-text inputs, and radio groups still require a compatible parent block. Confirm the exact reference page when using a recently added element.

## IDs and Values

- Keep `action_id` stable and descriptive, using a verb and noun.
- Use a unique `block_id` for each message or view iteration, including updates.
- Keep button and option `value` fields opaque and non-secret.
- Record modal value paths as `view.state.values[block_id][action_id]`.
- Give `workflow_button` an `action_id`, `plain_text` label, and workflow object. It starts the configured workflow; it does not submit unrelated Home-tab or modal input state.

## Safety and Accessibility

- Add a confirmation object to destructive controls.
- Use one primary action per decision area.
- Put the most important actions first for mobile layouts.
- Add `accessibility_label` when the visible control text does not explain the action.
- Handle the matching interaction payload before shipping an interactive control.

Official reference: https://docs.slack.dev/reference/block-kit/block-elements/
