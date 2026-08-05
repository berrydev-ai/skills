# Public Release Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a portable, public-ready skills repository whose published GitHub repository contains one reviewed root commit and none of the legacy repository state.

**Architecture:** A dependency-free Node.js invariant checker will inspect paths and blob bytes directly from Git's tracked index, validate skill identity and portability, reject private artifact paths and sensitive content signatures, and expose pure functions for fixture-based tests. Documentation and executable skills will use the Agent Skills directory as their portable contract, while `.claude-plugin` files remain a secondary Claude Code adapter. The cutover will snapshot GitHub configuration outside the repository, replace local history with a parentless commit, recreate the private remote, restore its settings, and verify from a fresh clone before pruning recovery objects.

**Tech Stack:** Node.js built-ins and `node:test`, Bash, Git, JSON, GitHub CLI, Claude Code plugin validator, Agent Skills CLI

## Global Constraints

- The published repository has exactly one root commit and no legacy tags, branches, or pull-request refs.
- No published text or binary object contains prohibited internal identifiers, credential signatures, local workspace databases, key files, manager state, caches, or absolute developer paths.
- Each `SKILL.md` declares a unique name matching its parent directory.
- Portable skill instructions resolve bundled resources relative to their own skill directory and do not require a vendor-specific runtime variable.
- Vendor-specific marketplace metadata remains an optional distribution adapter rather than the identity or runtime contract of the project.
- Existing Slack helper behavior and plugin manifests continue to validate.
- Keep `berrydev-ai/skills` private throughout the cutover and until the owner deliberately changes visibility.
- Create the root commit as `Berry Development <eric@berrydev.ai>` with no parent.
- Do not expire reflogs or prune unreachable objects until verification from a fresh clone succeeds.
- Set the recreated repository description to `Portable Agent Skills built and maintained by Berry Development.`
- Set the recreated repository topics to `agent-skills`, `ai-agents`, `developer-tools`, and `workflow-automation`; do not restore the legacy vendor-specific topics.

---

### Task 1: Public-release invariant checker

**Files:**
- Create: `scripts/check-public-release.mjs`
- Create: `scripts/check-public-release.test.mjs`

**Interfaces:**
- Consumes: Git index entries from `git ls-files --stage -z` and UTF-8 contents for tracked regular files.
- Produces: `findPublicReleaseViolations(entries) -> string[]`, `loadTrackedEntries(rootDir) -> TrackedEntry[]`, and a CLI that exits `0` with `Public-release invariants passed.` or exits `1` after printing each violation.

- [ ] **Step 1: Write failing pure-function tests**

Create fixture entries without embedding live credential-shaped strings in tracked source:

```js
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { findPublicReleaseViolations } from "./check-public-release.mjs";

const entry = (filePath, content, mode = "100644") => ({
  content: Buffer.from(content),
  mode,
  path: filePath,
});

describe("public-release invariants", () => {
  test("accepts unique portable skills and ordinary tracked files", () => {
    const violations = findPublicReleaseViolations([
      entry("README.md", "# Portable skills\n"),
      entry("skills/example/SKILL.md", "---\nname: example\n---\n# Example\n"),
    ]);
    assert.deepEqual(violations, []);
  });

  test("rejects private artifacts and gitlinks", () => {
    const violations = findPublicReleaseViolations([
      entry("cache/repos/state", "state"),
      entry("nested/.env.local", "TOKEN=value"),
      entry("skills", "", "160000"),
    ]);
    assert.equal(violations.length, 3);
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
    const credential = ["ghp", "abcdefghijklmnopqrstuvwxyz1234567890"].join("_");
    const violations = findPublicReleaseViolations([
      entry("portable/SKILL.md", `run ${vendorRoot}/scripts/tool.sh`),
      entry("notes.txt", `${developerPath}\n${credential}\n`),
    ]);
    assert.ok(violations.some((value) => value.includes("vendor-specific")));
    assert.ok(violations.some((value) => value.includes("absolute developer path")));
    assert.ok(violations.some((value) => value.includes("credential signature")));
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test scripts/check-public-release.test.mjs`

Expected: FAIL because `scripts/check-public-release.mjs` does not exist.

- [ ] **Step 3: Implement the minimal checker**

Implement the module with these exact rules:

