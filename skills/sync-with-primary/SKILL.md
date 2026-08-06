---
name: sync-with-primary
description: >-
  Sync the repository's primary branch (main/master/default) to local, then
  update the currently checked-out branch by merging the freshly-synced primary
  into it. Use this whenever the user wants to "sync", "update", "catch up",
  "pull in main", "get the latest", "rebase off main" (they usually mean merge),
  or otherwise bring their current working branch up to date with the primary
  branch — even if they don't name a specific branch or say the word "git".
  Trigger on phrases like "update my branch", "sync with main", "pull down the
  latest and merge it in", "my branch is behind", "catch this branch up to
  master", or "refresh from the default branch". Do NOT use for pushing,
  publishing, or opening PRs; this is strictly about pulling the primary branch
  down and merging it into the current branch.
---

# Sync the current branch with the primary branch

This skill brings the primary branch (usually `main` or `master`) up to date
from the remote, then merges those updates into whatever branch is currently
checked out — the everyday "my branch has fallen behind main, catch it up"
workflow.

The behavior was chosen deliberately, and understanding *why* helps you handle
cases the script doesn't cover:

- **Merge, not rebase.** Merging brings primary in without rewriting the
  current branch's commit history, so no force-push is needed afterward and
  already-pushed work stays intact. If the user explicitly asks for a rebase
  instead, prefer `git rebase <remote>/<primary>` over the script and explain
  the force-push implication.
- **Primary is auto-detected**, so the skill works in any repo without
  configuration: it reads the remote's default branch (`origin/HEAD`) and falls
  back to `main` then `master`.
- **Uncommitted work is auto-stashed and restored**, so the user never has to
  clean their tree first. The one thing that can go wrong here — a stash that
  conflicts on restore — is surfaced explicitly rather than swallowed.
- **Fast-forward-only for the primary branch.** The local primary is only
  advanced if it can fast-forward. If the user has somehow committed directly
  onto their local primary, the skill won't silently rewrite or discard that;
  it stops and says so.

## How to run it

Run the bundled script from inside the target repository. Resolve `SKILL_DIR`
as the absolute directory containing this `SKILL.md`, using the file location
from which the agent host loaded this skill. `SKILL_DIR` is a local shell
variable for this invocation, not a runtime variable supplied by any
particular host. The script is self-contained and prints a labeled status line
for every phase:

```bash
bash "$SKILL_DIR/scripts/sync_with_primary.sh"
```

Read the script's output and translate it for the user. Each line is prefixed:

- `OK:` — a step succeeded (e.g. which primary was detected, what got merged).
- `WARN:` — something needs the user's attention but the script kept going or
  stopped cleanly.
- `ERROR:` — a precondition failed and the script stopped before changing
  anything meaningful.

Exit codes let you branch your response without re-parsing everything:

- `0` — fully done. Tell the user the primary was synced and merged in cleanly.
- `2` — the sync/merge succeeded, but restoring their stashed changes hit
  conflicts. Their work is safe in the working tree; point them at
  `git status` to resolve.
- `3` — merging primary into the current branch hit conflicts. The merge is
  mid-flight; guide them to resolve and commit (or `git merge --abort`). If a
  stash is still held, warn them not to pop it until the merge is resolved.
- `1` — a hard precondition failed (not a repo, detached HEAD, no remote,
  primary undetectable). Read the `ERROR:` line and address that specific cause.

## Overrides

The script auto-detects everything, but two environment variables cover the
rare exceptions — pass them inline when the user's situation calls for it:

- `PRIMARY_BRANCH=develop bash "$SKILL_DIR/scripts/sync_with_primary.sh"`
  when the "primary" branch isn't the repo's default (e.g. a team that
  integrates onto `develop`).
- `REMOTE=upstream bash "$SKILL_DIR/scripts/sync_with_primary.sh"`
  for forks where the source of truth is `upstream`, not `origin`.

## When things need a human

Merge conflicts and diverged-primary situations are not failures of the skill —
they are real states that require judgment. In those cases, don't loop or retry
the script. Report the exact state clearly (which files conflict, whether a
stash is still held) and let the user drive the resolution, offering to help
resolve specific conflicts if they want.
