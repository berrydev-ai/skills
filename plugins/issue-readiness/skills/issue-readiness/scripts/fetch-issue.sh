#!/usr/bin/env bash
# Fetch a GitHub issue with everything needed for a readiness assessment.
# Usage: fetch-issue.sh <issue-number-or-url> [owner/repo]
# Outputs a single JSON object on stdout. Exits non-zero on error.
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "usage: fetch-issue.sh <issue-number-or-url> [owner/repo]" >&2
  exit 2
fi

ARG="$1"
REPO_FLAG=()
if [[ $# -ge 2 && -n "${2:-}" ]]; then
  REPO_FLAG=(--repo "$2")
fi

# Accept a full URL or a bare number; gh handles both for `issue view`.
gh issue view "$ARG" "${REPO_FLAG[@]}" \
  --json number,title,body,state,labels,assignees,milestone,comments,url,author,createdAt,updatedAt