```js
const forbiddenPathPatterns = [
  /(^|\/)\.env(?:\.|$)/,
  /(^|\/)(?:cache|\.cache)(?:\/|$)/,
  /(^|\/)(?:\.context|evidence|\.evidence|artifacts|\.artifacts)(?:\/|$)/,
  /(?:^|\/)(?:skills-manager\.db(?:-(?:shm|wal))?|\.secret\.key)$/,
  /\.(?:db|sqlite|sqlite3|pem|key|p12|pfx)(?:-(?:shm|wal))?$/,
  /(^|\/)id_(?:rsa|dsa|ecdsa|ed25519)(?:\.pub)?$/,
];

const credentialPatterns = [
  /\bgh[pousr]_[A-Za-z0-9_]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
];
```

`findPublicReleaseViolations` must reject mode `160000`, paths matching any forbidden rule, missing/non-scalar skill names, parent/name mismatches, duplicate names, the vendor root assembled from `CLAUDE`, `PLUGIN`, and `ROOT`, credential signatures, and `/Users/<name>/`, `/home/<name>/`, or `C:\Users\<name>\` paths. It must scan binary bytes for embedded ASCII signatures and paths after detecting a NUL byte, while rejecting a binary `SKILL.md` instead of parsing it as text. `loadTrackedEntries` must parse `git ls-files --stage -z`, reject non-zero Git status, and read modes `100644`, `100755`, and `120000` from their staged Git blobs rather than the worktree. The CLI accepts an optional repository-root argument and prints deterministic, sorted violations.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test scripts/check-public-release.test.mjs`

Expected: PASS with four passing tests and no warnings.

- [ ] **Step 5: Prove the CLI reports the current dirty release tree**

Run: `node scripts/check-public-release.mjs`

Expected: FAIL and report the stale gitlink, mismatched top-level Mastra skill identity, and vendor-specific runtime dependencies.

### Task 2: Tree cleanup and portable executable skills

**Files:**
- Modify: `.gitignore`
- Delete: `mastra-api-cli/SKILL.md`
- Delete: `skills` gitlink
- Modify: `skills.sh.json`
- Modify: `plugins/issue-readiness/skills/issue-readiness/SKILL.md`
- Modify: `plugins/sync-with-primary/skills/sync-with-primary/SKILL.md`
- Modify: `slack-block-kit-builder/SKILL.md`
- Modify: `slack-post/SKILL.md`
- Modify: `slack-thread-capture/SKILL.md`

**Interfaces:**
- Consumes: the directory path from which the host loaded each `SKILL.md`.
- Produces: `SKILL_DIR`, defined by the executing agent as the absolute parent directory of that loaded `SKILL.md`, and script invocations below it.

- [ ] **Step 1: Expand ignore coverage**

Add anchored or extension rules covering local environment files, SQLite/database sidecars, private keys and key containers, manager databases, cache directories, local history/settings, and generated `.context`, evidence, and artifact directories. Keep `.DS_Store` and logs ignored.

- [ ] **Step 2: Remove stale manager-owned entries**

Remove the top-level `mastra-api-cli/SKILL.md` whose declared name is `mastra-cli`, remove the orphan `skills` gitlink, and remove `mastra-cli` from the Mastra grouping in `skills.sh.json`. Retain the canonical `plugins/mastra-api-cli/skills/mastra-api-cli/SKILL.md`.

- [ ] **Step 3: Make issue-readiness resource resolution portable**

Replace the vendor-root command with instructions to derive `SKILL_DIR` from the parent directory of the loaded `SKILL.md`, then run:

```bash
bash "$SKILL_DIR/scripts/fetch-issue.sh" <number-or-url> [owner/repo]
```

State that `SKILL_DIR` is an agent-local shell variable, not a required environment variable supplied by a specific host.

- [ ] **Step 4: Make sync-with-primary resource resolution portable**

Use the same `SKILL_DIR` contract for the normal command and both override examples:

```bash
bash "$SKILL_DIR/scripts/sync_with_primary.sh"
PRIMARY_BRANCH=develop bash "$SKILL_DIR/scripts/sync_with_primary.sh"
REMOTE=upstream bash "$SKILL_DIR/scripts/sync_with_primary.sh"
```

- [ ] **Step 5: Make Slack resource resolution portable**

In each Slack skill, define the same host-independent `SKILL_DIR` contract and
invoke its Node helper and test file beneath `$SKILL_DIR/scripts/`. Preserve all
existing arguments, stdin behavior, environment variables, and helper behavior.

- [ ] **Step 6: Run focused invariant and syntax checks**

Run:

```bash
node --test scripts/check-public-release.test.mjs
node scripts/check-public-release.mjs
bash -n plugins/issue-readiness/skills/issue-readiness/scripts/fetch-issue.sh
bash -n plugins/sync-with-primary/skills/sync-with-primary/scripts/sync_with_primary.sh
node -e 'JSON.parse(require("node:fs").readFileSync("skills.sh.json", "utf8"))'
```

