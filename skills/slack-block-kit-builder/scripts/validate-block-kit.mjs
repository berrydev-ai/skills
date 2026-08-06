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

const ELEMENT_TYPES_BY_CONTAINER = {
  actions: new Set([
    "button",
    "checkboxes",
    "channels_select",
    "conversations_select",
    "datepicker",
    "datetimepicker",
    "external_select",
    "multi_channels_select",
    "multi_conversations_select",
    "multi_external_select",
    "multi_static_select",
    "multi_users_select",
    "overflow",
    "radio_buttons",
    "rich_text_input",
    "static_select",
    "timepicker",
    "users_select",
    "workflow_button",
  ]),
  card: new Set(["button"]),
  context: new Set(["image", "mrkdwn", "plain_text"]),
  context_actions: new Set(["feedback_buttons", "icon_button"]),
  input: new Set([
    "checkboxes",
    "channels_select",
    "conversations_select",
    "datepicker",
    "datetimepicker",
    "email_text_input",
    "external_select",
    "file_input",
    "multi_channels_select",
    "multi_conversations_select",
    "multi_external_select",
    "multi_static_select",
    "multi_users_select",
    "number_input",
    "plain_text_input",
    "radio_buttons",
    "rich_text_input",
    "static_select",
    "timepicker",
    "url_text_input",
    "users_select",
  ]),
  section: new Set([
    "button",
    "checkboxes",
    "channels_select",
    "conversations_select",
    "datepicker",
    "external_select",
    "image",
    "multi_channels_select",
    "multi_conversations_select",
    "multi_external_select",
    "multi_static_select",
    "multi_users_select",
    "overflow",
    "radio_buttons",
    "static_select",
    "timepicker",
    "users_select",
    "workflow_button",
  ]),
};

const ELEMENT_SURFACES = {
  datetimepicker: new Set(["message", "modal"]),
  email_text_input: new Set(["modal"]),
  feedback_buttons: new Set(["message"]),
  file_input: new Set(["modal"]),
  icon_button: new Set(["message"]),
  number_input: new Set(["modal"]),
  rich_text_input: new Set(["home", "modal"]),
  url_text_input: new Set(["modal"]),
  workflow_button: new Set(["message"]),
};

const CHART_TYPES = new Set(["area", "bar", "line", "pie"]);
const TABLE_CELL_TYPES = new Set(["raw_number", "raw_text", "rich_text"]);
const HEADER_CELL_TYPES = new Set(["raw_number", "raw_text"]);
const CONTAINER_WIDTHS = new Set(["full", "narrow", "standard", "wide"]);

const usage = `Usage:
  node "$SKILL_DIR/scripts/validate-block-kit.mjs" <payload.json>
  node "$SKILL_DIR/scripts/validate-block-kit.mjs" < payload.json

Checks a block array, single block, message payload, modal view, or Home tab view.
Use Slack Block Kit Builder for final visual validation and the target Slack API method for server acceptance.`;

function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function textValue(value) {
  if (typeof value === "string") return value;
  return typeof value?.text === "string" ? value.text : "";
}

function richTextCharacterCount(value) {
  if (Array.isArray(value)) {
    return value.reduce((total, item) => total + richTextCharacterCount(item), 0);
  }
  if (!isPlainObject(value)) return 0;

  return Object.entries(value).reduce((total, [key, item]) => {
    if (key === "text" && typeof item === "string") return total + item.length;
    return total + richTextCharacterCount(item);
  }, 0);
}

function tableCellCharacterCount(cell) {
  if (!isPlainObject(cell)) return 0;
  if (cell.type === "raw_text") return typeof cell.text === "string" ? cell.text.length : 0;
  if (cell.type === "raw_number") {
    if (typeof cell.text === "string") return cell.text.length;
    return typeof cell.value === "number" ? String(cell.value).length : 0;
  }
  return cell.type === "rich_text" ? richTextCharacterCount(cell) : 0;
}

function tableCharacterCount(block) {
  if (!Array.isArray(block?.rows)) return 0;
  return block.rows.reduce(
    (total, row) =>
      total +
      (Array.isArray(row)
        ? row.reduce((rowTotal, cell) => rowTotal + tableCellCharacterCount(cell), 0)
        : 0),
    0,
  );
}

