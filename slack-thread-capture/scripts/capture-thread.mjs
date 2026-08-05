#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SLACK_API_URL = "https://slack.com/api";
const DEFAULT_LIMIT = 15;
const MAX_RATE_LIMIT_ATTEMPTS = 5;

/**
 * Return command help for the Slack thread capture tool.
 *
 * @returns {string}
 */
export function usage() {
  return `Usage:
  node slack-thread-capture/scripts/capture-thread.mjs <slack-thread-url> [options]
  node slack-thread-capture/scripts/capture-thread.mjs --channel <channel-id> --ts <thread-ts> [options]

Options:
  --url <url>          Official Slack thread permalink.
  --channel <id>       Slack conversation ID.
  --ts <ts>            Slack thread timestamp, dotted or permalink form.
  --limit <n>          Page size for conversations.replies; defaults to ${DEFAULT_LIMIT}.
  --out-dir <path>     Output directory; defaults under .context/slack-thread-capture.
  --run-id <id>        Safe output run ID; defaults to <channel>-<permalink-ts>.
  --dry-run            Parse inputs and print the capture plan without calling Slack.
  -h, --help           Show help.

Authentication:
  SLACK_BOT_TOKEN is required and is the only supported token path.
  --token and alternate Slack token environment variables are rejected or ignored.
  Custom API URLs are not supported; credentials are sent only to https://slack.com/api.

Outputs:
  thread.json          Captured Slack API pages, target metadata, and messages.
  thread.jsonl         One Slack message per line.
  thread.txt           Readable transcript.
  summary.json         Capture metadata and file paths.`;
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

function validateRunId(value) {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/.test(value)) {
    throw new Error("run ID must use only letters, numbers, dots, underscores, or hyphens");
  }
  return value;
}

/**
 * Normalize a dotted or permalink-style Slack timestamp.
 *
 * @param {string} value
 * @returns {{rawTs: string, ts: string}}
 */
export function normalizeSlackTs(value) {
  const raw = String(value || "")
    .trim()
    .replace(/^p/, "");

  if (/^\d+\.\d{1,6}$/.test(raw)) {
    const [seconds, fraction] = raw.split(".");
    const paddedFraction = fraction.padEnd(6, "0");
    return { rawTs: `${seconds}${paddedFraction}`, ts: `${seconds}.${paddedFraction}` };
  }

  if (/^\d{11,}$/.test(raw)) {
    const seconds = raw.slice(0, -6);
    const fraction = raw.slice(-6);
    return { rawTs: raw, ts: `${seconds}.${fraction}` };
  }

  throw new Error(`Invalid Slack timestamp: ${value}`);
}

/**
 * Parse an official HTTPS Slack thread permalink.
 *
 * @param {string} value
 * @returns {{channel: string, rawTs: string, teamDomain?: string, ts: string}}
 */
export function parseSlackThreadUrl(value) {
  const input = String(value || "").trim();
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error(`Invalid Slack URL: ${value}`);
  }

  const isSlackHost = url.hostname === "slack.com" || url.hostname.endsWith(".slack.com");
  if (url.protocol !== "https:" || !isSlackHost) {
    throw new Error(`URL is not an official Slack permalink: ${value}`);
  }

  const match = url.pathname.match(/\/archives\/([^/]+)\/p(\d{11,})/);
  if (!match) {
    throw new Error(`URL is not a Slack thread permalink: ${value}`);
  }

  const [, channel, rawTs] = match;
  const normalized = normalizeSlackTs(rawTs);
  const teamDomain =
    url.hostname === "slack.com"
      ? undefined
      : url.hostname.slice(0, -".slack.com".length) || undefined;

  return { channel, rawTs: normalized.rawTs, teamDomain, ts: normalized.ts };
}

/**
 * Build the default filesystem-safe run ID for a Slack thread target.
 *
 * @param {{channel: string, rawTs: string}} target
 * @returns {string}
 */
export function buildDefaultRunId(target) {
  return validateRunId(`${target.channel}-${target.rawTs}`);
}

/**
 * Rebuild a Slack permalink from normalized target data.
 *
 * @param {{channel: string, rawTs: string, teamDomain?: string}} target
 * @returns {string}
 */
export function buildPermalink(target) {
  const host = target.teamDomain ? `${target.teamDomain}.slack.com` : "slack.com";
  return `https://${host}/archives/${target.channel}/p${target.rawTs}`;
}

