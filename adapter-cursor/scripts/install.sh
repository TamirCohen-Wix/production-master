#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────
# production-master — Cursor adapter install script
# ─────────────────────────────────────────────────────

REPO_URL="https://github.com/TamirCohen-Wix/production-master"
PROFILE_FILES=("$HOME/.zshrc" "$HOME/.bashrc" "$HOME/.bash_profile")

echo "================================================="
echo "  production-master — Cursor Adapter Installer"
echo "================================================="
echo ""

# ── 1. Check / prompt for access key ────────────────
if [ -z "${PRODUCTION_MASTER_ACCESS_KEY:-}" ]; then
  echo "PRODUCTION_MASTER_ACCESS_KEY is not set."
  echo ""
  read -rp "Enter your access key: " PRODUCTION_MASTER_ACCESS_KEY
  if [ -z "$PRODUCTION_MASTER_ACCESS_KEY" ]; then
    echo "ERROR: access key cannot be empty."
    exit 1
  fi
  export PRODUCTION_MASTER_ACCESS_KEY
fi

echo "Access key detected."
echo ""

# ── 2. Persist to shell profile ─────────────────────
EXPORT_LINE="export PRODUCTION_MASTER_ACCESS_KEY=\"${PRODUCTION_MASTER_ACCESS_KEY}\""
ADDED_TO=""

for profile in "${PROFILE_FILES[@]}"; do
  if [ -f "$profile" ]; then
    if ! grep -q 'PRODUCTION_MASTER_ACCESS_KEY' "$profile"; then
      echo "" >> "$profile"
      echo "# production-master access key" >> "$profile"
      echo "$EXPORT_LINE" >> "$profile"
      ADDED_TO="$profile"
      break
    else
      ADDED_TO="$profile (already present)"
      break
    fi
  fi
done

if [ -z "$ADDED_TO" ]; then
  echo "WARNING: Could not find a shell profile to update."
  echo "Please add the following line to your shell profile manually:"
  echo ""
  echo "  $EXPORT_LINE"
  echo ""
else
  echo "Shell profile updated: $ADDED_TO"
fi

echo ""

# ── 3. Success ──────────────────────────────────────
echo "================================================="
echo "  Installation complete!"
echo "================================================="
echo ""
echo "Next steps:"
echo "  1. Restart your terminal (or run: source ~/.zshrc)"
echo "  2. Open Cursor in your project directory"
echo "  3. The production-master plugin will be available"
echo ""
echo "Repository: $REPO_URL"
echo ""