function validateImageElement(element, location, errors) {
  if (typeof element.alt_text !== "string" || element.alt_text.length === 0) {
    errors.push(`${location}.alt_text is required for accessibility`);
  }
  if (!element.image_url && !element.slack_file) {
    errors.push(`${location} image needs image_url or slack_file`);
  }
}

function validateElement(element, location, surface, containerType, errors) {
  if (!isPlainObject(element) || typeof element.type !== "string") {
    errors.push(`${location} must be an element object with a type`);
    return;
  }

  const compatibleTypes = ELEMENT_TYPES_BY_CONTAINER[containerType];
  if (compatibleTypes && !compatibleTypes.has(element.type)) {
    errors.push(`${location} type ${element.type} is not supported in ${containerType}`);
  }

  const supportedSurfaces = ELEMENT_SURFACES[element.type];
  if (surface !== "unknown" && supportedSurfaces && !supportedSurfaces.has(surface)) {
    errors.push(`${location} type ${element.type} is not supported on ${surface}`);
  }

  if (typeof element.action_id === "string" && element.action_id.length > 255) {
    errors.push(`${location}.action_id exceeds 255 characters`);
  }

  if (element.type === "image") validateImageElement(element, location, errors);

  if (element.type === "rich_text_input" && !element.action_id) {
    errors.push(`${location}.rich_text_input.action_id is required`);
  }

  if (element.type === "workflow_button") {
    if (!element.action_id) errors.push(`${location}.workflow_button.action_id is required`);
    if (!isPlainObject(element.text)) errors.push(`${location}.workflow_button.text is required`);
    if (!isPlainObject(element.workflow)) errors.push(`${location}.workflow_button.workflow is required`);
  }
}

function validateTableCell(cell, location, allowedTypes, errors) {
  if (!isPlainObject(cell) || !allowedTypes.has(cell.type)) {
    errors.push(
      `${location} cell type ${cell?.type ?? "missing"} is unsupported; must use ${[
        ...allowedTypes,
      ].join(", ")}`,
    );
    return;
  }

  if (cell.type === "raw_text" && (typeof cell.text !== "string" || cell.text.length === 0)) {
    errors.push(`${location}.text is required for raw_text`);
  }
  if (cell.type === "raw_number" && typeof cell.value !== "number") {
    errors.push(`${location}.value must be a number for raw_number`);
  }
  if (cell.type === "rich_text" && !Array.isArray(cell.elements)) {
    errors.push(`${location}.elements must be an array for rich_text`);
  }
}

function validateDataTable(block, location, errors) {
  if (typeof block.caption !== "string" || block.caption.length === 0) {
    errors.push(`${location}.caption is required`);
  }
  if (!Array.isArray(block.rows) || block.rows.length < 2 || block.rows.length > 201) {
    errors.push(`${location}.rows must contain 2 to 201 rows including the header`);
    return;
  }

  const columnCount = Array.isArray(block.rows[0]) ? block.rows[0].length : 0;
  if (columnCount < 1 || columnCount > 20) {
    errors.push(`${location}.rows must contain 1 to 20 columns`);
  }

  block.rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push(`${location}.rows[${rowIndex}] must be an array`);
      return;
    }
    if (row.length !== columnCount) {
      errors.push(`${location}.rows must all contain the same number of cells`);
    }
    row.forEach((cell, cellIndex) =>
      validateTableCell(
        cell,
        `${location}.rows[${rowIndex}][${cellIndex}]${rowIndex === 0 ? " header" : ""}`,
        rowIndex === 0 ? HEADER_CELL_TYPES : TABLE_CELL_TYPES,
        errors,
      ),
    );
  });

  if (
    block.page_size !== undefined &&
    (!Number.isInteger(block.page_size) || block.page_size < 1 || block.page_size > 100)
  ) {
    errors.push(`${location}.page_size must be an integer from 1 to 100`);
  }

  if (
    block.row_header_column_index !== undefined &&
    (!Number.isInteger(block.row_header_column_index) ||
      block.row_header_column_index < 0 ||
      block.row_header_column_index >= columnCount)
  ) {
    errors.push(`${location}.row_header_column_index must identify an existing column`);
  }

  if (tableCharacterCount(block) > 20000) {
    errors.push(`${location} cell text exceeds 20,000 characters`);
  }
}

