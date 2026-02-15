# Installing Production Master on Cursor IDE

This guide is for installing **production-master** **natively on Cursor IDE** — using Cursor's own rules, skills, and MCP. No Claude Code extension or `claude plugin install` is involved. Everything runs on Cursor's built-in agent.

## Target: Cursor IDE only

| What you get | How it works in Cursor IDE |
|--------------|----------------------------|
| **Commands** | Cursor **rules** (`.cursor/rules/`) tell the agent what to do when you type `/production-master`, `/grafana-query`, etc. |
| **Sub-agents** | Cursor has one agent. The rule tells it to follow `agents/*.md` step by step and write outputs to the same paths the pipeline expects. |
| **MCP** | Cursor's MCP config: `~/.cursor/mcp.json` (macOS) or `.cursor/mcp.json` (project). Same `mcpServers` shape as the plugin's `mcp-servers.json`. |
| **Skills** | Cursor **skills** in `.cursor/skills/<name>/SKILL.md` (or `~/.cursor/skills/`). Each needs `name` + `description` in frontmatter. |
| **Domain config** | Use `~/.claude/production-master/domains/<repo>/` so the same config works if you also use Claude Code elsewhere; optional. |

---

## What Needs to Be Done

### 1. Commands → Cursor rules

Cursor IDE uses **rules** to define behavior. When you type `/production-master` or `/grafana-query`, Cursor's agent sees that text and the rule tells it what to do.

- **Add** a rule (e.g. `.cursor/rules/production-master.mdc`) that:
  - Applies when you're doing production work (or set `alwaysApply: true` so it's always in context).
  - Lists the slash commands and tells the agent to follow `commands/production-master.md` (and the other command files) for each one.
  - For steps that in the plugin say "Launch Task with agent X", the rule says: **run the instructions in `agents/X.md` yourself** and write outputs to the paths the orchestrator specifies (e.g. under `debug/debug-<ticket>-<timestamp>/`).

`scripts/install-cursor.sh` creates `.cursor/rules/production-master.mdc` and wires it to the repo's `commands/` and `agents/` so Cursor's single agent runs the full pipeline.

### 2. Sub-agents → one Cursor agent, following agent prompts

Cursor IDE has one agent per chat; there is no `Task` / subagent tool. The **orchestrator** is implemented by a rule that:

- Says: when the user types `/production-master <args>`, follow `commands/production-master.md`.
- Whenever that doc says "Launch Task with agent X", the rule says: **read `agents/X.md`, run those instructions yourself, and write the output** to the path the orchestrator specifies (e.g. `bug-context-output-V1.md`).
- "Parallel" steps in the doc (e.g. production-analyzer + slack-analyzer) are run **one after another** by the same Cursor agent.

You don't need to change `agents/*.md`; they stay as the source of truth. Only the **orchestrator** is expressed as a Cursor rule that points at them.

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
| **Commands** | Add `.cursor/rules/production-master.mdc` that describes slash commands and references `commands/production-master.md` and other command/agent files. |
| **Sub-agents** | Orchestrator rule instructs the single agent to run each step by following the corresponding `agents/*.md` and writing outputs to the specified paths. |
| **MCPs** | Merge `mcp-servers.json` into `~/.cursor/mcp.json` (or `.cursor/mcp.json`) with the user's access key. |
| **Skills** | Copy or link `skills/*` into `.cursor/skills/` (or `~/.cursor/skills/`); ensure each SKILL.md has `name` and `description` in frontmatter. |
| **Domain config** | Optional: use `~/.claude/production-master/domains/<repo>/` (same as the plugin) so config can be shared. |
| **Install script** | Run `scripts/install-cursor.sh` to create `.cursor/rules/`, `.cursor/skills/`, and MCP config. |

After this, **Cursor IDE** (no Claude Code extension) will have:

- **Commands:** Typing `/production-master`, `/grafana-query`, `/slack-search`, etc. is handled by the rule.
- **Pipeline:** Cursor's agent runs each step by following `agents/*.md` and writing to the same output paths.
- **MCPs:** All 9 servers in Cursor's MCP config.
- **Skills:** All 9 MCP skill docs in `.cursor/skills/` so the agent knows how to use the tools.

---

## Quick install (Cursor IDE only)

From the repo root:

```bash
bash scripts/install-cursor.sh
```

This will:

1. Create `.cursor/rules/production-master.mdc` so Cursor's agent knows the slash commands and workflow.
2. Copy `skills/` into `.cursor/skills/` and add `name` in frontmatter where needed.
3. Merge the 9 MCP servers from `mcp-servers.json` into your Cursor MCP config (prompts for your access key if needed).

Restart Cursor (or reload the window). Then in chat you can use `/production-master <TICKET-ID>`, `/grafana-query`, `/slack-search`, etc.; Cursor's built-in agent will follow the rule and run the pipeline.

---

## Optional: agent teams and hooks

- **Agent teams** (e.g. skeptic vs two hypothesis agents): The rule can tell Cursor's agent to "evaluate hypothesis A vs B, then play the skeptic role and write the verdict" in one or more turns.
- **Hooks** (`hooks/hooks.json`): Those are for the Claude Code plugin (e.g. post-run notifications). In Cursor IDE there's no direct equivalent; implement any behavior in the rule or via a script the agent runs.
