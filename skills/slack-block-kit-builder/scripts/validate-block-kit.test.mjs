import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, test } from "node:test";
import { validatePayload } from "./validate-block-kit.mjs";

describe("Slack Block Kit validator", () => {
  test("prints skill-directory-relative usage", () => {
    const script = fileURLToPath(
      new URL("./validate-block-kit.mjs", import.meta.url),
    );
    const output = execFileSync(process.execPath, [script, "--help"], {
      encoding: "utf8",
    });

    assert.match(
      output,
      /node "\$SKILL_DIR\/scripts\/validate-block-kit\.mjs"/,
    );
    assert.doesNotMatch(output, /node slack-block-kit-builder\/scripts\//);
  });

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

  test("rejects interactive elements that are unavailable on Home tabs", () => {
    const result = validatePayload({
      type: "home",
      blocks: [
        {
          type: "input",
          label: { type: "plain_text", text: "Escalation email" },
          element: { type: "email_text_input", action_id: "email" },
        },
        {
          type: "actions",
          elements: [
            { type: "datetimepicker", action_id: "schedule" },
            {
              type: "workflow_button",
              text: { type: "plain_text", text: "Publish" },
              workflow: { trigger: { url: "https://slack.com/shortcuts/example" } },
            },
          ],
        },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("email_text_input") && error.includes("home")));
    assert.ok(result.errors.some((error) => error.includes("datetimepicker") && error.includes("home")));
    assert.ok(result.errors.some((error) => error.includes("workflow_button") && error.includes("home")));
    assert.ok(result.errors.some((error) => error.includes("workflow_button.action_id is required")));
  });

  test("validates data-table rows, cells, pagination, and row headers", () => {
    const result = validatePayload({
      text: "Incident data",
      blocks: [
        {
          type: "data_table",
          caption: "Incidents",
          page_size: 101,
          row_header_column_index: 2,
          rows: [
            [{ type: "rich_text", elements: [] }, { type: "raw_text", text: "Owner" }],
            [{ type: "raw_text", text: "INC-1" }],
          ],
        },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("page_size")));
    assert.ok(result.errors.some((error) => error.includes("row_header_column_index")));
    assert.ok(result.errors.some((error) => error.includes("header") && error.includes("rich_text")));
    assert.ok(result.errors.some((error) => error.includes("same number of cells")));
  });

  test("validates current data-visualization schema and runtime rules", () => {
    const result = validatePayload({
      text: "Latency",
      blocks: [
        {
          type: "data_visualization",
          title: "A title that is intentionally longer than Slack's fifty character chart limit",
          chart: {
            type: "bar",
            axis_config: { categories: ["p50", "p95"] },
            series: [
              { name: "API", data: [{ label: "p50", value: 10 }] },
              { name: "API", data: [{ label: "other", value: 20 }, { label: "p95", value: 30 }] },
            ],
          },
        },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("title exceeds 50")));
    assert.ok(result.errors.some((error) => error.includes("series names must be unique")));
    assert.ok(result.errors.some((error) => error.includes("exactly one data point")));
    assert.ok(result.errors.some((error) => error.includes("does not match axis_config.categories")));
  });

  test("enforces current markdown, card, and container constraints", () => {
    const result = validatePayload({
      text: "Latest blocks",
      blocks: [
        { type: "markdown", text: "x".repeat(7000) },
        { type: "markdown", text: "y".repeat(6000) },
        {
          type: "card",
          title: { type: "plain_text", text: "Card" },
          icon: { type: "image", image_url: "https://example.com/icon.png", alt_text: "Icon" },
          slack_icon: { type: "slack_icon", name: "sparkles" },
          actions: [
            { type: "button", text: { type: "plain_text", text: "One" }, action_id: "one" },
            { type: "button", text: { type: "plain_text", text: "Two" }, action_id: "two" },
            { type: "button", text: { type: "plain_text", text: "Three" }, action_id: "three" },
            { type: "button", text: { type: "plain_text", text: "Four" }, action_id: "four" },
          ],
        },
        {
          type: "carousel",
          elements: [
            {
              type: "card",
              icon: {
                type: "image",
                image_url: "https://example.com/icon.png",
                alt_text: "Icon",
              },
              slack_icon: { type: "slack_icon", name: "sparkles" },
              title: { type: "plain_text", text: "Nested card" },
            },
          ],
        },
        {
          type: "container",
          title: { type: "plain_text", text: "Container" },
          width: "edge-to-edge",
          default_collapsed: true,
          is_collapsible: false,
          child_blocks: [{ type: "divider" }],
        },
        {
          type: "container",
          title: { type: "plain_text", text: "Collapsible container" },
          is_collapsible: true,
          has_header_divider: true,
          child_blocks: [{ type: "divider" }],
        },
        {
          type: "container",
          title: { type: "plain_text", text: "Invalid flags" },
          is_collapsible: "yes",
          default_collapsed: "no",
          has_header_divider: "yes",
          child_blocks: [{ type: "divider" }],
        },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("markdown") && error.includes("12,000")));
    assert.ok(
      result.errors.filter((error) => error.includes("icon and slack_icon")).length >= 2,
    );
    assert.ok(result.errors.some((error) => error.includes("at most 3 actions")));
    assert.ok(result.errors.some((error) => error.includes("width")));
    assert.ok(result.errors.some((error) => error.includes("default_collapsed")));
    assert.ok(result.errors.some((error) => error.includes("has_header_divider")));
    assert.ok(result.errors.filter((error) => error.includes("must be boolean")).length >= 3);
  });

  test("rejects authored file blocks and permits retrieval inspection with a warning", () => {
    const authoredResult = validatePayload({
      text: "Remote file",
      blocks: [{ type: "file", external_id: "F-1", source: "remote" }],
    });
    assert.ok(authoredResult.errors.some((error) => error.includes("retrieval-only")));

    const retrievedResult = validatePayload({
      type: "file",
      external_id: "F-1",
      source: "remote",
    });
    assert.deepEqual(retrievedResult.errors, []);
    assert.ok(retrievedResult.warnings.some((warning) => warning.includes("retrieved messages")));
  });

  test("detects duplicate block IDs inside carousel cards", () => {
    const result = validatePayload({
      text: "Cards",
      blocks: [
        {
          type: "section",
          block_id: "shared-id",
          text: { type: "mrkdwn", text: "Top level" },
        },
        {
          type: "carousel",
          block_id: "carousel-v1",
          elements: [
            {
              type: "card",
              block_id: "shared-id",
              title: { type: "plain_text", text: "Nested card" },
            },
          ],
        },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("block_id shared-id is duplicated")));
  });

  test("accepts current Home-tab rich text and current chart and table schemas", () => {
    const homeResult = validatePayload({
      type: "home",
      blocks: [
        {
          type: "input",
          block_id: "summary-v1",
          label: { type: "plain_text", text: "Summary" },
          element: { type: "rich_text_input", action_id: "edit_summary" },
        },
        {
          type: "actions",
          block_id: "notes-actions-v1",
          elements: [{ type: "rich_text_input", action_id: "edit_notes" }],
        },
      ],
    });
    assert.deepEqual(homeResult, { errors: [], warnings: [] });

    const messageResult = validatePayload({
      text: "Incident metrics",
      blocks: [
        {
          type: "data_table",
          caption: "Incidents by service",
          page_size: 10,
          row_header_column_index: 0,
          rows: [
            [
              { type: "raw_text", text: "Service" },
              { type: "raw_text", text: "Incidents" },
            ],
            [
              { type: "raw_text", text: "API" },
              { type: "raw_number", value: 3, text: "3" },
            ],
          ],
        },
        {
          type: "data_visualization",
          title: "Latency percentiles",
          chart: {
            type: "bar",
            axis_config: { categories: ["p50", "p95"] },
            series: [
              {
                name: "API",
                data: [
                  { label: "p50", value: 120 },
                  { label: "p95", value: 480 },
                ],
              },
            ],
          },
        },
      ],
    });
    assert.deepEqual(messageResult, { errors: [], warnings: [] });
  });

  test("validates simple-table settings, task cards, and duplicate block IDs", () => {
    const rows = Array.from({ length: 101 }, () => [
      { type: "raw_number", value: "not-a-number" },
    ]);
    const result = validatePayload({
      text: "Plan",
      blocks: [
        {
          type: "table",
          block_id: "duplicate",
          rows,
          column_settings: [{ align: "justify" }],
        },
        {
          type: "plan",
          block_id: "duplicate",
          title: "Work plan",
          tasks: [{ title: "Missing ID", status: "blocked" }],
        },
      ],
    });

    assert.ok(result.errors.some((error) => error.includes("exceeds 100 rows")));
    assert.ok(result.errors.some((error) => error.includes("value must be a number")));
    assert.ok(result.errors.some((error) => error.includes("align is not supported")));
    assert.ok(result.errors.some((error) => error.includes("task_id is required")));
    assert.ok(result.errors.some((error) => error.includes("status is not supported")));
    assert.ok(result.errors.some((error) => error.includes("block_id duplicate is duplicated")));
  });
});