/**
 * Render Slack messages as a readable author-ID transcript.
 *
 * @param {Array<Record<string, unknown>>} messages
 * @returns {string}
 */
export function renderTranscript(messages) {
  return messages
    .map((message) => {
      const author = message.user || message.username || message.bot_id || message.app_id || "unknown";
      const text = message.text || "";
      return [`[${message.ts}] ${author}`, text, "", ""].join("\n");
    })
    .join("");
}

/**
 * Parse Slack thread capture command arguments.
 *
 * @param {string[]} argv
 * @returns {{channel: string, dryRun: boolean, help: boolean, limit: number, outDir: string, runId: string, ts: string, url: string}}
 */
export function parseArgs(argv) {
  const parsed = {
    channel: "",
    dryRun: false,
    help: false,
    limit: DEFAULT_LIMIT,
    outDir: "",
    runId: "",
    ts: "",
    url: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === undefined) continue;

    if (!arg.startsWith("--") && arg !== "-h") {
      if (parsed.url) throw new Error(`Unexpected positional argument: ${arg}`);
      parsed.url = arg;
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
      case "-h":
      case "--help":
        parsed.help = true;
        return parsed;
      case "--dry-run":
        parsed.dryRun = true;
        break;
      case "--url":
        parsed.url = getValue();
        break;
      case "--channel":
        parsed.channel = getValue();
        break;
      case "--ts":
        parsed.ts = getValue();
        break;
      case "--token":
        if (inlineValue === undefined && argv[index + 1] && !argv[index + 1].startsWith("--")) {
          index += 1;
        }
        throw new Error(
          "--token is not supported; slack-thread-capture always uses SLACK_BOT_TOKEN",
        );
      case "--limit": {
        const limit = Number.parseInt(getValue(), 10);
        if (!Number.isFinite(limit) || limit < 1) {
          throw new Error("--limit must be a positive integer");
        }
        parsed.limit = limit;
        break;
      }
      case "--out-dir":
        parsed.outDir = getValue();
        break;
      case "--run-id":
        parsed.runId = getValue();
        break;
      default:
        throw new Error(`unknown flag: ${flag}`);
    }
  }

  return parsed;
}

/**
 * Resolve a URL or explicit channel and timestamp into one thread target.
 *
 * @param {ReturnType<typeof parseArgs>} args
 * @returns {{channel: string, rawTs: string, teamDomain?: string, ts: string}}
 */
export function resolveTarget(args) {
  if (args.url) return parseSlackThreadUrl(args.url);
  if (!args.channel || !args.ts) {
    throw new Error("Provide a Slack thread URL or both --channel and --ts");
  }

  const normalized = normalizeSlackTs(args.ts);
  return {
    channel: args.channel.trim(),
    rawTs: normalized.rawTs,
    teamDomain: undefined,
    ts: normalized.ts,
  };
}

/**
 * Build the default output directory inside the caller's current project.
 *
 * @param {string} cwd
 * @param {string} runId
 * @returns {string}
 */
export function defaultOutDir(cwd, runId) {
  return path.join(cwd, ".context", "slack-thread-capture", validateRunId(runId));
}

/**
 * Resolve the standard Slack bot token.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string}
 */