function validateDataVisualization(block, location, errors) {
  if (typeof block.title !== "string" || block.title.length === 0) {
    errors.push(`${location}.title is required`);
  } else if (block.title.length > 50) {
    errors.push(`${location}.title exceeds 50 characters`);
  }
  if (!isPlainObject(block.chart)) {
    errors.push(`${location}.chart must be an object`);
    return;
  }

  const { chart } = block;
  if (!CHART_TYPES.has(chart.type)) {
    errors.push(`${location}.chart.type must be pie, bar, area, or line`);
    return;
  }

  if (chart.type === "pie") {
    if (!Array.isArray(chart.segments) || chart.segments.length < 1 || chart.segments.length > 12) {
      errors.push(`${location}.chart.segments must contain 1 to 12 segments`);
      return;
    }
    chart.segments.forEach((segment, index) => {
      const segmentLocation = `${location}.chart.segments[${index}]`;
      if (typeof segment?.label !== "string" || segment.label.length < 1 || segment.label.length > 20) {
        errors.push(`${segmentLocation}.label must contain 1 to 20 characters`);
      }
      if (typeof segment?.value !== "number" || segment.value <= 0) {
        errors.push(`${segmentLocation}.value must be a number greater than 0`);
      }
    });
    return;
  }

  const categories = chart.axis_config?.categories;
  if (!Array.isArray(categories) || categories.length < 1 || categories.length > 20) {
    errors.push(`${location}.chart.axis_config.categories must contain 1 to 20 labels`);
    return;
  }
  categories.forEach((category, index) => {
    if (typeof category !== "string" || category.length < 1 || category.length > 20) {
      errors.push(`${location}.chart.axis_config.categories[${index}] must contain 1 to 20 characters`);
    }
  });
  if (new Set(categories).size !== categories.length) {
    errors.push(`${location}.chart.axis_config.categories must be unique`);
  }
  for (const label of ["x_label", "y_label"]) {
    if (typeof chart.axis_config?.[label] === "string" && chart.axis_config[label].length > 50) {
      errors.push(`${location}.chart.axis_config.${label} exceeds 50 characters`);
    }
  }

  if (!Array.isArray(chart.series) || chart.series.length < 1 || chart.series.length > 12) {
    errors.push(`${location}.chart.series must contain 1 to 12 series`);
    return;
  }

  const seriesNames = chart.series.map((series) => series?.name);
  if (new Set(seriesNames).size !== seriesNames.length) {
    errors.push(`${location}.chart series names must be unique`);
  }

  chart.series.forEach((series, seriesIndex) => {
    const seriesLocation = `${location}.chart.series[${seriesIndex}]`;
    if (typeof series?.name !== "string" || series.name.length < 1 || series.name.length > 20) {
      errors.push(`${seriesLocation}.name must contain 1 to 20 characters`);
    }
    if (!Array.isArray(series?.data) || series.data.length < 1 || series.data.length > 20) {
      errors.push(`${seriesLocation}.data must contain 1 to 20 data points`);
      return;
    }
    if (series.data.length !== categories.length) {
      errors.push(`${seriesLocation} must provide exactly one data point for every category`);
    }

    const labels = [];
    series.data.forEach((point, pointIndex) => {
      const pointLocation = `${seriesLocation}.data[${pointIndex}]`;
      labels.push(point?.label);
      if (typeof point?.label !== "string" || !categories.includes(point.label)) {
        errors.push(`${pointLocation}.label does not match axis_config.categories`);
      } else if (point.label.length > 20) {
        errors.push(`${pointLocation}.label exceeds 20 characters`);
      }
      if (typeof point?.value !== "number") {
        errors.push(`${pointLocation}.value must be a number`);
      }
    });
    if (new Set(labels).size !== labels.length) {
      errors.push(`${seriesLocation} must not repeat category labels`);
    }
  });
}

