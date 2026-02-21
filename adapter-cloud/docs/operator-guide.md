# Production Master Cloud -- Operator Guide

This guide covers deployment, configuration, monitoring, and maintenance of the production-master cloud adapter.

## Deployment Prerequisites

Before deploying production-master, ensure the following infrastructure is available:

- **Kubernetes** (1.27+) -- cluster with RBAC enabled and `kubectl` configured
- **PostgreSQL** (15+) -- primary data store for investigations, domain configs, and audit logs
- **Redis** (7+) -- used by BullMQ for job queues (investigation, batch, webhook processing)
- **HashiCorp Vault** (or compatible) -- secret storage for API keys and MCP credentials
- **S3-compatible object store** -- for investigation artifact storage (reports, logs)
- **Helm** (3.12+) -- for chart-based deployment

Optional but recommended:

- **Prometheus** + **Grafana** -- for metrics collection and dashboarding
- **OpenTelemetry Collector** -- for distributed tracing
- **Ingress controller** (nginx-ingress recommended) -- for external HTTP access

## Environment Variables Reference

All configuration is passed via environment variables. Secrets should be injected from Vault or Kubernetes Secrets -- never hardcoded.

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@postgres:5432/production_master` |
| `REDIS_URL` | Yes | Redis connection string for BullMQ | `redis://redis:6379` |
| `S3_BUCKET` | Yes | S3 bucket name for artifact storage | `pm-artifacts-prod` |
| `ANTHROPIC_API_KEY` | Yes | API key for Claude LLM calls | `sk-ant-...` |
| `VAULT_ADDR` | Yes | HashiCorp Vault address | `https://vault.internal:8200` |
| `JWT_SECRET` | Yes | Secret for signing/verifying JWT tokens | (random 256-bit string) |
| `API_KEYS` | Yes | Comma-separated list of valid API keys | `key1,key2,key3` |
| `MCP_ACCESS_KEY` | Yes | Access key for MCP server authentication | `mcp-...` |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | No | OpenTelemetry collector endpoint | `http://otel-collector:4318` |
| `OPENAI_API_KEY` | No | OpenAI API key (fallback LLM provider) | `sk-...` |
| `JIRA_PROJECT_FILTER` | No | Comma-separated Jira project keys to accept | `SCHED,BOOK,PAY` |
| `SLACK_SIGNING_SECRET` | No | Slack webhook signature verification secret | `v0=...` |
| `PAGERDUTY_WEBHOOK_SECRET` | No | PagerDuty webhook HMAC secret | (256-bit hex string) |
| `JIRA_WEBHOOK_SECRET` | No | Jira webhook shared secret | (random string) |
| `HEALTH_CHECK_THRESHOLD_MULTIPLIER` | No | Multiplier for health check thresholds (default: 1.0) | `1.5` |
| `POST_DEPLOY_CHECK_DELAY_MS` | No | Delay before post-deploy health checks (default: 30000) | `60000` |
| `PORT` | No | HTTP listen port (default: 3000) | `3000` |
| `NODE_ENV` | No | Node environment (default: production) | `production` |
| `LOG_LEVEL` | No | Logging level (default: info) | `debug` |

## Helm Values

The Helm chart is located at `adapter-cloud/helm/`. Deploy with:

```bash
helm install production-master ./helm \
  -f helm/values-production.yaml \
  --namespace production-master \
  --create-namespace
```

### Key values explained

| Value | Default | Description |
|-------|---------|-------------|
| `replicaCount.api` | 2 | Number of API server replicas |
| `replicaCount.orchestrator` | 1 | Number of orchestrator replicas (should be 1 for leader election) |
| `replicaCount.worker` | 3 | Number of investigation worker replicas |
| `image.repository` | `production-master` | Docker image repository |
| `image.tag` | `latest` | Image tag; override per environment |
| `service.port` | 3000 | Kubernetes Service port |
| `ingress.enabled` | true | Enable ingress resource |
| `ingress.host` | `production-master.example.com` | Ingress hostname |
| `resources.api.requests.cpu` | 250m | API server CPU request |
| `resources.api.limits.memory` | 512Mi | API server memory limit |
| `resources.worker.requests.cpu` | 500m | Worker CPU request |
| `resources.worker.limits.memory` | 1Gi | Worker memory limit |
| `hpa.enabled` | true | Enable Horizontal Pod Autoscaler |
| `hpa.minReplicas` | 1 | Minimum replica count for HPA |
| `hpa.maxReplicas` | 10 | Maximum replica count for HPA |
| `hpa.targetCPUUtilizationPercentage` | 70 | CPU target for autoscaling |
| `postgresql.host` | `postgres` | PostgreSQL hostname |
| `postgresql.database` | `production_master` | Database name |
| `redis.host` | `redis` | Redis hostname |

### Environment overrides

Use `values-staging.yaml` or `values-production.yaml` to override defaults per environment:

```bash
# Staging
helm upgrade production-master ./helm -f helm/values-staging.yaml

# Production
helm upgrade production-master ./helm -f helm/values-production.yaml
```

## Monitoring

### Grafana Dashboards

Pre-built dashboards are located at `adapter-cloud/dashboards/`:

