import assert from "node:assert/strict";
import fs from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  buildDefaultRunId,
  defaultOutDir,
  normalizeSlackTs,
  parseArgs,
  parseSlackThreadUrl,
  renderTranscript,
  resolveSlackToken,
  runSlackThreadCapture,
  usage,
} from "./capture-thread.mjs";

const tempDirs = [];

async function makeTempDir(prefix = "slack-thread-capture-") {
  const dir = await mkdtemp(path.join(tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { force: true, recursive: true })));
});

function okSlackResponse(body) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status: 200,
    statusText: "OK",
  });
}

describe("slack thread capture helpers", () => {
  test("prints skill-directory-relative usage", () => {
    assert.match(
      usage(),
      /node "\$SKILL_DIR\/scripts\/capture-thread\.mjs"/,
    );
    assert.doesNotMatch(usage(), /node slack-thread-capture\/scripts\//);
  });

  test("parses a Slack permalink into a channel and thread timestamp", () => {
    assert.deepEqual(
      parseSlackThreadUrl(
        "https://workspace.slack.com/archives/C0123456789/p1778010596888699",
      ),
      {
        channel: "C0123456789",
        rawTs: "1778010596888699",
        teamDomain: "workspace",
        ts: "1778010596.888699",
      },
    );
  });

  test("rejects non-Slack and non-HTTPS permalinks", () => {
    assert.throws(
      () =>
        parseSlackThreadUrl(
          "https://example.invalid/archives/C0123456789/p1778010596888699",
        ),
      /official Slack permalink/,
    );
    assert.throws(
      () =>
        parseSlackThreadUrl(
          "http://workspace.slack.com/archives/C0123456789/p1778010596888699",
        ),
      /official Slack permalink/,
    );
  });

  test("normalizes dotted and permalink-style Slack timestamps", () => {
    assert.deepEqual(normalizeSlackTs("1778010596.1"), {
      rawTs: "1778010596100000",
      ts: "1778010596.100000",
    });
    assert.deepEqual(normalizeSlackTs("p1778010596888699"), {
      rawTs: "1778010596888699",
      ts: "1778010596.888699",
    });
  });

  test("builds filesystem-safe default paths in the current project", () => {
    const target = { channel: "C0123456789", rawTs: "1778010596888699" };
    const runId = buildDefaultRunId(target);

    assert.equal(runId, "C0123456789-1778010596888699");
    assert.equal(
      defaultOutDir("/work/project", runId),
      path.join("/work/project", ".context", "slack-thread-capture", runId),
    );
  });

  test("renders a readable transcript", () => {
    assert.equal(
      renderTranscript([
        { text: "Root message", ts: "1778010596.888699", user: "U123" },
        { bot_id: "B456", text: "Thread reply", ts: "1778010600.000100" },
      ]),
      [
        "[1778010596.888699] U123",
        "Root message",
        "",
        "[1778010600.000100] B456",
        "Thread reply",
        "",
        "",
      ].join("\n"),
    );
  });

  test("rejects token and API URL overrides", () => {
    assert.throws(
      () => parseArgs(["--token", "synthetic-old-token"]),
      /--token is not supported/,
    );
    assert.throws(
      () => parseArgs(["--token=synthetic-old-token"]),
      /--token is not supported/,
    );
    assert.throws(
      () => parseArgs(["--api-url", "https://example.invalid"]),
      /unknown flag: --api-url/,
    );
  });

  test("uses only SLACK_BOT_TOKEN", () => {
    assert.equal(
      resolveSlackToken({
        SLACK_POST_BOT_TOKEN: "synthetic-post-token",
        SLACK_TOKEN: "synthetic-user-token",
      }),
      "",
    );
    assert.equal(
      resolveSlackToken({
        SLACK_BOT_TOKEN: "synthetic-bot-token",
        SLACK_TOKEN: "synthetic-user-token",
      }),
      "synthetic-bot-token",
    );
  });
});

describe("slack thread capture runner", () => {
  test("supports dry-run mode without calling Slack", async () => {
    const cwd = await makeTempDir();
    let called = false;
    const stdout = [];

    const result = await runSlackThreadCapture(
      [
        "https://workspace.slack.com/archives/C0123456789/p1778010596888699",
        "--dry-run",
      ],
      {
        cwd,
        fetchFn: async () => {
          called = true;
          return okSlackResponse({ ok: true, messages: [] });
        },
        stdout: (line) => stdout.push(line),
      },
    );

    assert.equal(called, false);
    assert.equal(result.status, "dry-run");
    assert.deepEqual(JSON.parse(stdout[0]).target, {
      channel: "C0123456789",
      rawTs: "1778010596888699",
      teamDomain: "workspace",
      ts: "1778010596.888699",
    });
  });

  test("rejects a run ID that could escape the output directory", async () => {
    const cwd = await makeTempDir();

    await assert.rejects(
      runSlackThreadCapture(
        ["--channel", "C123", "--ts", "1778010596.888699", "--run-id", "../../outside"],
        { cwd, stdout: () => {} },
      ),
      /run ID/,
    );
  });

  test("fails when the required token is missing", async () => {
    const cwd = await makeTempDir();

    await assert.rejects(
      runSlackThreadCapture(["--channel", "C123", "--ts", "1778010596.888699"], {
        cwd,
        env: {
          SLACK_TOKEN: "synthetic-user-token",
        },
        stdout: () => {},
      }),
      /SLACK_BOT_TOKEN/,
    );
  });

  test("paginates replies and writes all four capture artifacts", async () => {
    const cwd = await makeTempDir();
    const outDir = await makeTempDir();
    const stdout = [];
    const capturedRequests = [];

    const result = await runSlackThreadCapture(
      ["--channel", "C123", "--ts", "1778010596.888699", "--out-dir", outDir],
      {
        cwd,
        env: { SLACK_BOT_TOKEN: "synthetic-bot-token" },
        fetchFn: async (input, init) => {
          capturedRequests.push({ init, url: String(input) });
          if (capturedRequests.length === 1) {
            return okSlackResponse({
              messages: [{ text: "Root message", ts: "1778010596.888699", user: "U123" }],
              ok: true,
              response_metadata: { next_cursor: "next-page" },
            });
          }
          return okSlackResponse({
            messages: [{ text: "Thread reply", ts: "1778010600.000100", user: "U456" }],
            ok: true,
            response_metadata: { next_cursor: "" },
          });
        },
        now: () => new Date("2026-07-31T12:00:00.000Z"),
        stdout: (line) => stdout.push(line),
      },
    );

    assert.equal(result.status, "captured");
    assert.equal(capturedRequests.length, 2);
    assert.match(capturedRequests[0].url, /^https:\/\/slack\.com\/api\/conversations\.replies/);
    assert.match(capturedRequests[0].url, /channel=C123/);
    assert.match(capturedRequests[0].url, /limit=15/);
    assert.match(capturedRequests[1].url, /cursor=next-page/);
    assert.equal(
      capturedRequests[0].init.headers.Authorization,
      "Bearer synthetic-bot-token",
    );

    const threadJson = JSON.parse(fs.readFileSync(path.join(outDir, "thread.json"), "utf8"));
    const threadJsonl = fs.readFileSync(path.join(outDir, "thread.jsonl"), "utf8");
    const threadTxt = fs.readFileSync(path.join(outDir, "thread.txt"), "utf8");
    const summary = JSON.parse(fs.readFileSync(path.join(outDir, "summary.json"), "utf8"));

    assert.equal(threadJson.messages.length, 2);
    assert.equal(threadJson.pages.length, 2);
    assert.match(threadJsonl, /Root message/);
    assert.match(threadTxt, /Thread reply/);
    assert.deepEqual(summary, {
      captured_at: "2026-07-31T12:00:00.000Z",
      channel: "C123",
      files: summary.files,
      message_count: 2,
      permalink: "https://slack.com/archives/C123/p1778010596888699",
      thread_ts: "1778010596.888699",
    });
    assert.deepEqual(JSON.parse(stdout[0]).files, summary.files);
  });

  test("retries Slack rate limits", async () => {
    const cwd = await makeTempDir();
    const outDir = await makeTempDir();
    const sleeps = [];
    let calls = 0;

    await runSlackThreadCapture(
      ["--channel", "C123", "--ts", "1778010596.888699", "--out-dir", outDir],
      {
        cwd,
        env: { SLACK_BOT_TOKEN: "synthetic-bot-token" },
        fetchFn: async () => {
          calls += 1;
          if (calls === 1) {
            return new Response(JSON.stringify({ error: "ratelimited", ok: false }), {
              headers: { "retry-after": "1" },
              status: 429,
              statusText: "Too Many Requests",
            });
          }
          return okSlackResponse({
            messages: [{ text: "Recovered", ts: "1778010596.888699", user: "U123" }],
            ok: true,
            response_metadata: { next_cursor: "" },
          });
        },
        sleepFn: async (ms) => sleeps.push(ms),
        stdout: () => {},
      },
    );

    assert.equal(calls, 2);
    assert.deepEqual(sleeps, [1_000]);
    assert.match(fs.readFileSync(path.join(outDir, "thread.txt"), "utf8"), /Recovered/);
  });
});