function validateSimpleTable(block, location, errors) {
  if (!Array.isArray(block.rows)) {
    errors.push(`${location}.rows must be an array`);
    return;
  }
  if (block.rows.length > 100) errors.push(`${location}.rows exceeds 100 rows`);

  block.rows.forEach((row, rowIndex) => {
    if (!Array.isArray(row)) {
      errors.push(`${location}.rows[${rowIndex}] must be an array`);
      return;
    }
    if (row.length > 20) errors.push(`${location}.rows[${rowIndex}] exceeds 20 cells`);
    row.forEach((cell, cellIndex) =>
      validateTableCell(
        cell,
        `${location}.rows[${rowIndex}][${cellIndex}]`,
        TABLE_CELL_TYPES,
        errors,
      ),
    );
  });

  if (block.column_settings !== undefined) {
    if (!Array.isArray(block.column_settings)) {
      errors.push(`${location}.column_settings must be an array`);
    } else {
      if (block.column_settings.length > 20) {
        errors.push(`${location}.column_settings exceeds 20 items`);
      }
      block.column_settings.forEach((setting, index) => {
        if (setting === null) return;
        if (!isPlainObject(setting)) {
          errors.push(`${location}.column_settings[${index}] must be an object or null`);
          return;
        }
        if (
          setting.align !== undefined &&
          !new Set(["center", "left", "right"]).has(setting.align)
        ) {
          errors.push(`${location}.column_settings[${index}].align is not supported`);
        }
        if (setting.is_wrapped !== undefined && typeof setting.is_wrapped !== "boolean") {
          errors.push(`${location}.column_settings[${index}].is_wrapped must be boolean`);
        }
      });
    }
  }

  if (tableCharacterCount(block) > 10000) {
    errors.push(`${location} cell text exceeds 10,000 characters`);
  }
}

