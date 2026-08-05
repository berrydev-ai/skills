import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { validatePayload } from "./validate-block-kit.mjs";

describe("Slack Block Kit validator", () => {
  test("accepts a message with a fallback and supported blocks", () => {
    const result = validatePayload({
      text: "Deployment status",
      blocks: [
        { type: "header", text: { type: "plain_text", text: "Deployment status" } },
        { type: "section", text: { type: "mrkdwn", text: "Checks passed." } },
      ],
    });

    assert.deepEqual(result, { errors: [], warnings: [] });
  });

  test("warns when a message has no top-level fallback text", () => {
    const result = validatePayload({
      blocks: [{ type: "section", text: { type: "plain_text", text: "Status" } }],
    });

    assert.deepEqual(result.errors, []);
    assert.match(result.warnings[0], /top-level text fallback/);
  });

  test("enforces current Slack surface compatibility", () => {
    const result = validatePayload({
      text: "Status",
      blocks: [
        {
          type: "alert",
          text: { type: "plain_text", text: "Review the form." },
          level: "warning",
        },
      ],
    });

    assert.match(result.errors[0], /alert.*not supported on message/);
  });

  test("accepts supported child blocks inside a message container", () => {
    const result = validatePayload({
      text: "Bulk update",
      blocks: [
        {
          type: "container",
          title: { type: "plain_text", text: "Bulk update" },
          child_blocks: [
            { type: "section", text: { type: "plain_text", text: "Review changes." } },
            { type: "divider" },
          ],
        },
      ],
    });

    assert.deepEqual(result.errors, []);
  });

  test("rejects unknown blocks and current per-message limits", () => {
    const result = validatePayload({
      text: "Metrics",
      blocks: [
        { type: "unknown_block" },
        { type: "table", rows: [] },
        { type: "table", rows: [] },
        { type: "data_visualization", title: "One", chart: { type: "pie", segments: [] } },
        { type: "data_visualization", title: "Two", chart: { type: "pie", segments: [] } },
        { type: "data_visualization", title: "Three", chart: { type: "pie", segments: [] } },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("unknown block type")));
    assert.ok(result.errors.some((error) => error.includes("one table block")));
    assert.ok(result.errors.some((error) => error.includes("two data_visualization")));
  });
});
