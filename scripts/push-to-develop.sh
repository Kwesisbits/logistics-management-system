#!/usr/bin/env bash
set -euo pipefail

# Push all local changes to origin/develop.
# Usage:
#   ./scripts/push-to-develop.sh "your commit message"
# If no message is provided, a default message is used.

DEFAULT_MESSAGE="chore: sync all local changes"
COMMIT_MESSAGE="${1:-$DEFAULT_MESSAGE}"
TARGET_BRANCH="develop"
REMOTE_NAME="origin"

if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is not installed or not in PATH."
  exit 1
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: this directory is not a git repository."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "$TARGET_BRANCH" ]]; then
  echo "Switching from '$CURRENT_BRANCH' to '$TARGET_BRANCH'..."
  git checkout "$TARGET_BRANCH"
fi

echo "Fetching latest '$TARGET_BRANCH' from '$REMOTE_NAME'..."
git fetch "$REMOTE_NAME" "$TARGET_BRANCH"

echo "Rebasing local '$TARGET_BRANCH' on '$REMOTE_NAME/$TARGET_BRANCH'..."
git pull --rebase "$REMOTE_NAME" "$TARGET_BRANCH"

echo "Staging all changes..."
git add -A

if git diff --cached --quiet; then
  echo "No staged changes found. Nothing to commit."
  exit 0
fi

echo "Creating commit..."
git commit -m "$COMMIT_MESSAGE"

echo "Pushing to '$REMOTE_NAME/$TARGET_BRANCH'..."
git push "$REMOTE_NAME" "$TARGET_BRANCH"

echo "Done: changes pushed to '$REMOTE_NAME/$TARGET_BRANCH'."