Expected: all commands exit `0`; the invariant CLI prints `Public-release invariants passed.`

### Task 3: Agent-neutral documentation and optional marketplace adapter

**Files:**
- Modify: `README.md`
- Modify: `.claude-plugin/marketplace.json`
- Modify: `plugins/issue-readiness/README.md`
- Modify: `plugins/mastra-api-cli/README.md`
- Modify: `plugins/pr-description/README.md`
- Modify: `plugins/sync-with-primary/README.md`
- Modify: `plugins/use-orchestration/README.md`

**Interfaces:**
- Consumes: portable `SKILL.md` directories discovered by Agent Skills-compatible hosts.
- Produces: an agent-neutral primary installation path plus explicitly labeled Codex and Claude Code adapter examples.

- [ ] **Step 1: Reframe repository identity**

Describe the project first as portable Agent Skills maintained by Berry Development. Rename the catalog section to `Skills`, explain that skills can be installed independently on compatible agents, and identify `.claude-plugin` metadata as an optional Claude Code marketplace adapter.

- [ ] **Step 2: Put agent-neutral installation first**

Lead with:

```bash
npx --yes skills add berrydev-ai/skills --list
npx --yes skills add berrydev-ai/skills
```

Keep Codex examples in a labeled `Codex` subsection and move marketplace/plugin commands into a later `Claude Code marketplace adapter` subsection.

- [ ] **Step 3: Update contributor and validation guidance**

Document the portable identity rule (`SKILL.md` name equals its parent directory), relative bundled resources via `SKILL_DIR`, the public-release checker, all Node tests, shell syntax checks, JSON parsing, Agent Skills discovery, and validation for every marketplace plugin including `sync-with-primary`.

- [ ] **Step 4: Reframe each plugin README**

Add an Agent Skills CLI install command before an explicitly optional Claude Code marketplace adapter block. Refer to the contents as the portable skill plus adapter metadata rather than making the marketplace the skill's identity.

- [ ] **Step 5: Reframe marketplace description without changing manifests**

Change only the marketplace description to say it adapts Berry Development's portable Agent Skills for independent Claude Code installation. Preserve plugin names, sources, authors, versions, and behavior.

- [ ] **Step 6: Run documentation and metadata checks**

Run:

```bash
node scripts/check-public-release.mjs
node -e 'for (const file of ["skills.sh.json", ".claude-plugin/marketplace.json", ...require("node:fs").globSync("plugins/*/.claude-plugin/plugin.json")]) JSON.parse(require("node:fs").readFileSync(file, "utf8"))'
```

Expected: both commands exit `0`.

### Task 4: Complete local verification

**Files:**
- Verify only; no planned file changes.

**Interfaces:**
- Consumes: the remediated tracked tree.
- Produces: fresh evidence for every release invariant before history replacement.

- [ ] **Step 1: Run all Node tests**

Run: `node --test scripts/*.test.mjs slack-*/scripts/*.test.mjs`

Expected: all tests pass with zero failures, cancellations, skips, or warnings.

- [ ] **Step 2: Run every tracked shell syntax check**

Run: `git ls-files -z '*.sh' | xargs -0 -n1 bash -n`

Expected: exit `0` and no output.

- [ ] **Step 3: Parse every tracked JSON file**

Run: `node -e 'for (const file of require("node:fs").globSync("**/*.json", { exclude: [".git/**"] })) JSON.parse(require("node:fs").readFileSync(file, "utf8"))'`

Expected: exit `0` and no output.

- [ ] **Step 4: Validate the marketplace and every plugin**

Run:

```bash
claude plugin validate .
for plugin in plugins/*; do claude plugin validate "$plugin"; done
```

Expected: all six validations succeed.

- [ ] **Step 5: Verify agent-neutral discovery**

Run: `npx --yes skills add . --list`

Expected: exit `0` and list each of the eight unique skills exactly once.

- [ ] **Step 6: Run release and diff hygiene checks**

Run:

```bash
node scripts/check-public-release.mjs
git diff --check
git status --short
```

Expected: invariant and whitespace checks pass; status contains only the planned changes.

### Task 5: Replace local history with one reviewed root commit

**Files:**
- Stage every planned path explicitly; do not stage unrelated files.

**Interfaces:**
- Consumes: the fully verified staged tree.
- Produces: `refs/heads/main` pointing to a parentless commit authored and committed by `Berry Development <eric@berrydev.ai>`.

- [ ] **Step 1: Stage and review the exact tree**

Use `git add --` with the exact modified, created, and deleted paths from Tasks 1–3, then run:

```bash
git status --short
git diff --cached --check
git diff --cached --stat
git diff --cached
```

