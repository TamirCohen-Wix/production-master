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
if [ -d ~/Projects/production-master/agents ]; then
  PM_ROOT=~/Projects/production-master
elif [ -d ~/.claude/production-master/agents ]; then
  PM_ROOT=~/.claude/production-master
fi

if [ -z "$PM_ROOT" ]; then
  echo "ERROR: production-master repo not found. Clone it first:"
  echo "  git clone https://github.com/TamirCohen-Wix/production-master.git ~/Projects/production-master"
  exit 1
fi

Run these commands:

# Sync pipeline components to plugin root
rsync -av --delete ~/.claude/agents/ $PM_ROOT/core/agents/
rsync -av --delete ~/.claude/commands/ $PM_ROOT/adapter-claude/commands/
rsync -av --delete ~/.claude/skills/ $PM_ROOT/core/skills/
rsync -av --delete ~/.claude/output-styles/ $PM_ROOT/output-styles/

# Sync hooks script
mkdir -p $PM_ROOT/scripts
rsync -av ~/.claude/hooks/validate-report-links.sh $PM_ROOT/scripts/validate-report-links.sh

# Stage changes
cd $PM_ROOT
git add -A core/agents/ adapter-claude/commands/ core/skills/ output-styles/ scripts/ hooks/

# Check for changes
git diff --cached --name-status

If no staged changes, respond "Nothing to sync — everything is up to date." and stop.

If there are changes, build a commit message:
- Title: "Update pipeline: " + comma-separated list of changed categories (derive category from first dir, e.g. core/agents/foo.md → "agents", scripts/validate-report-links.sh → "scripts")
- Body: one bullet per file: "- New: path" for A, "- Updated: path" for M, "- Deleted: path" for D
- End with: Co-Authored-By: Claude <noreply@anthropic.com>

Then commit (use HEREDOC for message) and push.

Respond with ONLY:
1. The list of changed files (one per line, with New/Updated/Deleted prefix)
2. "Pushed to production-master." or "Nothing to sync."
```
