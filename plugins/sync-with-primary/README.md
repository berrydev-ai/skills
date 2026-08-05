# sync-with-primary

Sync the repository's primary branch (`main`/`master`/default) to local, then
merge it into whatever branch is currently checked out — the everyday "my
branch has fallen behind main, catch it up" workflow.

## Install with Agent Skills

```bash
npx --yes skills add berrydev-ai/skills --skill sync-with-primary
```

### Claude Code marketplace adapter

The optional adapter installs the same portable skill as a Claude Code plugin:

```bash
/plugin marketplace add berrydev-ai/skills
/plugin install sync-with-primary@berrydev-skills
```

## Use

Ask Claude to catch your branch up, for example:

- "Sync my branch with main."
- "Pull down the latest and merge it in."
- "My feature branch is behind — catch it up to master."

The skill fetches the primary branch, fast-forwards your local copy of it, and
merges it into your current branch. It **merges** rather than rebases, so no
force-push is ever needed and already-pushed work stays intact.

## Behavior

- **Auto-detects the primary branch** from the remote's default
  (`origin/HEAD`), falling back to `main` then `master`.
- **Auto-stashes and restores** uncommitted work, so you don't need to clean
  your tree first.
- **Fast-forward-only** for your local primary branch — it never silently
  rewrites a primary that has diverged.
- **Stops clearly on conflicts** (merge conflicts or a conflicting stash
  restore) and explains the exact repo state rather than looping.

## Overrides

- `PRIMARY_BRANCH=develop` — integrate onto a non-default branch.
- `REMOTE=upstream` — use a fork's upstream as the source of truth.

## Contents

- `skills/sync-with-primary/SKILL.md` — the skill
- `skills/sync-with-primary/scripts/sync_with_primary.sh` — the self-contained
  sync/merge script (auto-detect, auto-stash, fast-forward, merge)
- `.claude-plugin/plugin.json` — optional Claude Code distribution metadata
