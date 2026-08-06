#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

const forbiddenPathPatterns = [
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)(?:cache|\.cache)(?:\/|$)/,
  /(^|\/)(?:\.context|evidence|\.evidence|artifacts|\.artifacts)(?:\/|$)/,
  /(^|\/)\.history(?:\/|$)/,
  /(^|\/)\.claude\/settings\.local\.json$/,
  /(^|\/)(?:skills-manager\.db(?:-(?:shm|wal))?|\.secret\.key)$/,
  /(^|\/)git-askpass\.sh$/,
  /\.log$/,
  /\.(?:db|sqlite|sqlite3|pem|key|p12|pfx)(?:-(?:shm|wal))?$/,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/,
];

const credentialPatterns = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];

const developerPathPatterns = [
  /\/Users\/[A-Za-z0-9._-]+\//g,
  /\/home\/[A-Za-z0-9._-]+\//g,
  /\b[A-Za-z]:\\Users\\[A-Za-z0-9._-]+\\/g,
];

const legacyPluginPathPattern = /^(?:\.claude-plugin|plugins)(?:\/|$)/;
const canonicalSkillPathPattern = /^skills\/[^/]+\/SKILL\.md$/;

const vendorRoot = ["CLAUDE", "PLUGIN", "ROOT"].join("_");
const readableModes = new Set(["100644", "100755", "120000"]);

function firstMatchingPattern(patterns, content) {
  for (const pattern of patterns) {
    pattern.lastIndex = 0;
    if (pattern.test(content)) {
      pattern.lastIndex = 0;
      return true;
    }
  }
  return false;
}

function parseSkillName(content) {
  const match = content.match(/^name:\s*([^\r\n]+?)\s*$/m);
  if (!match) return null;

  const value = match[1].replace(/^(?:"([^"]*)"|'([^']*)')$/, "$1$2");
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : null;
}

export function findPublicReleaseViolations(entries) {
  const violations = [];
  const skillPathsByName = new Map();

  for (const entry of entries) {
    const filePath = entry.path.replaceAll("\\", "/");

    if (entry.mode === "160000") {
      violations.push(`${filePath}: gitlinks are not allowed in the public tree`);
    }

    if (forbiddenPathPatterns.some((pattern) => pattern.test(filePath))) {
      violations.push(`${filePath}: tracked private artifact path is not allowed`);
    }

    if (legacyPluginPathPattern.test(filePath)) {
      violations.push(
        `${filePath}: legacy plugin packaging is not allowed in the skills.sh catalog`,
      );
    }

    const isBinary = entry.content.includes(0);
    const content = entry.content.toString("utf8");
    const scannedContent = isBinary
      ? entry.content.toString("latin1")
      : content;

    if (path.posix.basename(filePath) === "SKILL.md") {
      if (!canonicalSkillPathPattern.test(filePath)) {
        violations.push(
          `${filePath}: skills must live under skills/<name>/SKILL.md`,
        );
      }

      if (isBinary) {
        violations.push(`${filePath}: SKILL.md must be a text file`);
      } else {
        const skillName = parseSkillName(content);
        const parentName = path.posix.basename(path.posix.dirname(filePath));

        if (!skillName) {
          violations.push(
            `${filePath}: skill must declare a scalar kebab-case name`,
          );
        } else {
          if (skillName !== parentName) {
            violations.push(
              `${filePath}: skill name ${skillName} does not match parent directory ${parentName}`,
            );
          }
          const paths = skillPathsByName.get(skillName) ?? [];
          paths.push(filePath);
          skillPathsByName.set(skillName, paths);
        }

        if (content.includes(vendorRoot)) {
          violations.push(
            `${filePath}: vendor-specific plugin root is not allowed in portable skill instructions`,
          );
        }

        if (
          content
            .split(/\r?\n/)
            .some(
              (line) =>
                line.includes("scripts/") &&
                !line.includes("$SKILL_DIR/scripts/"),
            )
        ) {
          violations.push(
            `${filePath}: bundled script references must be skill-directory-relative through SKILL_DIR`,
          );
        }
      }
    }

    if (firstMatchingPattern(credentialPatterns, scannedContent)) {
      violations.push(`${filePath}: credential signature detected`);
    }

    if (firstMatchingPattern(developerPathPatterns, scannedContent)) {
      violations.push(`${filePath}: absolute developer path detected`);
    }
  }

  for (const [skillName, skillPaths] of skillPathsByName) {
    if (skillPaths.length > 1) {
      violations.push(
        `duplicate skill name ${skillName}: ${skillPaths.sort().join(", ")}`,
      );
    }
  }

  return violations.sort();
}

export function loadTrackedEntries(rootDir) {
  const result = spawnSync("git", ["ls-files", "--stage", "-z"], {
    cwd: rootDir,
    encoding: "buffer",
  });

  if (result.status !== 0) {
    const message = result.stderr.toString("utf8").trim();
    throw new Error(`could not list tracked files${message ? `: ${message}` : ""}`);
  }

  return result.stdout
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((record) => {
      const tabIndex = record.indexOf("\t");
      const [mode, objectId] = record.slice(0, tabIndex).split(" ");
      const filePath = record.slice(tabIndex + 1);
      let content = Buffer.alloc(0);

      if (readableModes.has(mode)) {
        const blob = spawnSync("git", ["cat-file", "blob", objectId], {
          cwd: rootDir,
          encoding: "buffer",
        });
        if (blob.status !== 0) {
          const message = blob.stderr.toString("utf8").trim();
          throw new Error(
            `could not read staged blob for ${filePath}${message ? `: ${message}` : ""}`,
          );
        }
        content = blob.stdout;
      }

      return { content, mode, path: filePath };
    });
}

function main() {
  const rootDir = path.resolve(process.argv[2] ?? process.cwd());
  const violations = findPublicReleaseViolations(loadTrackedEntries(rootDir));

  if (violations.length > 0) {
    process.stderr.write(
      `Public-release invariants failed:\n${violations.map((value) => `- ${value}`).join("\n")}\n`,
    );
    process.exitCode = 1;
    return;
  }

  process.stdout.write("Public-release invariants passed.\n");
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main();
}
