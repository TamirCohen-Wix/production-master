#!/usr/bin/env bash
# Production Master — Version Bump
# Usage:
#   bash scripts/bump-version.sh            # Dry-run: shows what would change
#   bash scripts/bump-version.sh --execute  # Actually bump, commit, tag, release
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

PLUGIN_JSON="$REPO_ROOT/.claude-plugin/plugin.json"
MARKETPLACE_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"
README="$REPO_ROOT/README.md"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'
info()  { echo -e "${BLUE}▸${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
err()   { echo -e "${RED}✗${NC} $1"; exit 1; }

# ─── Parse arguments ─────────────────────────────────────────────────
EXECUTE=false
for arg in "$@"; do
  case "$arg" in
    --execute) EXECUTE=true ;;
    *) err "Unknown argument: $arg. Usage: bump-version.sh [--execute]" ;;
  esac
done

# ─── Preflight ───────────────────────────────────────────────────────
cd "$REPO_ROOT"

if ! command -v jq &>/dev/null; then
  err "jq is required. Install with: brew install jq"
fi

if ! command -v gh &>/dev/null; then
  err "GitHub CLI (gh) is required. Install from: https://cli.github.com"
fi

if [ ! -f "$PLUGIN_JSON" ]; then
  err "plugin.json not found at $PLUGIN_JSON"
fi

# Ensure working tree is clean (for --execute)
if [ "$EXECUTE" = true ]; then
  if ! git diff --quiet || ! git diff --cached --quiet; then
    err "Working tree is not clean. Commit or stash changes first."
  fi
fi

# ─── Read current version ────────────────────────────────────────────
CURRENT=$(jq -r '.version' "$PLUGIN_JSON")
if [ -z "$CURRENT" ] || [ "$CURRENT" = "null" ]; then
  err "Could not read version from plugin.json"
fi

# Parse version: separate base (X.Y.Z) from suffix (-beta, -rc1, etc.)
BASE="${CURRENT%%-*}"
if [ "$BASE" = "$CURRENT" ]; then
  SUFFIX=""
else
  SUFFIX="-${CURRENT#*-}"
fi

# Parse X.Y.Z
IFS='.' read -r MAJOR MINOR PATCH <<< "$BASE"
if [ -z "$MAJOR" ] || [ -z "$MINOR" ] || [ -z "$PATCH" ]; then
  err "Could not parse version: $CURRENT (expected X.Y.Z or X.Y.Z-suffix)"
fi

# Bump patch
NEW_PATCH=$((PATCH + 1))
NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}${SUFFIX}"
TAG="v${NEW_VERSION}"

echo ""
echo -e "${BOLD}Version Bump Preview${NC}"
echo "  Current:  $CURRENT"
echo "  New:      $NEW_VERSION"
echo "  Tag:      $TAG"
echo ""

# ─── Show changes ────────────────────────────────────────────────────
info "Files to update:"

echo "  .claude-plugin/plugin.json"
echo "    \"version\": \"$CURRENT\" → \"$NEW_VERSION\""

echo "  .claude-plugin/marketplace.json"
echo "    \"version\": \"$CURRENT\" → \"$NEW_VERSION\""

# Count README occurrences (plain + shields.io escaped)
SHIELDS_OLD=$(echo "$CURRENT" | sed 's/-/--/g')
README_COUNT_PLAIN=$(grep -c "$CURRENT" "$README" 2>/dev/null || echo "0")
README_COUNT_SHIELDS=$(grep -c "$SHIELDS_OLD" "$README" 2>/dev/null || echo "0")
README_COUNT=$((README_COUNT_PLAIN + README_COUNT_SHIELDS))
echo "  README.md"
echo "    $README_COUNT occurrence(s) of \"$CURRENT\" → \"$NEW_VERSION\" (including shields.io badge)"

echo ""
echo "  After release:"
echo "    1. Sync cursor-support branch"
echo "    2. Tag ${TAG}-cursor and create Cursor release"

if [ "$EXECUTE" = false ]; then
  echo ""
  warn "Dry run — no changes made. Use --execute to apply."
  exit 0
fi

# ─── Apply changes ───────────────────────────────────────────────────
echo ""
info "Applying version bump..."

# plugin.json
jq --arg v "$NEW_VERSION" '.version = $v' "$PLUGIN_JSON" > "$PLUGIN_JSON.tmp"
mv "$PLUGIN_JSON.tmp" "$PLUGIN_JSON"
ok "Updated plugin.json"

# marketplace.json
jq --arg v "$NEW_VERSION" '.plugins[0].version = $v' "$MARKETPLACE_JSON" > "$MARKETPLACE_JSON.tmp"
mv "$MARKETPLACE_JSON.tmp" "$MARKETPLACE_JSON"
ok "Updated marketplace.json"

# README.md — replace version (plain + shields.io escaped)
SHIELDS_OLD=$(echo "$CURRENT" | sed 's/-/--/g')
SHIELDS_NEW=$(echo "$NEW_VERSION" | sed 's/-/--/g')
sed "s/${CURRENT}/${NEW_VERSION}/g; s/${SHIELDS_OLD}/${SHIELDS_NEW}/g" "$README" > "$README.tmp"
mv "$README.tmp" "$README"
ok "Updated README.md ($README_COUNT occurrences)"

# ─── Git commit + tag ────────────────────────────────────────────────
info "Committing..."
git add "$PLUGIN_JSON" "$MARKETPLACE_JSON" "$README"
git commit -m "Bump version to ${NEW_VERSION}"
ok "Committed"

info "Tagging $TAG..."
git tag "$TAG"
ok "Tagged $TAG"

# ─── Push ────────────────────────────────────────────────────────────
info "Pushing commit + tag..."
git push origin main
git push origin "$TAG"
ok "Pushed to origin"

# ─── GitHub release ──────────────────────────────────────────────────
info "Creating GitHub release..."
gh release create "$TAG" --title "$TAG" --generate-notes --prerelease
ok "Created release $TAG"

# ─── Sync cursor-support + cursor release ────────────────────────────
info "Syncing cursor-support branch with new version..."
SYNC_SCRIPT="$REPO_ROOT/scripts/sync-cursor.sh"
if [ -f "$SYNC_SCRIPT" ]; then
  bash "$SYNC_SCRIPT" --tag "$TAG"
  ok "Cursor branch synced and tagged ${TAG}-cursor"
else
  warn "sync-cursor.sh not found — skipping cursor release"
fi

# ─── Summary ─────────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}${BOLD}Done!${NC} Version bumped: $CURRENT → $NEW_VERSION"
echo "  Commit:      $(git rev-parse --short HEAD)"
echo "  Tag:         $TAG"
echo "  Cursor tag:  ${TAG}-cursor"
echo "  Release:     https://github.com/TamirCohen-Wix/production-master/releases/tag/$TAG"
echo "  Cursor:      https://github.com/TamirCohen-Wix/production-master/releases/tag/${TAG}-cursor"
