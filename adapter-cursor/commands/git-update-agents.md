# Git Update Agents (Cursor Adapter)

Sync all Cursor configuration files to the production-master repo for version tracking.

**Execute ALL work inline.** Cursor does not support the `Task` tool with sub-agent dispatch. Run all commands directly.

## How to execute

Run the following steps inline. Report the final summary to the user.

### Step 1: Find the production-master repo

```bash
PM_ROOT=""
if [ -d ~/Projects/production-master/core/agents ]; then
  PM_ROOT=~/Projects/production-master
elif [ -d ~/.cursor/production-master/core/agents ]; then
  PM_ROOT=~/.cursor/production-master
fi

if [ -z "$PM_ROOT" ]; then
  echo "ERROR: production-master repo not found. Clone it first:"
  echo "  git clone https://github.com/TamirCohen-Wix/production-master.git ~/Projects/production-master"
  exit 1
fi
```

### Step 2: Sync pipeline components

```bash
# Sync core components (shared across adapters)
rsync -av --delete ~/.cursor/agents/ $PM_ROOT/core/agents/
rsync -av --delete ~/.cursor/skills/ $PM_ROOT/core/skills/

# Sync Cursor adapter components
rsync -av --delete ~/.cursor/commands/ $PM_ROOT/adapter-cursor/commands/

# Sync hooks script (if exists)
if [ -d ~/.cursor/hooks ]; then
  mkdir -p $PM_ROOT/adapter-cursor/hooks
  rsync -av ~/.cursor/hooks/ $PM_ROOT/adapter-cursor/hooks/
fi
```

### Step 3: Stage and check changes

```bash
cd $PM_ROOT
git add -A core/agents/ core/skills/ adapter-cursor/commands/ adapter-cursor/hooks/

# Check for changes
git diff --cached --name-status
```

If no staged changes, respond "Nothing to sync -- everything is up to date." and stop.

### Step 4: Build commit message and push

If there are changes:
- Title: "Update pipeline: " + comma-separated list of changed categories (derive category from first dir, e.g. `core/agents/foo.md` -> "agents", `adapter-cursor/commands/bar.md` -> "cursor-commands")
- Body: one bullet per file: "- New: path" for A, "- Updated: path" for M, "- Deleted: path" for D
- End with: `Co-Authored-By: Claude <noreply@anthropic.com>`

Then commit (use HEREDOC for message) and push.

### Step 5: Report

Respond with ONLY:
1. The list of changed files (one per line, with New/Updated/Deleted prefix)
2. "Pushed to production-master." or "Nothing to sync."
