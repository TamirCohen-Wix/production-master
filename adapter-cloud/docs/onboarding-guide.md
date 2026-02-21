# Production Master Cloud -- Onboarding Guide

This guide walks you through onboarding a new team or repository to production-master. By the end, you will have a working domain configuration and webhooks connected for automated investigations.

## Overview

Onboarding has three steps:

1. **Discover** -- Let the wizard auto-detect your repo structure
2. **Review and customize** -- Edit the generated draft config
3. **Confirm** -- Save the config and set up webhook integrations

## Creating a domain.json for Your Team

A domain configuration (domain.json) tells production-master everything it needs to know about your repository: what services it contains, how they are built, and where to find context (Jira, Slack, Grafana).

### Using the onboarding wizard (recommended)

The fastest way to get started is with the auto-discovery endpoint:

```bash
curl -X POST https://your-pm-instance/api/v1/onboard \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "github_repo": "your-org/your-repo",
    "jira_project": "PROJ"
  }'
```

This returns a draft config with auto-detected values:

```json
{
  "draft": {
    "company": "your-org",
    "division": "your-repo",
    "side": "Server",
    "repo": "your-repo",
    "github_org": "your-org",
    "github_repo": "your-org/your-repo",
    "jira_project": "PROJ",
    "artifact_prefix": "com.yourorg.your.repo",
    "primary_services": [
      { "name": "your-repo", "artifact_id": "com.yourorg.your.repo.your-repo" }
    ],
    "language": "typescript",
    "build_system": "npm",
    "monorepo": false
  },
  "detected": {
    "language": "typescript",
    "build_system": "npm",
    "monorepo": false,
    "services": ["your-repo"]
  }
}
```

Review the draft, adjust any values that need correction, then confirm:

```bash
curl -X POST https://your-pm-instance/api/v1/onboard/confirm \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "config": {
      "company": "your-org",
      "division": "your-repo",
      "side": "Server",
      "repo": "your-repo",
      "github_org": "your-org",
      "github_repo": "your-org/your-repo",
      "jira_project": "PROJ",
      "artifact_prefix": "com.yourorg.your.repo",
      "primary_services": [
        { "name": "api-service", "artifact_id": "com.yourorg.your.repo.api-service" },
        { "name": "worker-service", "artifact_id": "com.yourorg.your.repo.worker-service" }
      ],
      "language": "typescript",
      "build_system": "npm",
      "monorepo": true
    }
  }'
```

The response confirms onboarding:

```json
{
  "domain_id": "abc123-...",
  "status": "onboarded"
}
```

### Manual creation via the domains API

You can also create a domain config directly:

```bash
curl -X POST https://your-pm-instance/api/v1/domains \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "name": "my-service",
    "description": "Domain config for my-org/my-service",
    "services": ["my-service"],
    "mcp_servers": [],
    "settings": { ... full domain.json contents ... }
  }'
```

## Required vs Optional Fields

### Required fields

These fields must be present for production-master to function:

| Field | Description | Example |
|-------|-------------|---------|
| `company` | Company or organization name | `"Wix"` |
| `division` | Business division or team | `"Bookings"` |
| `side` | Code side: Server or Client | `"Server"` |
| `repo` | Short repository name | `"scheduler"` |
| `github_org` | GitHub organization | `"wix-private"` |
| `github_repo` | Full org/repo path | `"wix-private/scheduler"` |
| `jira_project` | Jira project key | `"SCHED"` |
| `artifact_prefix` | Maven/Bazel artifact group prefix | `"com.wixpress.bookings"` |
| `primary_services` | Array of service objects (name + artifact_id) | See below |

Each entry in `primary_services` requires:

```json
{
  "name": "bookings-service",
  "artifact_id": "com.wixpress.bookings.bookings-service"
}
```

### Optional fields

These fields enhance production-master's analysis but are not strictly required:

