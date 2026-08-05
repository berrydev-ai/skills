import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseArgs, resolvePostRequest, runSlackPost } from "./slack-post.mjs";

describe("slack-post", () => {
  test("rejects token and API URL overrides", () => {
    assert.throws(
      () => parseArgs(["--token", "synthetic-old-token", "hello"]),
      /--token is not supported/,
    );
    assert.throws(
      () => parseArgs(["--token=synthetic-old-token", "hello"]),
      /--token is not supported/,
    );
    assert.throws(
      () => parseArgs(["--url", "https://example.invalid", "hello"]),
      /unknown flag: --url/,
    );
  });

  test("requires SLACK_BOT_TOKEN and ignores alternate token names", () => {
    const args = parseArgs(["--channel", "C123", "hello"]);

    assert.throws(
      () =>
        resolvePostRequest(args, {
          SLACK_POST_BOT_TOKEN: "synthetic-old-post-token",
        }),
      /SLACK_BOT_TOKEN/,
    );
  });

  test("resolves the standard channel and optional target member", () => {
    const request = resolvePostRequest(parseArgs(["check this"]), {
      SLACK_BOT_TOKEN: "synthetic-bot-token",
      SLACK_CHANNEL_ID: "C_TARGET",
      SLACK_TARGET_MEMBER_ID: "U_REVIEWER",
    });

    assert.deepEqual(request, {
      apiUrl: "https://slack.com/api/chat.postMessage",
      channel: "C_TARGET",
      format: "text",
      text: "<@U_REVIEWER> check this",
      token: "synthetic-bot-token",
    });
  });

  test("explicit channel and target member override environment defaults", () => {
    const env = {
      SLACK_BOT_TOKEN: "synthetic-bot-token",
      SLACK_CHANNEL_ID: "C_DEFAULT",
      SLACK_TARGET_MEMBER_ID: "U_DEFAULT",
    };

    const request = resolvePostRequest(
      parseArgs([
        "--channel",
        "C_OVERRIDE",
        "--target-member-id",
        "U_OVERRIDE",
        "check this",
      ]),
      env,
    );

    assert.equal(request.channel, "C_OVERRIDE");
    assert.equal(request.text, "<@U_OVERRIDE> check this");
  });

  test("posts with SLACK_BOT_TOKEN", async () => {
    let captured;
    const stdout = [];
    const fetchFn = async (input, init) => {
      captured = { input, init };
      return new Response(JSON.stringify({ ok: true, channel: "C123", ts: "123.456" }), {
        status: 200,
        statusText: "OK",
      });
    };

    const result = await runSlackPost(
      ["--format", "json", "--channel", "C123", "hello"],
      {
        env: {
          SLACK_BOT_TOKEN: "synthetic-bot-token",
          SLACK_POST_BOT_TOKEN: "synthetic-old-post-token",
        },
        fetchFn,
        stdout: (line) => stdout.push(line),
      },
    );

    assert.equal(result?.ok, true);
    assert.equal(captured?.input, "https://slack.com/api/chat.postMessage");
    assert.equal(
      captured?.init?.headers.Authorization,
      "Bearer synthetic-bot-token",
    );
    assert.deepEqual(JSON.parse(String(captured?.init?.body)), {
      channel: "C123",
      text: "hello",
    });
    assert.deepEqual(JSON.parse(stdout[0]), {
      ok: true,
      response: { channel: "C123", ok: true, ts: "123.456" },
      status: "200 OK",
      status_code: 200,
    });
  });
});
