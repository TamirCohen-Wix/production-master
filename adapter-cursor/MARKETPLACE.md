# Production Master

> Autonomous production investigation pipeline — part of the [Production Master platform](https://github.com/TamirCohen-Wix/production-master)

Production Master is an AI-powered investigation framework that automates the end-to-end process of diagnosing production incidents. It orchestrates a fleet of specialized agents that collect data from multiple sources, form and test hypotheses, and produce structured investigation reports with root-cause analysis and actionable fix recommendations.

## Features

- **12 specialized agents** -- bug-context, production-analyzer, grafana-analyzer, slack-analyzer, codebase-semantics, artifact-resolver, hypotheses, verifier, fix-list, documenter, publisher, and orchestrator
- **9 MCP integrations** -- Grafana, Jira, Slack, GitHub, Sentry, PagerDuty, Datadog, Linear, and custom datasource connectors
- **Hypothesis loops** -- automated hypothesis generation, evidence scoring, and iterative refinement until root cause is confirmed or all leads are exhausted
- **Multi-source data collection** -- correlates metrics, logs, traces, deployment events, code changes, Slack threads, and ticket history into a unified investigation context
- **Structured output** -- produces markdown reports with severity assessment, timeline reconstruction, evidence citations, and confidence scores
- **Investigation guardrails** -- enforces citation requirements, prevents hallucinated conclusions, and requires evidence thresholds before confirming root causes
- **Model tiering** -- routes tasks to appropriate model tiers (fast/balanced/deep) based on complexity
- **Cursor-native experience** -- rules, commands, agents, and hooks designed for the Cursor IDE workflow

## Requirements

- **Cursor IDE** version 0.40 or later
- **Environment variable:** `PRODUCTION_MASTER_ACCESS_KEY` must be set with a valid access key
- MCP server credentials for the data sources relevant to your environment (Grafana, Jira, Slack, etc.)

## Installation

1. Clone the production-master repository:
   ```bash
   git clone https://github.com/TamirCohen-Wix/production-master.git
   ```

2. Copy or symlink the `adapter-cursor/` directory into your target project:
   ```bash
   cp -r production-master/adapter-cursor/.cursor-plugin /path/to/your/project/
   cp -r production-master/adapter-cursor/rules /path/to/your/project/.cursor/rules
   cp -r production-master/adapter-cursor/agents /path/to/your/project/.cursor/agents
   cp -r production-master/adapter-cursor/commands /path/to/your/project/.cursor/commands
   ```

3. Configure MCP servers by copying `.mcp.json` to your project root and filling in credentials:
   ```bash
   cp production-master/adapter-cursor/.mcp.json /path/to/your/project/.mcp.json
   ```

4. Set the access key:
   ```bash
   export PRODUCTION_MASTER_ACCESS_KEY="your-key-here"
   ```

5. Open the project in Cursor and verify rules appear in Cursor settings.

## Usage

Run `/production-master` with a Jira ticket or incident description to start an investigation. The pipeline executes sequentially through data collection, hypothesis generation, verification, and report generation.

## Screenshots

<!-- Screenshots will be added before marketplace submission -->

- `assets/screenshots/command-palette.png` -- Command palette showing available commands
- `assets/screenshots/investigation-running.png` -- Investigation pipeline in progress
- `assets/screenshots/report-output.png` -- Final investigation report
- `assets/screenshots/mcp-tools.png` -- MCP tool integrations in action
