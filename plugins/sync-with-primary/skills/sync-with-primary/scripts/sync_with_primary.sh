#!/usr/bin/env bash
#
# sync_with_primary.sh
#
# Sync the repository's primary branch to local, then merge it into whatever
# branch is currently checked out. Safe by design: it auto-detects the primary
# branch, auto-stashes uncommitted work, and refuses to leave the repo in a
# silently-broken state.
#
# The script prints a machine-readable status line for each phase, prefixed
# with "STEP:", "OK:", "WARN:", or "ERROR:". Read those to decide what to
# report to the user. On any conflict it stops and explains exactly what state
# the repo is in so the user can resolve it.
#
# Overrides (rarely needed):
#   PRIMARY_BRANCH=develop   # skip auto-detection, use this branch as primary
#   REMOTE=upstream          # use a remote other than "origin"
#
set -uo pipefail

REMOTE="${REMOTE:-origin}"
STASH_TAG="sync_with_primary autostash"
DID_STASH=0

say()  { printf '%s\n' "$*"; }
step() { printf 'STEP: %s\n' "$*"; }
ok()   { printf 'OK: %s\n' "$*"; }
warn() { printf 'WARN: %s\n' "$*"; }
die()  { printf 'ERROR: %s\n' "$*"; exit 1; }

# --- Preconditions ---------------------------------------------------------
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || \
  die "Not inside a git repository. cd into the repo first."

CURRENT="$(git rev-parse --abbrev-ref HEAD)"
[ "$CURRENT" = "HEAD" ] && \
  die "Detached HEAD (no branch checked out). Check out a branch first."

git remote get-url "$REMOTE" >/dev/null 2>&1 || \
  die "No remote named '$REMOTE'. Set REMOTE=<name> or add the remote."

# --- Detect the primary branch --------------------------------------------
detect_primary() {
  local ref
  ref="$(git symbolic-ref --quiet "refs/remotes/$REMOTE/HEAD" 2>/dev/null)"
  if [ -z "$ref" ]; then
    # origin/HEAD isn't set locally; ask the remote and cache it.
    git remote set-head "$REMOTE" --auto >/dev/null 2>&1 || true
    ref="$(git symbolic-ref --quiet "refs/remotes/$REMOTE/HEAD" 2>/dev/null)"
  fi
  if [ -n "$ref" ]; then
    printf '%s\n' "${ref#refs/remotes/$REMOTE/}"
    return 0
  fi
  # Fallback: conventional names, in order of preference.
  for cand in main master; do
    if git show-ref --verify --quiet "refs/remotes/$REMOTE/$cand"; then
      printf '%s\n' "$cand"
      return 0
    fi
  done
  return 1
}

if [ -n "${PRIMARY_BRANCH:-}" ]; then
  PRIMARY="$PRIMARY_BRANCH"
  ok "Primary branch set via PRIMARY_BRANCH: $PRIMARY"
else
  PRIMARY="$(detect_primary)" || \
    die "Could not detect the primary branch. Re-run with PRIMARY_BRANCH=<name>."
  ok "Detected primary branch: $PRIMARY"
fi
ok "Current branch: $CURRENT"

# --- Auto-stash a dirty working tree --------------------------------------
if [ -n "$(git status --porcelain)" ]; then
  step "Working tree is dirty; stashing changes (including untracked)."
  if git stash push --include-untracked -m "$STASH_TAG" >/dev/null 2>&1; then
    DID_STASH=1
    ok "Stashed uncommitted changes; will restore them at the end."
  else
    die "Failed to stash changes. Commit or stash manually, then re-run."
  fi
fi

restore_stash() {
  [ "$DID_STASH" -eq 1 ] || return 0
  step "Restoring your stashed changes."
  if git stash pop >/dev/null 2>&1; then
    ok "Restored stashed changes cleanly."
  else
    warn "Your changes were restored but produced conflicts with the updated files."
    warn "Resolve the conflicts shown by 'git status'; your work is safe in the working tree."
    return 1
  fi
}

# --- Fetch -----------------------------------------------------------------
step "Fetching from '$REMOTE' (pruning stale branches)."
git fetch --prune "$REMOTE" || die "git fetch failed. Check network/remote access."
ok "Fetch complete."

# --- Update the local primary branch --------------------------------------
# Fast-forward only: if local primary has diverged from the remote we do NOT
# rewrite it silently — that would be a surprise the user didn't ask for.
if [ "$CURRENT" = "$PRIMARY" ]; then
  step "You are on the primary branch; fast-forwarding it to $REMOTE/$PRIMARY."
  if git merge --ff-only "$REMOTE/$PRIMARY" >/dev/null 2>&1; then
    ok "Primary branch '$PRIMARY' is now up to date."
    restore_stash || exit 2
    ok "DONE: '$PRIMARY' synced with $REMOTE."
    exit 0
  else
    restore_stash || true
    die "Local '$PRIMARY' has diverged from $REMOTE/$PRIMARY and cannot fast-forward. Reconcile it manually (you likely have local commits on the primary branch)."
  fi
fi

step "Updating local '$PRIMARY' to match $REMOTE/$PRIMARY (fast-forward only)."
if git fetch "$REMOTE" "$PRIMARY:$PRIMARY" >/dev/null 2>&1; then
  ok "Local '$PRIMARY' updated to $REMOTE/$PRIMARY."
else
  warn "Could not fast-forward local '$PRIMARY' (it has commits not on $REMOTE). Merging from $REMOTE/$PRIMARY directly instead."
fi

# --- Merge primary into the current branch --------------------------------
step "Merging '$PRIMARY' into '$CURRENT'."
if git merge --no-edit "$REMOTE/$PRIMARY" >/dev/null 2>&1; then
  ok "Merged '$PRIMARY' into '$CURRENT' cleanly."
  restore_stash || exit 2
  ok "DONE: '$PRIMARY' synced and merged into '$CURRENT'."
  exit 0
else
  warn "Merge of '$PRIMARY' into '$CURRENT' hit conflicts."
  warn "The merge is in progress — resolve conflicts ('git status' lists them),"
  warn "then 'git add' the files and 'git commit' to finish, or 'git merge --abort' to back out."
  if [ "$DID_STASH" -eq 1 ]; then
    warn "NOTE: your earlier uncommitted changes are still stashed ('$STASH_TAG')."
    warn "Do NOT run 'git stash pop' until the merge conflict is resolved."
  fi
  exit 3
fi