export function resolveSlackToken(env = process.env) {
  return firstNonEmpty(env.SLACK_BOT_TOKEN);
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function slackApiCall(config, method, payload) {
  for (let attempt = 1; attempt <= MAX_RATE_LIMIT_ATTEMPTS; attempt += 1) {
    const url = new URL(`${SLACK_API_URL}/${method}`);
    for (const [key, value] of Object.entries(payload)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }

    const response = await config.fetchFn(url, {
      headers: { Authorization: `Bearer ${config.token}` },
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`Slack API ${method} returned invalid JSON: ${response.statusText}`);
    }

    const rateLimited =
      response.status === 429 || data.error === "ratelimited" || data.error === "rate_limited";
    if (rateLimited && attempt < MAX_RATE_LIMIT_ATTEMPTS) {
      const retryAfterSeconds =
        Number(response.headers.get("retry-after")) || Number(data.retry_after) || 60;
      await config.sleepFn(retryAfterSeconds * 1000);
      continue;
    }

    if (!response.ok || !data.ok) {
      throw new Error(`Slack API ${method} failed: ${data.error || response.statusText}`);
    }
    return data;
  }

  throw new Error(`Slack API ${method} failed: rate limited`);
}

/**
 * Fetch every cursor-paginated message in a Slack thread.
 *
 * @param {{fetchFn: typeof fetch, limit: number, sleepFn: (ms: number) => Promise<void>, token: string}} config
 * @param {{channel: string, ts: string}} target
 * @returns {Promise<{messages: Array<Record<string, unknown>>, pages: Array<Record<string, unknown>>}>}
 */
export async function fetchThreadMessages(config, target) {
  const messages = [];
  const pages = [];
  let cursor = "";

  for (;;) {
    const page = await slackApiCall(config, "conversations.replies", {
      channel: target.channel,
      cursor,
      limit: config.limit,
      ts: target.ts,
    });
    pages.push(page);
    messages.push(...(page.messages || []));
    cursor = page.response_metadata?.next_cursor || "";
    if (!cursor) return { messages, pages };
  }
}

function writePrivateFile(filePath, contents) {
  fs.mkdirSync(path.dirname(filePath), { mode: 0o700, recursive: true });
  fs.writeFileSync(filePath, contents, { encoding: "utf8", mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function writeJson(filePath, value) {
  writePrivateFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

/**
 * Write JSON, JSONL, text, and summary artifacts for a captured Slack thread.
 *
 * @param {{capturedAt?: string, messages: Array<Record<string, unknown>>, outDir: string, pages: Array<Record<string, unknown>>, target: {channel: string, rawTs: string, teamDomain?: string, ts: string}}} capture
 * @returns {{captured_at: string, channel: string, files: Record<string, string>, message_count: number, permalink: string, thread_ts: string}}
 */
export function writeCapture({
  capturedAt = new Date().toISOString(),
  messages,
  outDir,
  pages,
  target,
}) {
  const permalink = buildPermalink(target);
  const files = {
    json: path.join(outDir, "thread.json"),
    jsonl: path.join(outDir, "thread.jsonl"),
    summary: path.join(outDir, "summary.json"),
    transcript: path.join(outDir, "thread.txt"),
  };

  writeJson(files.json, { captured_at: capturedAt, messages, pages, permalink, target });
  writePrivateFile(
    files.jsonl,
    messages.length > 0 ? `${messages.map((message) => JSON.stringify(message)).join("\n")}\n` : "",
  );
  writePrivateFile(files.transcript, renderTranscript(messages));

  const summary = {
    captured_at: capturedAt,
    channel: target.channel,
    files,
    message_count: messages.length,
    permalink,
    thread_ts: target.ts,
  };
  writeJson(files.summary, summary);
  return summary;
}

/**
 * Run a Slack thread capture with injectable dependencies for deterministic tests.
 *
 * @param {string[]} [argv]
 * @param {{cwd?: string, env?: Record<string, string | undefined>, fetchFn?: typeof fetch, now?: () => Date, sleepFn?: (ms: number) => Promise<void>, stdout?: (message: string) => void}} [options]
 * @returns {Promise<Record<string, unknown>>}
 */
export async function runSlackThreadCapture(argv = process.argv.slice(2), options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const fetchFn = options.fetchFn ?? fetch;
  const now = options.now ?? (() => new Date());
  const sleepFn = options.sleepFn ?? sleep;
  const stdout = options.stdout ?? console.log;
  const args = parseArgs(argv);

  if (args.help) {
    stdout(usage());
    return { status: "help" };
  }

  const target = resolveTarget(args);
  const runId = validateRunId(args.runId || buildDefaultRunId(target));
  const outDir = args.outDir ? path.resolve(cwd, args.outDir) : defaultOutDir(cwd, runId);
  const plan = {
    api_url: SLACK_API_URL,
    limit: args.limit,
    out_dir: outDir,
    run_id: runId,
    target,
  };

  if (args.dryRun) {
    stdout(JSON.stringify(plan, null, 2));
    return { plan, status: "dry-run" };
  }

  const token = resolveSlackToken(env);
  if (!token) {
    throw new Error("Missing Slack token: set SLACK_BOT_TOKEN");
  }

  const { messages, pages } = await fetchThreadMessages(
    { fetchFn, limit: plan.limit, sleepFn, token },
    target,
  );
  const summary = writeCapture({
    capturedAt: now().toISOString(),
    messages,
    outDir,
    pages,
    target,
  });
  stdout(JSON.stringify(summary, null, 2));
  return { status: "captured", summary };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runSlackThreadCapture().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
