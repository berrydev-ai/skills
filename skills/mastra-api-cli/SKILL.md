---
name: mastra-api-cli
description: Use when inspecting or operating Mastra servers through the mastra api CLI, including agents, workflows, tools, MCP, memory, observability, datasets, experiments, or deployed/local server URLs.
---

# Mastra API CLI

## Core Rule

Treat the installed CLI and the target server schema as the source of truth. The blog and docs explain intent; `mastra api --help`, leaf `--help`, and `--schema` define the command that will run today.

Use an explicit target for every multi-server task:

```bash
mastra api --url "$MASTRA_URL" agent list '{"page":0,"perPage":5}'
```

Do not read `.env` files to find URLs or tokens. Ask for the URL/token or use values already exported in the shell.

## Discovery Workflow

1. Confirm the CLI surface:

```bash
mastra --version
mastra api --help
mastra api <group> --help
mastra api <group> <leaf> --help
```

2. For any command with JSON input, inspect the route contract:

```bash
mastra api --url "$MASTRA_URL" <group> <leaf> --schema
```

3. If the CLI and docs disagree, follow the CLI/server output.

4. For observability and list commands, run one bounded live probe before adding
   filters or assuming a `jq` response shape. Some servers return shapes that
   differ from `--schema`.

```bash
mastra api --url "$MASTRA_URL" log list \
  '{"page":0,"perPage":1,"field":"timestamp","direction":"DESC"}' \
  | jq 'keys'
```

If the live response differs from `--schema`, follow the live response.

Use `/api/system/api-schema` only when the CLI schema is insufficient:

```bash
curl -fsS "$MASTRA_URL/api/system/api-schema" >/dev/null
```

## Targeting And Auth

| Need | Pattern |
| --- | --- |
| Local or remote server | `--url <url>` via `mastra api --url "$MASTRA_URL" ...` |
| Authenticated server | `mastra api --url "$MASTRA_URL" --header "Authorization: Bearer $TOKEN" ...` |
| Multiple headers | Repeat `--header` |
| Slow request | Add `--timeout <ms>` |
| Human-facing raw JSON | Add `--pretty` only after narrowing output |

Mastra docs note that observability commands may default to the hosted Mastra Platform observability target when no `--url` is supplied. For multi-server work, prefer explicit `--url` unless the user specifically wants the platform default.

## Read-Only First

Start with read-only commands unless the user explicitly asks for an action.

| Group | Read-only commands |
| --- | --- |
| `agent` | `list`, `get` |
| `workflow` | `list`, `get`, `run list`, `run get` |
| `tool` | `list`, `get` |
| `mcp` | `list`, `get`, `tool list`, `tool get` |
| `thread` | `list`, `get`, `messages` |
| `memory` | `search`, `current get`, `status` |
| `trace` | `list`, `get`, `span` |
| `log` | `list` |
| `metric` | `aggregate`, `breakdown`, `timeseries`, `percentiles`, `names`, `label-keys`, `label-values` |
| `score` | `list`, `get` |
| `dataset` | `list`, `get`, `items` |
| `experiment` | `list`, `get`, `results` |

Treat these as side-effecting or potentially externally visible:

```text
agent run
workflow run start
workflow run resume
workflow run cancel
tool execute
mcp tool execute
thread create
thread update
thread delete
memory current update
score create
dataset create
experiment run
```

Before any side-effecting command, confirm the user asked for that exact action and target URL. If the user says no mutations, do not run these commands.

## Common Developer Commands

Use these as starting points for human-facing investigations. Replace URL variables with user-provided values; do not read `.env` files to discover them.

### Check The Server Is Reachable

```bash
mastra api --url "$MASTRA_URL" agent list '{"page":0,"perPage":1}' \
  | jq '.data[] | {id, name, description}'
```

### Review The Most Recent Error Log On A Local Server

```bash
LOCAL_MASTRA_URL="${LOCAL_MASTRA_URL:-http://localhost:4111}"

mastra api --url "$LOCAL_MASTRA_URL" log list \
  '{"level":"error","page":0,"perPage":1,"field":"timestamp","direction":"DESC"}' \
  | jq '(.logs // .data // [])[0] // empty | {timestamp, level, message, traceId, threadId, runId, entityType, entityName, data}'
```

If the log includes a `traceId`, inspect the trace:

```bash
TRACE_ID="$(
  mastra api --url "$LOCAL_MASTRA_URL" log list \
    '{"level":"error","page":0,"perPage":1,"field":"timestamp","direction":"DESC"}' \
    | jq -r '(.logs // .data // [])[0].traceId // empty'
)"

test -n "$TRACE_ID" && mastra api --url "$LOCAL_MASTRA_URL" trace get "$TRACE_ID" \
  | jq '.data // .'
```

### Review Recent Warnings And Errors

For `log list`, do not assume multi-level filters work even if `--schema`
advertises `level` arrays. Prefer separate bounded queries and combine locally.