Expected: the index contains only the approved cleanup.

- [ ] **Step 2: Re-run verification against the staged worktree**

Repeat every command in Task 4 and stop if any command fails.

- [ ] **Step 3: Write and install the parentless commit**

Run `git write-tree`, pass its tree SHA to `git -c user.name='Berry Development' -c user.email='eric@berrydev.ai' commit-tree` with message `Initial public release`, verify the commit has no parent, then atomically update `refs/heads/main` from its current SHA to the new SHA using `git update-ref`.

- [ ] **Step 4: Remove local legacy names without pruning objects**

Delete the local `docs/public-release-cleanup-design` branch and every local tag. Do not expire reflogs, run garbage collection, or delete remote-tracking refs yet.

- [ ] **Step 5: Verify the local published graph**

Run:

```bash
test "$(git rev-list --count main)" -eq 1
test "$(git rev-list --parents -n1 main | wc -w | tr -d ' ')" -eq 1
test "$(git for-each-ref refs/heads --format='%(refname)' | wc -l | tr -d ' ')" -eq 1
test -z "$(git tag --list)"
git show -s --format='%an <%ae>%n%cn <%ce>%n%P%n%s' main
node scripts/check-public-release.mjs
```

Expected: one parentless commit, one local branch, zero tags, the required public identity twice, subject `Initial public release`, and passing invariants.

### Task 6: Recreate and verify the private GitHub repository

**Files:**
- Write snapshots and verification clones only under a fresh directory from `mktemp -d`; never add them to Git.

**Interfaces:**
- Consumes: authenticated GitHub owner access, the old repository settings snapshot, the verified local root commit, and the current direct read collaborator.
- Produces: a new private `berrydev-ai/skills` repository containing only `main` at the clean root commit with restored metadata/settings/access.

- [ ] **Step 1: Establish authenticated admin access**

Run `gh auth status` and `gh repo view berrydev-ai/skills --json nameWithOwner,visibility`. Stop unless the active account can administer the exact private repository.

- [ ] **Step 2: Snapshot the old repository outside the checkout**

Create a temporary directory with `mktemp -d`. Save `gh api repos/berrydev-ai/skills`, `gh api repos/berrydev-ai/skills/topics`, and `gh api repos/berrydev-ai/skills/collaborators?affiliation=direct` there. Assert the repository ID is `1254505773`, visibility is `private`, default branch is `main`, and exactly one direct collaborator has `role_name == "read"`. Record the collaborator login from that response without printing tokens or private data. Preserve the old description and topics only as audit evidence; they are vendor-specific and must not be restored.

- [ ] **Step 3: Confirm the migration inventory is empty**

Use read-only GitHub API calls to verify there are no Actions secrets or variables, environments, deploy keys, hooks, rulesets, releases, issues, teams with repository access, or branch protection settings that require migration. Stop instead of deleting if this differs from the approved design.

- [ ] **Step 4: Delete and recreate the exact private repository**

Run `gh repo delete berrydev-ai/skills --yes`, confirm the old repository returns `404`, then run `gh repo create berrydev-ai/skills --private --description "Portable Agent Skills built and maintained by Berry Development."`. Confirm the new repository ID differs from `1254505773` and visibility is `private` before pushing.

- [ ] **Step 5: Push only the clean root and restore repository state**

Push only `refs/heads/main:refs/heads/main`. Restore feature flags, merge settings, and default branch from the snapshot with `gh api --method PATCH`; set the approved agent-neutral description and topics explicitly; restore the one collaborator with permission `pull`. Do not push tags or any other ref.

- [ ] **Step 6: Verify from a fresh clone**

Clone the recreated repository into a second `mktemp -d` directory. Require exactly one commit, one branch, zero tags, and no `refs/pull/*` from `git ls-remote`. Run a reachable-object scan for forbidden paths, credential signatures, absolute developer paths, and the externally supplied prohibited-identifier list without printing matching content. Then run the invariant script, all Node tests, shell syntax checks, JSON parsing, marketplace/plugin validation, and Agent Skills discovery in the clone.

- [ ] **Step 7: Verify GitHub configuration and visibility**

Compare the recreated repository response and direct collaborators to the snapshots for the approved functional fields. Confirm the description and topics equal the approved agent-neutral values, the repository remains private, and the default branch is `main`.

- [ ] **Step 8: Prune only after remote verification succeeds**

Back in the original checkout, prune stale remote-tracking refs, expire reflogs, and run Git garbage collection only after Steps 6–7 pass. Finally verify every object returned by `git rev-list --objects --all` is reachable from the single clean root.