- **`production-master.json`** -- Main operational dashboard covering:
  - Investigation throughput and latency (p50, p95, p99)
  - Verdict distribution (ROOT_CAUSE, INCONCLUSIVE, etc.)
  - MCP tool call success/error rates per server
  - LLM token usage and cost tracking
  - Queue depth and processing rates
  - HTTP request rates and error codes

Import dashboards into Grafana via the UI or provision them with Grafana's dashboard provisioner.

### Prometheus Alerts

Alert rules are defined at `adapter-cloud/alerts/rules.yaml`. The following alerts are configured:

| Alert | Severity | Condition | Description |
|-------|----------|-----------|-------------|
| `HighInvestigationFailureRate` | warning | INCONCLUSIVE rate > 30% over 1h | Too many investigations failing to reach a conclusion |
| `LongInvestigation` | warning | p95 duration > 20 min | Investigations taking too long |
| `MCPServerDown` | critical | Error rate > 50% for 5 min | An MCP server is unhealthy |
| `HighTokenUsage` | warning | LLM spend > $10/hr | Unusual LLM cost spike |
| `QueueBacklog` | warning | Queue depth > 20 for 10 min | Investigations are backing up |

Load the alert rules into Prometheus:

```yaml
# prometheus.yml
rule_files:
  - /etc/prometheus/rules/production-master-rules.yaml
```

### Metrics Endpoint

The `/metrics` endpoint (unauthenticated) exposes Prometheus-format metrics. All custom metrics use the `pm_` prefix.

## Troubleshooting Common Issues

### Investigation queue is growing but not draining

1. Check that worker pods are running: `kubectl get pods -l component=worker`
2. Verify Redis connectivity: `kubectl exec -it <api-pod> -- redis-cli -u $REDIS_URL ping`
3. Check worker logs for errors: `kubectl logs -l component=worker --tail=100`
4. Ensure the orchestrator engine started: look for `Orchestrator engine started` in API logs

### MCP server connection failures

1. Check `MCPServerDown` alert details for the affected server name
2. Verify MCP_ACCESS_KEY is correctly set in Vault
3. Test MCP connectivity from a worker pod: check `/healthz` of the MCP server
4. Review MCP registry initialization logs for skip messages

### High INCONCLUSIVE rate

1. Check if a specific domain is producing most INCONCLUSIVE verdicts (filter by domain in Grafana)
2. Verify the domain config has correct service names and artifact IDs
3. Check that the Jira project key matches and tickets have sufficient context
4. Review the investigation reports in S3 for common failure patterns

### Database connection errors

1. Check PostgreSQL pod health: `kubectl get pods -l app=postgresql`
2. Verify `DATABASE_URL` is correct and the database exists
3. Check connection pool exhaustion: look for `pool error` in API logs
4. Run pending migrations: `./scripts/run-migrations.sh`

### Authentication failures (401)

1. Verify `API_KEYS` env var contains the expected keys
2. For JWT: ensure `JWT_SECRET` matches between token issuer and production-master
3. Check that the `x-api-key` header or `Authorization: Bearer` header is being sent correctly

### Webhook delivery failures

1. Verify the signing secret matches for the webhook source (Jira, Slack, PagerDuty)
2. Check that the webhook URL is reachable from the source system
3. Look at webhook route logs for signature verification failures

## Scaling Guidelines

### Horizontal scaling

- **API servers**: Scale based on request rate. The HPA targets 70% CPU by default. For high webhook volume, increase `replicaCount.api` or lower the HPA target.
- **Workers**: Scale based on queue depth. Each worker processes one investigation at a time. Add workers if `QueueBacklog` alert fires frequently.
- **Orchestrator**: Keep at 1 replica. The orchestrator uses BullMQ's built-in concurrency.

### Vertical scaling

- Workers are the most resource-intensive component. If investigations are slow, increase worker memory/CPU limits.
- API servers are lightweight; 512Mi memory is sufficient for most workloads.

### Database scaling

- Add read replicas for query-heavy workloads (investigations list, domain lookups)
- Increase `max` connections in the pool if connection timeout errors occur (default: 20)
- Partition the `investigations` table by `created_at` if it grows beyond 10M rows

### Redis scaling

- Redis Sentinel or Redis Cluster for HA
- Ensure sufficient memory for the job queue; each job is small (~2KB) but long backlogs add up

## Backup and Recovery

### Database backups

Schedule daily `pg_dump` backups:

```bash
pg_dump -Fc -h $PG_HOST -U $PG_USER production_master > backup-$(date +%Y%m%d).dump
```

Restore from backup:

```bash
pg_restore -h $PG_HOST -U $PG_USER -d production_master backup-20260221.dump
```

### S3 artifact backups

Investigation artifacts in S3 are the source of truth for completed investigation reports. Enable S3 versioning and lifecycle policies:

- Keep current versions indefinitely (or per compliance requirements)
- Move non-current versions to S3-IA after 30 days
- Delete non-current versions after 90 days

### Redis recovery

Redis data is transient (job queues). If Redis is lost:

1. Restart Redis
2. In-flight investigations will be retried automatically by BullMQ (jobs have retry policies)
3. No manual intervention required; queued but unprocessed jobs will need to be re-submitted

### Disaster recovery checklist

1. Restore PostgreSQL from the latest backup
2. Verify S3 bucket and artifacts are accessible
3. Re-deploy via Helm with the same values
4. Verify `/healthz` and `/readyz` endpoints return healthy
5. Run a test investigation to confirm end-to-end functionality
