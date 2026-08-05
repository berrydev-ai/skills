---
name: slack-post
description: Send an explicitly approved, externally visible Slack text message through chat.postMessage. Use for direct Slack posts, optional member mentions, and machine-readable post results with a configured Slack bot.
---

# Slack Post

Send one text message through Slack's official `chat.postMessage` endpoint.

## Safety

- Post only when the user or parent agent explicitly requests an external Slack message.
- Keep `SLACK_BOT_TOKEN` in the process environment. Never print, inspect, or pass it as an argument.
- Use the configured bot token. Do not substitute a user token or another app's token.
- Treat the selected channel and any mentioned member as externally visible recipients.
- Use `--format json` when another tool must parse the response.

## Requirements

- Use Node.js 18 or newer. No package install is required.
- Grant the Slack app `chat:write`.
- Add the bot to the target conversation. Grant `chat:write.public` only when the app must post to public channels it has not joined.
- Load these values into the process environment before running the script:

| Name | Requirement | Purpose |
| --- | --- | --- |
| `SLACK_BOT_TOKEN` | Required | Bot token for the connected Slack workspace. |
| `SLACK_CHANNEL_ID` | Required unless `--channel` is used | Default Slack conversation ID. |
| `SLACK_TARGET_MEMBER_ID` | Optional | Default member to mention. |

The script reads `process.env` only. It does not locate or parse `.env` files.

## Run

Resolve `SKILL_DIR` as the absolute directory containing this `SKILL.md`, using
the file location from which the agent host loaded this skill. `SKILL_DIR` is a
local shell variable for this invocation, not a runtime variable supplied by
any particular host.

```sh
node "$SKILL_DIR/scripts/slack-post.mjs" \
  --channel "$SLACK_CHANNEL_ID" \
  --prompt "$SLACK_MESSAGE"
```

Mention one member:

```sh
node "$SKILL_DIR/scripts/slack-post.mjs" \
  --target-member-id "$SLACK_TARGET_MEMBER_ID" \
  --prompt "$SLACK_MESSAGE" \
  --format json
```

Use `--target-member-id "$SLACK_TARGET_MEMBER_ID"` when the caller already supplied the exact member ID.

## Token Guardrails

- Reject `--token`.
- Ignore alternate token environment variables.
- Reject custom API URLs. The command sends the bearer token only to `https://slack.com/api/chat.postMessage`.

## Verify

Run deterministic tests without making a Slack request:

```sh
node --test "$SKILL_DIR/scripts/slack-post.test.mjs"
```

For a live post, verify the returned `ok`, `channel`, and `ts` fields. Automated tests do not prove channel visibility or the displayed bot identity.
