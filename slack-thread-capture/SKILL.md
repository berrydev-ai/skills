---
name: slack-thread-capture
description: Capture a Slack thread from an official permalink or channel and thread timestamp into JSON, JSONL, text, and summary evidence. Use for debugging, smoke evidence, issue preparation, and thread comparison with a configured Slack bot token.
---

# Slack Thread Capture

Preserve one Slack thread as durable local evidence. Use the bundled command instead of an ad hoc request.

## Safety

- Capture only conversations the user has authorized you to inspect.
- Keep `SLACK_BOT_TOKEN` in the process environment. Never print, inspect, or pass it as an argument.
- Treat captures as sensitive. They contain raw Slack message objects and text.
- Review capture contents before committing or sharing them.
- Do not create a live Slack message merely to test this skill unless the user explicitly approves the external post.

## Requirements

- Use Node.js 18 or newer. No package install is required.
- Set `SLACK_BOT_TOKEN`. No other token name is accepted.
- Grant the token the history scope for the target conversation:

| Conversation | Slack scope |
| --- | --- |
| Public channel | `channels:history` |
| Private channel | `groups:history` |
| Direct message | `im:history` |
| Multi-person direct message | `mpim:history` |

The bot must be able to see the conversation. The script reads `process.env` only and does not locate or parse `.env` files.

## Capture a Permalink

Resolve `SKILL_DIR` as the absolute directory containing this `SKILL.md`, using
the file location from which the agent host loaded this skill. `SKILL_DIR` is a
local shell variable for this invocation, not a runtime variable supplied by
any particular host.

```sh
node "$SKILL_DIR/scripts/capture-thread.mjs" "$SLACK_THREAD_URL"
```

Only official HTTPS `slack.com` permalinks are accepted.

## Capture a Channel and Timestamp

```sh
node "$SKILL_DIR/scripts/capture-thread.mjs" \
  --channel "$SLACK_CHANNEL_ID" \
  --ts "$SLACK_THREAD_TS"
```

Accept dotted API timestamps and permalink-style timestamps beginning with `p`.

## Dry Run

Parse the target and show output paths without calling Slack:

```sh
node "$SKILL_DIR/scripts/capture-thread.mjs" \
  "$SLACK_THREAD_URL" \
  --dry-run
```

## Outputs

Write captures under `.context/slack-thread-capture/<channel>-<permalink-ts>/` in the current project by default.

| File | Contents |
| --- | --- |
| `thread.json` | Target, API pages, and combined messages. |
| `thread.jsonl` | One message object per line. |
| `thread.txt` | Readable transcript with Slack author IDs. |
| `summary.json` | Capture time, target, count, permalink, and output paths. |

Use `--out-dir "$SLACK_CAPTURE_DIR"` for an existing evidence bundle. Use `--run-id "$SLACK_CAPTURE_RUN_ID"` for a stable, filesystem-safe name.

Capture files are written with owner-only file permissions where the operating system supports them.

## Pagination and Rate Limits

- Default to 15 messages per page so the command also fits Slack's tighter limit for some commercially distributed apps.
- Use a larger `--limit` only when the app's Slack distribution and rate-limit tier allow it.
- Follow Slack cursors until the thread is complete.
- Retry HTTP 429 and Slack `ratelimited` responses up to five attempts using Slack's retry delay.

## Token and Path Guardrails

- Reject `--token` and ignore alternate token environment variables.
- Reject custom API URLs. Send credentials only to `https://slack.com/api`.
- Reject unsafe run IDs that could escape the output directory.

## Verify

Run deterministic tests without calling Slack:

```sh
node --test "$SKILL_DIR/scripts/capture-thread.test.mjs"
```

For live proof, capture an existing authorized thread and verify all four files plus the message count. A local test proves parsing and file behavior, not Slack access.
