#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BLOCKS_BY_SURFACE = {
  message: new Set([
    "actions",
    "card",
    "carousel",
    "container",
    "context",
    "context_actions",
    "data_table",
    "data_visualization",
    "divider",
    "file",
    "header",
    "image",
    "input",
    "markdown",
    "plan",
    "rich_text",
    "section",
    "table",
    "task_card",
    "video",
  ]),
  modal: new Set([
    "actions",
    "alert",
    "card",
    "context",
    "divider",
    "header",
    "image",
    "input",
    "rich_text",
    "section",
    "video",
  ]),
  home: new Set([
    "actions",
    "card",
    "carousel",
    "context",
    "data_table",
    "divider",
    "header",
    "image",
    "input",
    "rich_text",
    "section",
    "table",
    "video",
  ]),
};

const KNOWN_BLOCK_TYPES = new Set(
  Object.values(BLOCKS_BY_SURFACE).flatMap((types) => [...types]),
);

const CONTAINER_CHILD_TYPES = new Set([
  "actions",
  "context",
  "divider",
  "file",
  "header",
  "image",
  "input",
  "rich_text",
  "section",
  "table",
  "video",
]);

const usage = `Usage:
  node "$SKILL_DIR/scripts/validate-block-kit.mjs" <payload.json>
  node "$SKILL_DIR/scripts/validate-block-kit.mjs" < payload.json

Checks a block array, single block, message payload, modal view, or Home tab view.
Use Slack Block Kit Builder for final visual and server-side validation.`;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizePayload(payload) {
  if (Array.isArray(payload)) {
    return { blocks: payload, surface: "unknown" };
  }

  if (!isPlainObject(payload)) {
    return { error: "Expected a JSON object or block array." };
  }

  if (payload.type === "modal" || payload.type === "home") {
    if (!Array.isArray(payload.blocks)) {
      return { error: `${payload.type} view must contain a blocks array.` };
    }
    return { blocks: payload.blocks, surface: payload.type, view: payload };
  }

  if (Array.isArray(payload.blocks)) {
    return { blocks: payload.blocks, message: payload, surface: "message" };
  }

  if (typeof payload.type === "string") {
    return { blocks: [payload], surface: "unknown" };
  }

  return {
    error:
      "Expected a block array, single block, message payload with blocks, modal view, or Home tab view.",
  };
}

