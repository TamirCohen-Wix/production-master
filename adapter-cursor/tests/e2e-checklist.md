# Cursor Adapter End-to-End Validation Checklist

Manual testing checklist for validating the Cursor adapter before marketplace submission.

## Pre-submission Validation

- [ ] Open Cursor IDE with adapter-cursor/ loaded
- [ ] Verify .mdc rules appear in Cursor settings
- [ ] Run /production-master with a test ticket
- [ ] Verify phases execute sequentially
- [ ] Verify hypothesis loop runs without agent teams
- [ ] Verify MCP tools callable (grafana-datasource, jira, slack)
- [ ] Verify output files in .cursor/debug/
- [ ] Compare report quality against Claude Code output
- [ ] Submit to cursor.com/marketplace/publish (manual step)

## Environment Setup

- [ ] PRODUCTION_MASTER_ACCESS_KEY is set
- [ ] MCP server credentials are configured in .mcp.json
- [ ] Cursor IDE version is 0.40 or later

## Agent Validation

- [ ] bug-context agent loads and responds
- [ ] production-analyzer agent queries metrics
- [ ] grafana-analyzer agent connects to Grafana
- [ ] slack-analyzer agent searches Slack channels
- [ ] codebase-semantics agent parses codebase
- [ ] hypotheses agent generates hypothesis list
- [ ] verifier agent scores evidence
- [ ] fix-list agent produces actionable fixes
- [ ] documenter agent formats final report
- [ ] publisher agent outputs to correct paths

## Command Validation

- [ ] /production-master starts full pipeline
- [ ] /production-master-report generates summary
- [ ] /grafana-query executes datasource queries
- [ ] /slack-search returns relevant threads
- [ ] /resolve-artifact resolves artifact references
- [ ] /production-changes lists recent deployments
- [ ] /fire-console opens debug console
- [ ] /update-context refreshes investigation context
- [ ] /git-update-agents pulls latest agent configs

## Rule Validation

- [ ] investigation-guardrails.mdc enforces citation rules
- [ ] model-tiering.mdc routes to correct model tier
- [ ] output-conventions.mdc formats output correctly
- [ ] mcp-usage.mdc validates MCP tool calls

## Output Quality

- [ ] Report contains severity assessment
- [ ] Report contains timeline reconstruction
- [ ] Report contains evidence citations with confidence scores
- [ ] Report contains root-cause analysis
- [ ] Report contains fix recommendations
- [ ] Output matches Claude Code adapter quality baseline