function validateTaskCard(task, location, errors, requireType) {
  if (!isPlainObject(task)) {
    errors.push(`${location} must be a task card object`);
    return;
  }
  if (requireType && task.type !== "task_card") {
    errors.push(`${location}.type must be task_card`);
  }
  if (!requireType && task.type !== undefined && task.type !== "task_card") {
    errors.push(`${location}.type must be task_card when provided`);
  }
  if (typeof task.task_id !== "string" || task.task_id.length === 0) {
    errors.push(`${location}.task_id is required`);
  }
  if (typeof task.title !== "string" || task.title.length === 0) {
    errors.push(`${location}.title is required`);
  }
  if (
    task.status !== undefined &&
    !new Set(["complete", "error", "in_progress", "pending"]).has(task.status)
  ) {
    errors.push(`${location}.status is not supported`);
  }
  for (const field of ["details", "output"]) {
    if (task[field] !== undefined && task[field]?.type !== "rich_text") {
      errors.push(`${location}.${field} must be a rich_text object`);
    }
  }
  if (task.sources !== undefined) {
    if (!Array.isArray(task.sources)) {
      errors.push(`${location}.sources must be an array`);
    } else {
      task.sources.forEach((source, index) => {
        const sourceLocation = `${location}.sources[${index}]`;
        if (
          source?.type !== "url" ||
          typeof source.url !== "string" ||
          typeof source.text !== "string"
        ) {
          errors.push(`${sourceLocation} must contain type url, url, and text`);
        }
      });
    }
  }
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

function flattenBlocks(blocks) {
  const flattened = [];
  for (const block of blocks) {
    flattened.push(block);
    if (block?.type === "container" && Array.isArray(block.child_blocks)) {
      flattened.push(...flattenBlocks(block.child_blocks));
    }
    if (block?.type === "carousel" && Array.isArray(block.elements)) {
      flattened.push(...flattenBlocks(block.elements));
    }
    if (block?.type === "plan" && Array.isArray(block.tasks)) {
      flattened.push(...flattenBlocks(block.tasks));
    }
  }
  return flattened;
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
      if (!Array.isArray(block.elements)) {
        errors.push(`${location}.elements must be an array`);
      } else {
        if (block.elements.length > 25) errors.push(`${location}.elements exceeds 25 items`);
        block.elements.forEach((element, index) =>
          validateElement(element, `${location}.elements[${index}]`, surface, "actions", errors),
        );
      }
      break;
    case "alert":
      if (!isPlainObject(block.text)) errors.push(`${location}.text must be a text object`);
      if (block.text?.text?.length > 200) errors.push(`${location}.text exceeds 200 characters`);
      if (
        block.level !== undefined &&
        !new Set(["default", "error", "info", "success", "warning"]).has(block.level)
      ) {
        errors.push(`${location}.level is not supported`);
      }
      break;
    case "card":
      if (![block.hero_image, block.title, block.actions, block.body].some(Boolean)) {
        errors.push(`${location} card needs hero_image, title, actions, or body`);
      }
      if (block.icon && block.slack_icon) {
        errors.push(`${location} may not contain both icon and slack_icon`);
      }
      if (block.icon) validateImageElement(block.icon, `${location}.icon`, errors);
      if (block.hero_image) validateImageElement(block.hero_image, `${location}.hero_image`, errors);
      for (const [field, limit] of [
        ["title", 150],
        ["subtitle", 150],
        ["body", 200],
        ["subtext", 200],
      ]) {
        if (textValue(block[field]).length > limit) {
          errors.push(`${location}.${field} exceeds ${limit} characters`);
        }
      }
      if (block.actions !== undefined) {
        if (!Array.isArray(block.actions)) {
          errors.push(`${location}.actions must be an array`);
        } else {
          if (block.actions.length > 3) errors.push(`${location} allows at most 3 actions`);
          block.actions.forEach((element, index) =>
            validateElement(element, `${location}.actions[${index}]`, surface, "card", errors),
          );
        }
      }
      break;
    case "carousel":
      if (!Array.isArray(block.elements) || block.elements.length < 1 || block.elements.length > 10) {
        errors.push(`${location}.elements must contain 1 to 10 cards`);
      } else if (block.elements.some((element) => element?.type !== "card")) {
        errors.push(`${location}.elements may contain only card objects`);
      } else {
        block.elements.forEach((element, index) =>
          validateBlockShape(element, `${location}.elements[${index}]`, surface, errors, warnings),
        );
      }
      break;
    case "container":
      if (!block.title && !block.rich_text_title) {
        errors.push(`${location} container needs title or rich_text_title`);
      }
      if (textValue(block.title).length > 150) {
        errors.push(`${location}.title exceeds 150 characters`);
      }
      if (textValue(block.subtitle).length > 150) {
        errors.push(`${location}.subtitle exceeds 150 characters`);
      }
      if (block.width !== undefined && !CONTAINER_WIDTHS.has(block.width)) {
        errors.push(`${location}.width must be narrow, standard, wide, or full`);
      }
      if (block.default_collapsed === true && block.is_collapsible !== true) {
        errors.push(`${location}.default_collapsed requires is_collapsible to be true`);
      }
      for (const flag of ["is_collapsible", "default_collapsed", "has_header_divider"]) {
        if (block[flag] !== undefined && typeof block[flag] !== "boolean") {
          errors.push(`${location}.${flag} must be boolean`);
        }
      }
      if (block.has_header_divider === true && block.is_collapsible === true) {
        errors.push(`${location}.has_header_divider requires a non-collapsible container`);
      }
      if (block.icon) validateImageElement(block.icon, `${location}.icon`, errors);
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
    case "context":
      if (!Array.isArray(block.elements)) {
        errors.push(`${location}.elements must be an array`);
      } else {
        if (block.elements.length > 10) errors.push(`${location}.elements exceeds 10 items`);
        block.elements.forEach((element, index) =>
          validateElement(element, `${location}.elements[${index}]`, surface, "context", errors),
        );
      }
      break;
    case "context_actions":
      if (!Array.isArray(block.elements)) {
        errors.push(`${location}.elements must be an array`);
      } else {
        if (block.elements.length > 5) errors.push(`${location}.elements exceeds 5 items`);
        block.elements.forEach((element, index) =>
          validateElement(
            element,
            `${location}.elements[${index}]`,
            surface,
            "context_actions",
            errors,
          ),
        );
      }
      break;
    case "data_table":
      validateDataTable(block, location, errors);
      break;
    case "data_visualization":
      validateDataVisualization(block, location, errors);
      break;
    case "file":
      if (typeof block.external_id !== "string" || block.external_id.length === 0) {
        errors.push(`${location}.external_id is required`);
      }
      if (block.source !== "remote") errors.push(`${location}.source must be remote`);
      if (surface === "unknown") {
        warnings.push(`${location} file blocks appear in retrieved messages; publish remote files through Slack's file flow`);
      } else {
        errors.push(`${location} file blocks are retrieval-only and cannot be authored on app surfaces`);
      }
      break;
    case "header":
      if (!isPlainObject(block.text)) errors.push(`${location}.text must be a text object`);
      if (textValue(block.text).length > 150) errors.push(`${location}.text exceeds 150 characters`);
      break;
    case "image":
      validateImageElement(block, location, errors);
      break;
    case "input":
      if (!isPlainObject(block.label)) errors.push(`${location}.label must be a text object`);
      if (textValue(block.label).length > 2000) {
        errors.push(`${location}.label exceeds 2000 characters`);
      }
      if (textValue(block.hint).length > 2000) {
        errors.push(`${location}.hint exceeds 2000 characters`);
      }
      if (!isPlainObject(block.element)) {
        errors.push(`${location}.element must be an object`);
      } else {
        validateElement(block.element, `${location}.element`, surface, "input", errors);
        if (block.dispatch_action === true && block.element.type === "file_input") {
          errors.push(`${location}.dispatch_action is incompatible with file_input`);
        }
      }
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
      } else if (Array.isArray(block.tasks)) {
        block.tasks.forEach((task, index) =>
          validateTaskCard(task, `${location}.tasks[${index}]`, errors, false),
        );
      }
      break;
    case "rich_text":
      if (!Array.isArray(block.elements)) errors.push(`${location}.elements must be an array`);
      break;
    case "section":
      if (!isPlainObject(block.text) && !Array.isArray(block.fields)) {
        errors.push(`${location} section needs text or fields`);
      }
      if (textValue(block.text).length > 3000) {
        errors.push(`${location}.text exceeds 3000 characters`);
      }
      if (Array.isArray(block.fields)) {
        if (block.fields.length > 10) errors.push(`${location}.fields exceeds 10 items`);
        block.fields.forEach((field, index) => {
          if (!isPlainObject(field)) errors.push(`${location}.fields[${index}] must be a text object`);
          if (textValue(field).length > 2000) {
            errors.push(`${location}.fields[${index}] exceeds 2000 characters`);
          }
        });
      }
      if (block.accessory !== undefined) {
        validateElement(block.accessory, `${location}.accessory`, surface, "section", errors);
      }
      break;
    case "table":
      validateSimpleTable(block, location, errors);
      break;
    case "task_card":
      validateTaskCard(block, location, errors, true);
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

  const allBlocks = flattenBlocks(blocks);
  const blockIds = allBlocks
    .map((block) => block?.block_id)
    .filter((blockId) => typeof blockId === "string" && blockId.length > 0);
  const duplicateBlockIds = [...new Set(blockIds.filter((id, index) => blockIds.indexOf(id) !== index))];
  for (const blockId of duplicateBlockIds) {
    errors.push(`block_id ${blockId} is duplicated in this payload`);
  }

  const markdownCharacters = allBlocks
    .filter((block) => block?.type === "markdown")
    .reduce((total, block) => total + (typeof block.text === "string" ? block.text.length : 0), 0);
  if (markdownCharacters > 12000) {
    errors.push("markdown blocks exceed the 12,000-character cumulative payload limit");
  }

  if (surface === "message") {
    if (typeof message.text !== "string" || message.text.trim().length === 0) {
      warnings.push(
        "message payload has blocks but no top-level text fallback; confirm omission is intentional so Slack can derive accessible text",
      );
    }

    const tableCount = allBlocks.filter((block) => block?.type === "table").length;
    if (tableCount > 1) {
      errors.push("Slack messages allow only one table block");
    }

    const tableCharacters = allBlocks
      .filter((block) => block?.type === "table")
      .reduce((total, block) => total + tableCharacterCount(block), 0);
    if (tableCharacters > 10000) {
      errors.push("table cell text exceeds the 10,000-character aggregate message limit");
    }

    const dataTableCharacters = allBlocks
      .filter((block) => block?.type === "data_table")
      .reduce((total, block) => total + tableCharacterCount(block), 0);
    if (dataTableCharacters > 20000) {
      errors.push("data_table cell text exceeds the 20,000-character aggregate message limit");
    }

    const visualizationCount = allBlocks.filter(
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