function validateBlockShape(block, location, surface, errors, warnings) {
  if (!isPlainObject(block)) {
    errors.push(`${location} must be an object`);
    return;
  }

  if (typeof block.type !== "string" || block.type.length === 0) {
    errors.push(`${location} must have a non-empty string type`);
    return;
  }

  if (!KNOWN_BLOCK_TYPES.has(block.type)) {
    errors.push(`${location} has unknown block type: ${block.type}`);
    return;
  }

  if (surface !== "unknown" && !BLOCKS_BY_SURFACE[surface].has(block.type)) {
    errors.push(`${location} type ${block.type} is not supported on ${surface}`);
  }

  if (typeof block.block_id === "string" && block.block_id.length > 255) {
    errors.push(`${location}.block_id exceeds 255 characters`);
  }

  if (block.type !== "container" && Array.isArray(block.child_blocks)) {
    errors.push(`${location} may not contain child_blocks; only container supports child blocks`);
  }
  if (Array.isArray(block.blocks)) {
    errors.push(`${location} may not contain blocks; use top-level blocks or container.child_blocks`);
  }

  switch (block.type) {
    case "actions":
    case "context":
    case "context_actions":
      if (!Array.isArray(block.elements)) {
        errors.push(`${location}.elements must be an array`);
      }
      break;
    case "alert":
      if (!isPlainObject(block.text)) errors.push(`${location}.text must be a text object`);
      if (block.text?.text?.length > 200) errors.push(`${location}.text exceeds 200 characters`);
      break;
    case "card":
      if (![block.hero_image, block.title, block.actions, block.body].some(Boolean)) {
        errors.push(`${location} card needs hero_image, title, actions, or body`);
      }
      break;
    case "carousel":
      if (!Array.isArray(block.elements) || block.elements.length < 1 || block.elements.length > 10) {
        errors.push(`${location}.elements must contain 1 to 10 cards`);
      } else if (block.elements.some((element) => element?.type !== "card")) {
        errors.push(`${location}.elements may contain only card objects`);
      }
      break;
    case "container":
      if (!block.title && !block.rich_text_title) {
        errors.push(`${location} container needs title or rich_text_title`);
      }
      if (
        !Array.isArray(block.child_blocks) ||
        block.child_blocks.length < 1 ||
        block.child_blocks.length > 10
      ) {
        errors.push(`${location}.child_blocks must contain 1 to 10 supported blocks`);
      } else {
        block.child_blocks.forEach((child, index) => {
          const childLocation = `${location}.child_blocks[${index}]`;
          if (!CONTAINER_CHILD_TYPES.has(child?.type)) {
            errors.push(`${childLocation} type ${child?.type ?? "missing"} is not supported in container`);
            return;
          }
          validateBlockShape(child, childLocation, "message", errors, warnings);
        });
      }
      break;
    case "data_table":
      if (typeof block.caption !== "string" || block.caption.length === 0) {
        errors.push(`${location}.caption is required`);
      }
      if (!Array.isArray(block.rows) || block.rows.length < 2 || block.rows.length > 201) {
        errors.push(`${location}.rows must contain 2 to 201 rows including the header`);
      }
      break;
    case "data_visualization":
      if (typeof block.title !== "string" || block.title.length === 0) {
        errors.push(`${location}.title is required`);
      }
      if (!isPlainObject(block.chart)) errors.push(`${location}.chart must be an object`);
      break;
    case "header":
      if (!isPlainObject(block.text)) errors.push(`${location}.text must be a text object`);
      break;
    case "image":
      if (typeof block.alt_text !== "string" || block.alt_text.length === 0) {
        errors.push(`${location}.alt_text is required for accessibility`);
      }
      if (!block.image_url && !block.slack_file) {
        errors.push(`${location} image needs image_url or slack_file`);
      }
      break;
    case "input":
      if (!isPlainObject(block.label)) errors.push(`${location}.label must be a text object`);
      if (!isPlainObject(block.element)) errors.push(`${location}.element must be an object`);
      break;
    case "markdown":
      if (typeof block.text !== "string" || block.text.length === 0) {
        errors.push(`${location}.text is required`);
      }
      break;
    case "plan":
      if (typeof block.title !== "string" || block.title.length === 0) {
        errors.push(`${location}.title is required`);
      }
      if (block.tasks !== undefined && !Array.isArray(block.tasks)) {
        errors.push(`${location}.tasks must be an array when provided`);
      }
      break;
    case "rich_text":
      if (!Array.isArray(block.elements)) errors.push(`${location}.elements must be an array`);
      break;
    case "section":
      if (!isPlainObject(block.text) && !Array.isArray(block.fields)) {
        errors.push(`${location} section needs text or fields`);
      }
      break;
    case "table":
      if (!Array.isArray(block.rows)) errors.push(`${location}.rows must be an array`);
      break;
    case "task_card":
      if (typeof block.task_id !== "string" || block.task_id.length === 0) {
        errors.push(`${location}.task_id is required`);
      }
      if (typeof block.title !== "string" || block.title.length === 0) {
        errors.push(`${location}.title is required`);
      }
      break;
    default:
      break;
  }
}

/**
 * Validate the stable, locally checkable parts of a Slack Block Kit payload.
 *
 * @param {unknown} payload
 * @returns {{errors: string[], warnings: string[]}}
 */
export function validatePayload(payload) {
  const errors = [];
  const warnings = [];
  const normalized = normalizePayload(payload);
  if (normalized.error) return { errors: [normalized.error], warnings };

  const { blocks, message, surface } = normalized;
  const blockLimit = surface === "message" ? 50 : surface === "modal" || surface === "home" ? 100 : 100;
  if (blocks.length > blockLimit) {
    errors.push(`${surface} payload has ${blocks.length} blocks; limit is ${blockLimit}`);
  }

  blocks.forEach((block, index) => {
    validateBlockShape(block, `blocks[${index}]`, surface, errors, warnings);
  });

  if (surface === "message") {
    if (typeof message.text !== "string" || message.text.trim().length === 0) {
      warnings.push("message payload has blocks but no top-level text fallback");
    }

    const tableCount = blocks.filter((block) => block?.type === "table").length;
    if (tableCount > 1) {
      errors.push("Slack messages allow only one table block");
    }

    const visualizationCount = blocks.filter(
      (block) => block?.type === "data_visualization",
    ).length;
    if (visualizationCount > 2) {
      errors.push("Slack messages allow at most two data_visualization blocks");
    }
  }

  return { errors, warnings };
}

function readInput(file) {
  return file ? fs.readFileSync(path.resolve(file), "utf8") : fs.readFileSync(0, "utf8");
}

function parsePayload(input) {
  try {
    return JSON.parse(input);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`);
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    console.log(usage);
    return;
  }

  const file = args.find((arg) => !arg.startsWith("-"));
  const result = validatePayload(parsePayload(readInput(file)));

  for (const warning of result.warnings) console.warn(`Warning: ${warning}`);
  if (result.errors.length > 0) {
    console.error("Invalid Slack Block Kit payload:");
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    result.warnings.length > 0
      ? "Slack Block Kit structure passed with warnings."
      : "Slack Block Kit structure passed.",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