| Field | Description | Example |
|-------|-------------|---------|
| `jira_url` | Base Jira instance URL | `"https://wix.atlassian.net"` |
| `slack_channels.alerts` | Slack alerts channel | `"#bookings-alerts"` |
| `slack_channels.dev` | Slack dev channel | `"#bookings-dev"` |
| `slack_channels.incidents` | Slack incidents channel | `"#bookings-incidents"` |
| `toggle_prefix` | Feature toggle namespace | `"specs.bookings"` |
| `grafana_url` | Grafana base URL | `"https://grafana.wixpress.com"` |
| `grafana_app_analytics_dashboard` | Grafana dashboard ID | `"olcdJbinz"` |
| `request_id_format` | Request ID format pattern | `"<unix_timestamp>.<random>"` |
| `language` | Primary programming language | `"scala"` |
| `build_system` | Build system | `"bazel"` |
| `monorepo` | Whether this is a monorepo | `true` |

## Configuring Webhooks

Webhooks allow production-master to automatically trigger investigations when events occur in your project.

### Jira Webhook

Set up a Jira webhook to trigger investigations on new bug tickets:

1. Go to Jira Settings > System > WebHooks
2. Create a new webhook:
   - **URL**: `https://your-pm-instance/api/v1/webhooks/jira`
   - **Events**: Issue created, Issue updated
   - **JQL filter**: `project = PROJ AND issuetype = Bug`
3. Set a shared secret and configure `JIRA_WEBHOOK_SECRET` in your production-master environment
4. Optionally set `JIRA_PROJECT_FILTER` to restrict which projects are accepted

### Slack Webhook

Connect Slack for interactive investigation commands:

1. Create a Slack App at https://api.slack.com/apps
2. Enable Slash Commands:
   - **Command**: `/investigate`
   - **Request URL**: `https://your-pm-instance/api/v1/webhooks/slack`
3. Copy the Signing Secret and set it as `SLACK_SIGNING_SECRET`
4. Install the app to your workspace and invite it to relevant channels

### PagerDuty Webhook

Trigger investigations from PagerDuty incidents:

1. Go to PagerDuty > Services > your service > Integrations
2. Add a Generic Webhook (v3):
   - **Endpoint URL**: `https://your-pm-instance/api/v1/webhooks/pagerduty`
   - **Events**: `incident.triggered`
3. Copy the webhook secret and set it as `PAGERDUTY_WEBHOOK_SECRET`

## Testing Your Config with a Manual Investigation

After onboarding, verify everything works by running a manual investigation:

### Step 1: Confirm your domain is registered

```bash
curl -s https://your-pm-instance/api/v1/domains \
  -H "x-api-key: YOUR_API_KEY" | jq '.data[] | select(.name == "your-repo")'
```

### Step 2: Submit a test investigation

Use a real Jira ticket ID from your project:

```bash
curl -X POST https://your-pm-instance/api/v1/investigate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "ticket_id": "PROJ-123",
    "domain": "your-repo",
    "mode": "fast"
  }'
```

### Step 3: Check investigation status

```bash
curl -s https://your-pm-instance/api/v1/investigations \
  -H "x-api-key: YOUR_API_KEY" | jq '.data[0]'
```

### Step 4: Verify results

A successful investigation will have:

- `status`: `"completed"`
- `verdict`: one of `ROOT_CAUSE`, `PROBABLE_CAUSE`, `CONTRIBUTING_FACTOR`, or `INCONCLUSIVE`
- `summary`: a human-readable explanation
- `evidence`: list of supporting evidence gathered from MCP tools

### Troubleshooting test failures

- **404 on domain lookup**: Ensure the domain name in the investigate request matches the registered domain name.
- **INCONCLUSIVE verdict**: This is expected for simple or informational tickets. Try with a ticket that describes an actual production issue.
- **Timeout**: The `fast` mode should complete within 2-3 minutes. If not, check worker pod health and queue depth.
- **MCP errors in logs**: Verify that MCP servers are reachable from the worker pods and that `MCP_ACCESS_KEY` is set.
