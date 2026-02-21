# Staging Deployment Validation Checklist

Use this checklist before promoting a staging build to production.
Every item must pass before merge or release sign-off.

## Deployment

- [ ] Deploy to staging K8s namespace (`production-master-staging`) via `scripts/deploy-staging.sh`
- [ ] All pods report `Running` and pass readiness probes
- [ ] Database migrations applied without errors (`scripts/run-migrations.sh`)

## API Smoke Tests

- [ ] `GET /health` returns `200 OK`
- [ ] `GET /ready` returns `200 OK`
- [ ] `POST /api/v1/investigate` against a real Jira ticket returns a valid investigation ID

## Agent Execution

- [ ] Verify all 12 agents execute successfully for a sample investigation
- [ ] Each agent produces structured evidence output
- [ ] No agent times out or enters a retry loop

## MCP Server Connectivity

- [ ] Verify all 9 MCP servers are accessible via service account
- [ ] Each MCP server responds to health probe within SLA (< 2 s)
- [ ] Fallback behavior triggers correctly when a server is unreachable

## Data Persistence

- [ ] PostgreSQL state tracks all investigation phases correctly (`investigations`, `agent_runs` tables)
- [ ] Phase transitions recorded with correct timestamps
- [ ] Reports stored in object storage (S3/GCS) and retrievable by investigation ID

## Observability

- [ ] Prometheus metrics available at `GET /metrics`
- [ ] Key counters increment on each investigation (`pm_investigations_total`, `pm_agent_runs_total`)
- [ ] OpenTelemetry traces exported and visible in trace backend

## Quality Gate

- [ ] Compare output quality against Claude Code plugin output for the same Jira ticket
- [ ] Evidence completeness score >= baseline threshold
- [ ] No regressions in root-cause accuracy vs. previous staging build
