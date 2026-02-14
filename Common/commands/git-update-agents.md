# Git Update Agents

Sync all Claude configuration files to the production-master repo for version tracking.

**IMPORTANT: Delegate ALL work to a Bash sub-agent using the Task tool.** Do NOT run commands in the main context. This keeps the main conversation context clean.

## How to execute

Spawn a single **Bash** sub-agent (via the Task tool, `subagent_type: "Bash"`, `model: "haiku"`) with the full prompt below. Report only the sub-agent's final summary to the user.

### Sub-agent prompt

```
Sync Claude config files to the production-master repo and commit.

First, find the production-master repo:
PM_ROOT=""
if [ -d ~/Projects/production-master/Common ]; then
  PM_ROOT=~/Projects/production-master
elif [ -d ~/.claude/production-master/Common ]; then
  PM_ROOT=~/.claude/production-master
fi

if [ -z "$PM_ROOT" ]; then
  echo "ERROR: production-master repo not found. Clone it first:"
  echo "  git clone https://github.com/TamirCohen-Wix/production-master.git ~/Projects/production-master"
  exit 1
fi

Run these commands:

# Sync Common layer
rsync -av --delete ~/.claude/agents/ $PM_ROOT/Common/agents/
rsync -av --delete ~/.claude/commands/ $PM_ROOT/Common/commands/
rsync -av --delete ~/.claude/skills/ $PM_ROOT/Common/skills/
rsync -av --delete ~/.claude/hooks/ $PM_ROOT/Common/hooks/
rsync -av --delete ~/.claude/output-styles/ $PM_ROOT/Common/output-styles/

# Sync settings template (strip local/sensitive data)
cp ~/.claude/settings.json $PM_ROOT/Claude/templates/settings.json

# Stage changes
cd $PM_ROOT
git add -A Common/ Claude/templates/

# Check for changes
git diff --cached --name-status

If no staged changes, respond "Nothing to sync — everything is up to date." and stop.

If there are changes, build a commit message:
- Title: "Update pipeline: " + comma-separated list of changed categories (derive category from first dir, e.g. Common/agents/foo.md → "agents", Claude/templates/settings.json → "settings")
- Body: one bullet per file: "- New: path" for A, "- Updated: path" for M, "- Deleted: path" for D
- End with: Co-Authored-By: Claude <noreply@anthropic.com>

Then commit (use HEREDOC for message) and push.

Respond with ONLY:
1. The list of changed files (one per line, with New/Updated/Deleted prefix)
2. "Pushed to production-master." or "Nothing to sync."
```
