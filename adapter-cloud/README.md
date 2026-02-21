# Production Master — Cloud Adapter

> **Sibling adapters:** [Claude Code](../adapter-claude/README.md) | [Cursor](../adapter-cursor/README.md)

Cloud pipeline service for Production Master. Provides REST API, webhook-triggered investigations, worker-based execution, and persistent storage.

## Prerequisites

- Node.js 22+
- Docker and Docker Compose
- PostgreSQL 16+ (or use Docker Compose)
- Redis 7+ (or use Docker Compose)

## Quick Start

### Using Docker Compose (recommended)

```bash
cp .env.example .env
# Edit .env with your API keys

docker compose up -d
```

The API server will be available at `http://localhost:3000`.

### Local Development

```bash
cp .env.example .env
# Edit .env with your API keys

npm install
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled server |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Lint source files |
| `npm run typecheck` | Type-check without emitting |
| `npm run migrate` | Run database migrations |

## Project Structure

```
adapter-cloud/
  src/
    api/
      routes/          # Express route handlers
      middleware/       # Auth, validation, error handling
      webhooks/         # Webhook ingestion (Jira, Slack, alerts)
    orchestrator/       # Investigation pipeline orchestration
    workers/            # BullMQ worker definitions
    mcp/                # MCP client connections
    storage/
      models/           # Database models (pg)
    observability/      # OpenTelemetry, Prometheus metrics, logging
    config/             # Environment and runtime configuration
  helm/
    templates/          # Kubernetes Helm chart templates
  migrations/           # Database migration scripts
  tests/
    unit/               # Unit tests
    integration/        # Integration tests
    e2e/                # End-to-end tests
```

## Architecture

This adapter exposes the Production Master investigation engine as a cloud service:

- **REST API** for triggering and managing investigations
- **Webhooks** for event-driven triggers (Jira, Slack, alerting systems)
- **BullMQ workers** for async investigation execution
- **PostgreSQL** for investigation state and results
- **Redis** for job queues and caching
- **S3** for investigation artifact storage
- **OpenTelemetry** for distributed tracing
- **Prometheus** for metrics collection

## Key API Endpoints

- `POST /api/v1/investigate` — start investigation
- `GET /api/v1/investigations/:id` — investigation status
- `GET /api/v1/investigations/:id/report` — latest report
- `GET /api/v1/investigations/:id/similar` — semantically similar incidents (pgvector)
- `POST /api/v1/investigations/:id/feedback` — submit quality feedback
- `GET /api/v1/investigations/:id/bundle` — download debug bundle (`.zip`)

## Wix Deployment

When deployed to Wix infrastructure, this adapter uses:

- **Wix Serverless** — Express app wrapped in `FunctionsBuilder.addHttpService()`
- **SDM** — Secrets managed via ERB templates
- **Panorama** — Winston transport for structured logging
- **Base image** — `docker-repo.wixpress.com/com.wixpress.serverless.wix-serverless-latest`
- **Artifact** — `com.wixpress.b7.production-master`

Workers run as a separate plain Docker container (BullMQ, not request-scoped).

## Relationship to Shared Core

All core logic — agents, skills, orchestrator, output styles, domain config — lives in [`core/`](../core). This adapter wraps the shared engine with an HTTP API, webhook handlers, and background workers for headless investigation execution.

## Environment Variables

See `.env.example` for all required and optional configuration.
