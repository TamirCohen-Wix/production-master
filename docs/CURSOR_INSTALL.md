# Installing Production Master on Cursor IDE

This guide is for installing **production-master** **natively on Cursor IDE** — using Cursor's own rules, skills, and MCP. No Claude Code extension or `claude plugin install` is involved. Everything runs on Cursor's built-in agent.

## Target: Cursor IDE only

| What you get | How it works in Cursor IDE |
|--------------|----------------------------|
| **Commands** | Cursor **slash commands** in `.cursor/commands/*.md`. Typing `/production-master`, `/grafana-query`, etc. runs the corresponding command file (plain Markdown, no frontmatter). |
| **Sub-agents** | Agent definitions in `.cursor/agents/*.md`. The `/production-master` command tells Cursor's single agent to read and execute each `.cursor/agents/<name>.md` in turn and write outputs to the paths the pipeline expects. |
| **MCP** | Cursor's MCP config: `~/.cursor/mcp.json` (macOS) or `.cursor/mcp.json` (project). Same `mcpServers` shape as the plugin's `mcp-servers.json`. |
| **Skills** | Cursor **skills** in `.cursor/skills/<name>/SKILL.md` (or `~/.cursor/skills/`). Each needs `name` + `description` in frontmatter. |
| **Domain config** | Use `~/.claude/production-master/domains/<repo>/` so the same config works if you also use Claude Code elsewhere; optional. |

---

## What Needs to Be Done

### 1. Commands → Cursor slash commands

Cursor IDE supports **native slash commands** as plain Markdown files in `.cursor/commands/`. When you type `/production-master` or `/grafana-query`, Cursor runs the corresponding `.cursor/commands/<name>.md` (e.g. `production-master.md`, `grafana-query.md`). No frontmatter — Cursor commands are content only.

`scripts/install-cursor.sh` copies each `commands/*.md` into `.cursor/commands/*.md`, strips frontmatter, and for `production-master.md` prepends a short note that in Cursor there is no Task tool — when the doc says "Launch Task with agent X", the agent should read `.cursor/agents/X.md` and execute those instructions in the same turn.

### 2. Sub-agents → Cursor agents directory

Cursor IDE has one agent per chat; there is no `Task` / subagent tool. The install script copies all `agents/*.md` into `.cursor/agents/`. The `/production-master` command file instructs Cursor's agent to:

- Follow the pipeline steps in the command doc.
- Whenever the doc says "Launch Task with agent X", **read `.cursor/agents/X.md` and run those instructions yourself**, then write the output to the path the orchestrator specifies (e.g. under `debug/debug-<ticket>-<timestamp>/`).
- Run "parallel" steps (e.g. production-analyzer + slack-analyzer) **one after another** by the same Cursor agent.

You don't need to change the repo's `agents/*.md`; they are the source of truth. The script copies them into `.cursor/agents/` so the commands can reference them.

### 3. MCPs → Cursor MCP config

Cursor IDE reads MCP servers from:

- **Project:** `.cursor/mcp.json`
- **User (macOS):** `~/.cursor/mcp.json`
- **User (Linux):** `~/.config/cursor/mcp.json`

Use the same `mcpServers` structure as in the repo's `mcp-servers.json`: `command`/`args`/`env` for stdio, `url`/`headers` for HTTP. Replace `<YOUR_ACCESS_KEY>` with your real key.

`scripts/install-cursor.sh` merges the 9 MCP servers from `mcp-servers.json` into your Cursor MCP config and prompts for the access key so octocode, Slack, jira, grafana-datasource, FT-release, github, context-7, grafana-mcp, and fire-console work in Cursor.

### 4. Skills → Cursor skills

Cursor IDE discovers skills at:

- **Project:** `.cursor/skills/<skill-name>/SKILL.md`
- **User:** `~/.cursor/skills/<skill-name>/SKILL.md`

Each skill is a directory with a `SKILL.md` that has frontmatter `name` and `description`. The repo's `skills/` already have one folder per MCP; the install script copies them into `.cursor/skills/` and adds a `name` in frontmatter when missing, so all 9 (slack, octocode, jira, grafana-mcp, grafana-datasource, github, ft-release, fire-console, context7) are available to Cursor's agent.

---

## Summary Checklist

| Item | Action |
|------|--------|
| **Commands** | Copy `commands/*.md` into `.cursor/commands/*.md` (strip frontmatter; production-master gets a Cursor-specific intro). |
| **Sub-agents** | Copy `agents/*.md` into `.cursor/agents/`; the `/production-master` command tells the single agent to read and run each as needed. |
| **MCPs** | Merge `mcp-servers.json` into `~/.cursor/mcp.json` (or `.cursor/mcp.json`) with the user's access key. |
| **Skills** | Copy or link `skills/*` into `.cursor/skills/` (or `~/.cursor/skills/`); ensure each SKILL.md has `name` and `description` in frontmatter. |
| **Domain config** | Optional: use `~/.claude/production-master/domains/<repo>/` (same as the plugin) so config can be shared. |
| **Install script** | Run `scripts/install-cursor.sh` to create `.cursor/commands/`, `.cursor/agents/`, `.cursor/skills/`, and MCP config. |

After this, **Cursor IDE** (no Claude Code extension) will have:

- **Commands:** Typing `/production-master`, `/grafana-query`, `/slack-search`, etc. invokes the corresponding `.cursor/commands/*.md` (native slash commands).
- **Pipeline:** The `/production-master` command instructs Cursor's agent to run each step by reading `.cursor/agents/*.md` and writing to the same output paths.
- **MCPs:** All 9 servers in Cursor's MCP config.
- **Skills:** All 9 MCP skill docs in `.cursor/skills/` so the agent knows how to use the tools.

---

## Quick install (Cursor IDE only)

From the repo root:

```bash
# Install into your user Cursor config (default) — commands/agents/skills available in all projects
bash scripts/install-cursor.sh

# Or install into a specific directory (e.g. a project's .cursor or a custom path)
bash scripts/install-cursor.sh ~/.cursor
bash scripts/install-cursor.sh /path/to/project/.cursor
bash scripts/install-cursor.sh .cursor
```

With no argument, the script installs into `~/.cursor`. Pass a path to install elsewhere (e.g. `.cursor` for the repo’s own .cursor dir).

This will:

1. Install **slash commands** from `commands/` into `.cursor/commands/` (plain Markdown, no frontmatter).
2. Install **agent definitions** from `agents/` into `.cursor/agents/`.
3. Copy `skills/` into `.cursor/skills/` and add `name` in frontmatter where needed.
4. Merge the 9 MCP servers from `mcp-servers.json` into your Cursor MCP config (prompts for your access key if needed).

Restart Cursor (or reload the window). Then in chat you can use `/production-master <TICKET-ID>`, `/grafana-query`, `/slack-search`, etc.; each invokes the corresponding command file, and the pipeline runs using the installed agents.

---

## Optional: agent teams and hooks

- **Agent teams** (e.g. skeptic vs two hypothesis agents): The rule can tell Cursor's agent to "evaluate hypothesis A vs B, then play the skeptic role and write the verdict" in one or more turns.
- **Hooks** (`hooks/hooks.json`): Those are for the Claude Code plugin (e.g. post-run notifications). In Cursor IDE there's no direct equivalent; implement any behavior in the rule or via a script the agent runs.