```bash
for LEVEL in error warn fatal; do
  mastra api --url "$MASTRA_URL" log list \
    "{\"level\":\"$LEVEL\",\"page\":0,\"perPage\":20,\"field\":\"timestamp\",\"direction\":\"DESC\"}" \
    | jq --arg level "$LEVEL" '{level: $level, page: (.pagination // .page), logs: (.logs // .data // [])}'
done
```

### Analyze The Most Recent Thread On A Staging Server

```bash
THREAD_ID="$(
  mastra api --url "$STAGING_MASTRA_URL" thread list \
    '{"page":0,"perPage":1,"orderBy":{"field":"updatedAt","direction":"DESC"}}' \
    | jq -r '.threads[0].id // empty'
)"

test -n "$THREAD_ID" && mastra api --url "$STAGING_MASTRA_URL" thread messages "$THREAD_ID" \
  '{"page":0,"perPage":40,"orderBy":{"field":"createdAt","direction":"ASC"}}' \
  | jq --arg threadId "$THREAD_ID" '{threadId: $threadId, messages: .messages, uiMessages: .uiMessages}'
```

To narrow by agent or resource, add `agentId` or `resourceId` to both the `thread list` and `thread messages` JSON after checking `--schema`.

### Review Recent Runtime Logs Around A Thread

```bash
mastra api --url "$MASTRA_URL" log list \
  '{"threadId":"'"$THREAD_ID"'","page":0,"perPage":20,"field":"timestamp","direction":"DESC"}' \
  | jq '(.logs // .data // [])[] | {timestamp, level, message, traceId, runId, entityType, entityName}'
```

### Inspect Recent Workflow Runs

```bash
mastra api --url "$MASTRA_URL" workflow run list <workflowId> \
  '{"page":0,"perPage":5}' \
  | jq '.data // .runs // .'
```

Always run the matching leaf `--schema` first if the output shape or filters are unclear.

## Command Map

Verify current availability with `mastra api --help`; as of CLI `1.15.0`, the groups are:

```text
agent workflow tool mcp thread memory trace log metric score dataset experiment
```

Common leaf commands:

```text
agent list|get|run
workflow list|get|run start|run list|run get|run resume|run cancel
tool list|get|execute
mcp list|get|tool list|tool get|tool execute
thread list|get|create|update|delete|messages
memory search|current get|current update|status
trace list|get|span
log list
metric aggregate|breakdown|timeseries|percentiles|names|label-keys|label-values
score create|list|get
dataset list|get|create|items
experiment list|get|run|results
```

## JSON Input

`mastra api` accepts one inline JSON object after positional arguments. Use `--schema` for the accepted shape instead of guessing.

```bash
mastra api --url "$MASTRA_URL" agent run --schema
mastra api --url "$MASTRA_URL" workflow run start --schema
mastra api --url "$MASTRA_URL" tool execute --schema
```

The schema output includes:

- `command`: CLI usage string.
- `positionals`: required IDs such as `agentId`, `workflowId`, or `runId`.
- `input.required`: whether JSON input is required.
- `input.schema`: accepted JSON object.
- `schemas`: server route schemas for path, query, body, and response details.

## Output Handling

Some servers return full agent/tool definitions from `list` commands, including long instructions and schemas. Keep output bounded.

Prefer compact projections:

```bash
mastra api --url "$MASTRA_URL" agent list '{"page":0,"perPage":5}' \
  | jq '.data[] | {id, name, description}'
```

Use IDs from the projection for detail calls:

```bash
mastra api --url "$MASTRA_URL" agent get <agentId> \
  | jq '.data | {id, name, description}'
```

Do not use `--pretty` during discovery when a `jq` projection will do.

Use wrapper-neutral projections when server versions disagree with generated
schemas:

```jq
.logs // .data // []
.pagination // .page
.threads // .data // []
.messages // .data // []
```

## Troubleshooting

| Symptom | Next step |
| --- | --- |
| `INVALID_JSON` | Fix shell quoting; pass exactly one JSON object. |
| `MISSING_INPUT` | Run the same leaf command with `--schema`. |
| `MISSING_ARGUMENT` | Check leaf `--help` for required positionals. |
| `HTTP_ERROR` | Inspect `error.details`, then compare to `--schema`. |
| `REQUEST_TIMEOUT` | Retry with `--timeout <ms>` if the action was approved. |
| `SERVER_UNREACHABLE` | Confirm `--url`, server process, and `/api/system/api-schema`. |

For trace inspection, `trace list` and `trace get` support `--verbose`; start without it and add it only when lightweight output omits needed details.

## References

- Blog announcement: https://mastra.ai/blog/upgraded-mastra-cli
- CLI reference: https://mastra.ai/reference/cli/mastra
- Build with AI: https://mastra.ai/docs/getting-started/build-with-ai
