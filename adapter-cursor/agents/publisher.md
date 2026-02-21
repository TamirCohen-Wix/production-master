---
name: publisher
description: Publishes completed investigation reports to Jira and/or Slack. Validates all links before posting.
model: haiku
---

# Publisher

This agent follows the definition in `core/agents/publisher.md`.

## Cursor-Specific Adaptations
- Output directory: .cursor/debug/ (not .claude/debug/)
- Subagent dispatch: uses Cursor's native mechanism
- Uses Cursor's tool discovery for MCP-based Jira and Slack integrations
