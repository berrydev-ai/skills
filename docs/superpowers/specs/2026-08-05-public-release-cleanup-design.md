# Public Release Cleanup Design

## Objective

Prepare this repository for public visibility by removing private historical state, eliminating agent-runtime dependencies from portable skills, and replacing all published Git history with one reviewed root commit.

## Release Invariants

- The published repository has exactly one root commit and no legacy tags, branches, or pull-request refs.
- No published text or binary object contains prohibited internal identifiers, credential signatures, local workspace databases, key files, manager state, caches, or absolute developer paths.
- Each `SKILL.md` declares a unique name matching its parent directory.
- Portable skill instructions resolve bundled resources relative to their own skill directory and do not require a vendor-specific runtime variable.
- Vendor-specific marketplace metadata remains an optional distribution adapter rather than the identity or runtime contract of the project.
- Existing Slack helper behavior and plugin manifests continue to validate.

## Current-Tree Remediation

Add a repository-owned public-release check that rejects tracked private-artifact paths, duplicate or mismatched skill identities, and vendor-specific plugin-root dependencies. Add ignore rules for local databases, cryptographic key material, manager state, caches, environment files, and generated evidence directories.

Remove the stale duplicate Mastra skill. Update the affected executable-skill instructions to resolve scripts from the directory containing `SKILL.md`. Reframe repository and plugin documentation around portable Agent Skills while keeping the Claude Code marketplace files as a compatibility adapter. Keep agent-specific installation examples clearly labeled and secondary to the agent-neutral installation path.

## History Replacement

After the remediated tree passes focused and full checks, write its staged tree as a new root commit using the public repository identity `Berry Development <eric@berrydev.ai>`. Delete all local legacy tags. Do not carry any parent commit into the replacement history.

Delete and recreate `berrydev-ai/skills` as a private GitHub repository under the same owner and name. This intentionally removes old pull requests, tags, issues, and hidden pull-request refs. Push only the clean root commit.

Restore the repository description, feature flags, merge settings, agent-neutral topics, default branch, and the existing read collaborator. There are no repository Actions secrets, variables, environments, deploy keys, webhooks, rulesets, releases, issues, teams, or branch protection settings to migrate.

## Verification

From a fresh clone of the recreated remote:

1. Require exactly one commit, one branch, and zero tags or pull-request refs.
2. Scan all reachable text and binary objects for prohibited identifiers, credential signatures, absolute developer paths, and forbidden artifact paths.
3. Run the public-release invariant script.
4. Run all Node tests, shell syntax checks, JSON parsing, marketplace validation, and agent-neutral skills discovery.
5. Confirm repository visibility remains private until the owner deliberately changes it.

Only after remote verification succeeds should local reflogs be expired and unreachable legacy objects pruned.

## External Follow-Up

Repository cleanup cannot revoke a credential. Any API credential stored in the removed manager database, and any credential protected by the removed key material, must be rotated or revoked through its owning service before public release.
