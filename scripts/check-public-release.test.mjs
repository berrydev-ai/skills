import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, test } from "node:test";
import {
  findPublicReleaseViolations,
  loadTrackedEntries,
} from "./check-public-release.mjs";

const tempDirs = [];

const entry = (filePath, content, mode = "100644") => ({
  content: Buffer.from(content),
  mode,
  path: filePath,
});

async function makeTempDir() {
  const directory = await mkdtemp(path.join(tmpdir(), "public-release-check-"));
  tempDirs.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((directory) =>
      rm(directory, { force: true, recursive: true }),
    ),
  );
});

describe("public-release invariants", () => {
  test("accepts unique portable skills and ordinary tracked files", () => {
    const violations = findPublicReleaseViolations([
      entry("README.md", "# Portable skills\n"),
      entry(
        "skills/example/SKILL.md",
        "---\nname: example\n---\n# Example\n",
      ),
    ]);

    assert.deepEqual(violations, []);
  });

  test("rejects private artifacts and gitlinks", () => {
    const violations = findPublicReleaseViolations([
      entry("cache/repos/state", "state"),
      entry("nested/.env.local", "TOKEN=value"),
      entry("debug.log", "request details"),
      entry("skills", "", "160000"),
    ]);

    assert.equal(violations.length, 4);
    assert.ok(violations.some((value) => value.includes("private artifact")));
    assert.ok(violations.some((value) => value.includes("gitlink")));
  });

  test("rejects duplicate and mismatched skill names", () => {
    const violations = findPublicReleaseViolations([
      entry("one/SKILL.md", "---\nname: shared\n---\n"),
      entry("two/SKILL.md", "---\nname: shared\n---\n"),
    ]);

    assert.ok(violations.some((value) => value.includes("parent directory")));
    assert.ok(violations.some((value) => value.includes("duplicate skill name")));
  });

  test("rejects vendor roots, credential signatures, and developer paths", () => {
    const vendorRoot = ["CLAUDE", "PLUGIN", "ROOT"].join("_");
    const developerPath = ["", "Users", "developer", "repo"].join("/");
    const credential = ["ghp", "abcdefghijklmnopqrstuvwxyz1234567890"].join(
      "_",
    );
    const violations = findPublicReleaseViolations([
      entry("portable/SKILL.md", `---\nname: portable\n---\nrun ${vendorRoot}`),
      entry("notes.txt", `${developerPath}\n${credential}\n`),
    ]);

    assert.ok(violations.some((value) => value.includes("vendor-specific")));
    assert.ok(
      violations.some((value) => value.includes("absolute developer path")),
    );
    assert.ok(
      violations.some((value) => value.includes("credential signature")),
    );
  });

  test("rejects repository-relative bundled script paths", () => {
    const violations = findPublicReleaseViolations([
      entry(
        "portable/SKILL.md",
        "---\nname: portable\n---\nnode portable/scripts/tool.mjs\n",
      ),
    ]);

    assert.ok(
      violations.some((value) => value.includes("skill-directory-relative")),
    );
  });

  test("rejects credential signatures embedded in binary content", () => {
    const credential = ["ghp", "abcdefghijklmnopqrstuvwxyz1234567890"].join(
      "_",
    );
    const violations = findPublicReleaseViolations([
      entry(
        "archive.bin",
        Buffer.concat([Buffer.from([0]), Buffer.from(credential)]),
      ),
    ]);

    assert.ok(
      violations.some((value) => value.includes("credential signature")),
    );
  });

  test("loads staged Git blobs instead of divergent worktree content", async () => {
    const directory = await makeTempDir();
    await mkdir(path.join(directory, "portable"));
    await writeFile(path.join(directory, "portable", "SKILL.md"), "name: portable\n");
    await writeFile(path.join(directory, "untracked.txt"), "not published\n");
    execFileSync("git", ["init", "-q"], { cwd: directory });
    execFileSync("git", ["add", "--", "portable/SKILL.md"], { cwd: directory });
    await writeFile(
      path.join(directory, "portable", "SKILL.md"),
      "name: worktree-only\n",
    );

    const entries = loadTrackedEntries(directory);

    assert.deepEqual(
      entries.map(({ content, mode, path: filePath }) => ({
        content: content.toString("utf8"),
        mode,
        path: filePath,
      })),
      [
        {
          content: "name: portable\n",
          mode: "100644",
          path: "portable/SKILL.md",
        },
      ],
    );
  });
});
