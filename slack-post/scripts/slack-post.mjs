#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage";

/**
 * Return command help for the Slack post tool.
 *
 * @returns {string}
 */
export function usage() {
  return `Usage:
  node slack-post/scripts/slack-post.mjs [message]

Examples:
  node slack-post/scripts/slack-post.mjs --prompt "System check complete"
  node slack-post/scripts/slack-post.mjs --channel <channel-id> --prompt <message>
  node slack-post/scripts/slack-post.mjs --format json --target-member-id <member-id> <message>

Configuration:
  SLACK_BOT_TOKEN                Required Slack bot token.
  SLACK_CHANNEL_ID               Default Slack channel ID when --channel is omitted.
  SLACK_TARGET_MEMBER_ID         Optional default member ID to mention.

Flags:
  --channel <channel>            Slack conversation ID. Defaults to SLACK_CHANNEL_ID.
  --target-member-id <id>        Slack member ID to mention.
  --member-id <id>               Alias for --target-member-id.
  --prompt <text>                Prompt or message text to send.
  --format <text|json>           Output format. Defaults to text.
  -h, --help                     Show help.

Unsupported:
  --token                        Not allowed. This tool always uses SLACK_BOT_TOKEN.
  --url                          Not allowed. This tool sends credentials only to Slack's API.`;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return "";
}

function readFlagValue(args, index, flag) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value`);
  }
  return [value, index + 1];
}

function splitFlag(arg) {
  const equalsIndex = arg.indexOf("=");
  if (equalsIndex === -1) return [arg, undefined];
  return [arg.slice(0, equalsIndex), arg.slice(equalsIndex + 1)];
}

/**
 * Parse Slack post command arguments.
 *
 * @param {string[]} argv
 * @returns {{channel?: string, targetMemberId?: string, prompt?: string, format: "text" | "json", positional: string[], showHelp: boolean}}
 */
export function parseArgs(argv) {
  const parsed = {
    format: "text",
    positional: [],
    showHelp: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;

    if (arg === "--help" || arg === "-h") {
      parsed.showHelp = true;
      return parsed;
    }

    if (!arg.startsWith("--")) {
      parsed.positional.push(arg);
      continue;
    }

    const [flag, inlineValue] = splitFlag(arg);
    const getValue = () => {
      if (inlineValue !== undefined) return inlineValue;
      const [value, nextIndex] = readFlagValue(argv, index, flag);
      index = nextIndex;
      return value;
    };

    switch (flag) {
      case "--token": {
        const nextArg = argv[index + 1];
        if (inlineValue === undefined && nextArg !== undefined && !nextArg.startsWith("--")) {
          index += 1;
        }
        throw new Error(
          "--token is not supported; slack-post always uses SLACK_BOT_TOKEN",
        );
      }
      case "--channel":
        parsed.channel = getValue();
        break;
      case "--target-member-id":
      case "--member-id":
        parsed.targetMemberId = getValue();
        break;
      case "--prompt":
        parsed.prompt = getValue();
        break;
      case "--format": {
        const format = getValue();
        if (format !== "text" && format !== "json") {
          throw new Error("--format must be text or json");
        }
        parsed.format = format;
        break;
      }
      default:
        throw new Error(`unknown flag: ${flag}`);
    }
  }

  return parsed;
}

/**
 * Resolve the fixed Slack API request from parsed arguments and environment variables.
 *
 * @param {ReturnType<typeof parseArgs>} args
 * @param {Record<string, string | undefined>} env
 * @returns {{apiUrl: string, token: string, channel: string, text: string, format: "text" | "json"}}
 */
export function resolvePostRequest(args, env) {
  const token = firstNonEmpty(env.SLACK_BOT_TOKEN);
  const channel = firstNonEmpty(args.channel, env.SLACK_CHANNEL_ID);
  const prompt = firstNonEmpty(
    args.prompt,
    args.positional.length > 0 ? args.positional.join(" ") : undefined,
  );

  const targetMemberId = firstNonEmpty(args.targetMemberId, env.SLACK_TARGET_MEMBER_ID);

  const missing = [];
  if (!token) missing.push("SLACK_BOT_TOKEN");
  if (!channel) missing.push("--channel or SLACK_CHANNEL_ID");
  if (!prompt) missing.push("--prompt or positional message text");

  if (missing.length > 0) {
    throw new Error(`missing required value(s): ${missing.join(", ")}`);
  }

  return {
    apiUrl: SLACK_POST_MESSAGE_URL,
    token,
    channel,
    text: targetMemberId ? `<@${targetMemberId}> ${prompt}` : prompt,
    format: args.format,
  };
}

/**
 * Post one text message through Slack's official Web API endpoint.
 *
 * @param {{token: string, channel: string, text: string}} params
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<{status: string, status_code: number, ok: boolean, response?: unknown}>}
 */
export async function postMessage(params, fetchFn = fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);

  try {
    const response = await fetchFn(SLACK_POST_MESSAGE_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${params.token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({ channel: params.channel, text: params.text }),
    });

    const rawBody = await response.text();
    let responseBody;
    try {
      responseBody = JSON.parse(rawBody);
    } catch {
      responseBody = rawBody;
    }

    const result = {
      status: `${response.status} ${response.statusText}`,
      status_code: response.status,
      ok: false,
      response: responseBody,
    };

    if (!response.ok) {
      throw Object.assign(new Error(`Slack API HTTP error: ${result.status}`), { result });
    }

    if (typeof responseBody !== "object" || responseBody === null || !("ok" in responseBody)) {
      throw Object.assign(new Error("decode Slack API response: missing ok field"), { result });
    }

    result.ok = responseBody.ok === true;
    if (!result.ok) {
      throw Object.assign(
        new Error(
          responseBody.error
            ? `Slack API error: ${responseBody.error}`
            : "Slack API returned ok=false",
        ),
        { result },
      );
    }

    return result;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("post Slack message: request timed out after 15 seconds");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Write a Slack API result as text or machine-readable JSON.
 *
 * @param {"text" | "json"} format
 * @param {{status: string, status_code: number, ok: boolean, response?: unknown}} result
 * @param {(message: string) => void} [stdout]
 */
export function writeResult(format, result, stdout = console.log) {
  if (format === "json") {
    stdout(JSON.stringify(result));
    return;
  }
  stdout(`Response Status: ${result.status}`);
  stdout(`Response Body: ${JSON.stringify(result.response)}`);
}

/**
 * Run the Slack post command with injectable dependencies for deterministic tests.
 *
 * @param {string[]} argv
 * @param {{env?: Record<string, string | undefined>, fetchFn?: typeof fetch, stdout?: (message: string) => void}} [options]
 * @returns {Promise<{status: string, status_code: number, ok: boolean, response?: unknown} | undefined>}
 */
export async function runSlackPost(argv, options = {}) {
  const stdout = options.stdout ?? console.log;
  const args = parseArgs(argv);
  if (args.showHelp) {
    stdout(usage());
    return undefined;
  }

  const request = resolvePostRequest(args, options.env ?? process.env);
  const result = await postMessage(
    { token: request.token, channel: request.channel, text: request.text },
    options.fetchFn,
  );
  writeResult(request.format, result, stdout);
  return result;
}

async function main() {
  await runSlackPost(process.argv.slice(2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await main();
  } catch (error) {
    if (error?.result) writeResult("json", error.result);
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
