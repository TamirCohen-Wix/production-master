/**
 * Express API server for production-master cloud pipeline.
 *
 * - Initializes tracing, metrics, database pool
 * - Mounts REST routes under /api/v1/
 * - Exposes /metrics for Prometheus scraping
 * - Graceful shutdown on SIGTERM / SIGINT
 */

import express from 'express';
import { initTracing, shutdownTracing, initMetrics, getMetricsEndpoint, createLogger } from '../observability/index.js';
import { McpRegistry } from '../mcp/registry.js';
import type { McpRegistry as McpRegistryInterface, McpServer, McpToolInfo, McpToolResult } from '../workers/tool-handler.js';
import { closePool } from '../storage/db.js';

// Middleware
import { authMiddleware } from './middleware/auth.js';

// Routes
import { investigateRouter, closeInvestigateQueue } from './routes/investigate.js';
import { batchRouter, closeBatchQueue } from './routes/batch.js';
import { investigationsRouter } from './routes/investigations.js';
import { queriesRouter, setQueryRegistry } from './routes/queries.js';
import { domainsRouter } from './routes/domains.js';
import { onboardingRouter } from './routes/onboarding.js';
import { similarRouter } from './routes/similar.js';
import { feedbackRouter } from './routes/feedback.js';
import { analyticsRouter } from './routes/analytics.js';
import { healthRouter, setHealthRegistry } from './routes/health.js';
import { metaRouter, setMetaRegistry } from './routes/meta.js';

// Webhooks
import { jiraWebhookRouter, closeJiraWebhookQueue, setJiraWebhookRegistry } from './webhooks/jira.js';
import { slackWebhookRouter, closeSlackQueue } from './webhooks/slack.js';
import { pagerdutyWebhookRouter, closePagerdutyQueue } from './webhooks/pagerduty.js';
import { grafanaAlertWebhookRouter, closeGrafanaAlertQueue } from './webhooks/grafana-alert.js';
import { cicdWebhookRouter, closeCicdQueues } from './webhooks/cicd.js';

// Health check route (authenticated)
import { healthCheckRouter, closeHealthCheckQueue } from './routes/health-check.js';

// Orchestrator
import { startEngine, stopEngine } from '../orchestrator/engine.js';

// Scheduled jobs
import { startScheduler, stopScheduler } from '../jobs/scheduler.js';
import { registerHealthCheckJob, setHealthCheckRegistry } from '../jobs/health-check.js';
import { registerStaleTicketReviewJob } from '../jobs/stale-ticket-review.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:server');

/**
 * Adapt the McpRegistry class to the McpRegistry interface expected by
 * tool-handler / orchestrator. Bridges the two different APIs.
 */
function adaptRegistry(registry: McpRegistry): McpRegistryInterface {
  // Build a tool-name -> server-name lookup cache
  const toolServerMap = new Map<string, string>();
  const serverCache = new Map<string, McpServer>();

  async function ensureClient(serverName: string): Promise<McpServer> {
    if (serverCache.has(serverName)) return serverCache.get(serverName)!;
    const client = await registry.getClient(serverName);
    const server: McpServer = {
      name: serverName,
      callTool: async (toolName: string, input: Record<string, unknown>) => {
        const result = await client.callTool(toolName, input);
        return result as McpToolResult;
      },
      listTools: async () => {
        const tools = await client.listTools();
        return tools as McpToolInfo[];
      },
    };
    serverCache.set(serverName, server);
    return server;
  }

  return {
    resolveServer(toolName: string): McpServer | undefined {
      const serverName = toolServerMap.get(toolName);
      return serverName ? serverCache.get(serverName) : undefined;
    },
    getServers(): McpServer[] {
      return [...serverCache.values()];
    },
    async listAllTools(): Promise<McpToolInfo[]> {
      const servers = registry.listServers();
      const allTools: McpToolInfo[] = [];
      for (const s of servers) {
        try {
          const server = await ensureClient(s.name);
          const tools = await server.listTools();
          for (const t of tools) {
            toolServerMap.set(t.name, s.name);
            allTools.push(t);
          }
        } catch {
          // Skip unhealthy servers
        }
      }
      return allTools;
    },
  };
}

// Initialize observability first (tracing must happen before other imports)
initTracing();
initMetrics();

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

const app = express();

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Health routes are unauthenticated
app.use('/', healthRouter);

// Prometheus metrics endpoint (unauthenticated for scraper access)
app.get('/metrics', getMetricsEndpoint);

// Webhook routes — authenticated via their own signature verification, not API keys
app.use('/api/v1/webhooks/jira', jiraWebhookRouter);
app.use('/api/v1/webhooks/slack', slackWebhookRouter);
app.use('/api/v1/webhooks/pagerduty', pagerdutyWebhookRouter);
app.use('/api/v1/webhooks/grafana-alert', grafanaAlertWebhookRouter);
app.use('/api/v1/webhooks/deploy', cicdWebhookRouter);

// All other /api/v1 routes require authentication
app.use('/api/v1', authMiddleware);

// Mount API routes
app.use('/api/v1/investigate', investigateRouter);
app.use('/api/v1/investigate/batch', batchRouter);
app.use('/api/v1/investigations', investigationsRouter);
app.use('/api/v1/investigations', similarRouter);
app.use('/api/v1/investigations', feedbackRouter);
app.use('/api/v1/analytics', analyticsRouter);
app.use('/api/v1/query', queriesRouter);
app.use('/api/v1/domains', domainsRouter);
app.use('/api/v1/onboard', onboardingRouter);
app.use('/api/v1/health-check', healthCheckRouter);
app.use('/api/v1/meta', metaRouter);

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.PORT ?? '3000', 10);

async function start(): Promise<void> {
  // Initialize MCP registry
  let mcpRegistry: McpRegistry;
  try {
    mcpRegistry = new McpRegistry();
    log.info('MCP registry initialized');
  } catch (err) {
    log.warn('MCP registry initialization failed — starting without MCP', {
      error: err instanceof Error ? err.message : String(err),
    });
    mcpRegistry = new McpRegistry([]);
  }

  // Inject registry into modules that need it
  setQueryRegistry(mcpRegistry);
  setHealthRegistry(mcpRegistry);
  setJiraWebhookRegistry(mcpRegistry);

  // Build the adapted registry for the orchestrator (bridges class -> interface)
  const adaptedRegistry = adaptRegistry(mcpRegistry);

  // Inject adapted registry into meta-analysis routes
  setMetaRegistry(adaptedRegistry);

  // Start orchestrator engine (BullMQ worker)
  try {
    startEngine(adaptedRegistry);
    log.info('Orchestrator engine started');
  } catch (err) {
    log.warn('Orchestrator engine failed to start', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Start scheduled jobs (health check, stale ticket review)
  try {
    setHealthCheckRegistry(mcpRegistry);
    registerHealthCheckJob();
    registerStaleTicketReviewJob();
    await startScheduler();
    log.info('Scheduled jobs started');
  } catch (err) {
    log.warn('Scheduled jobs failed to start', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Start HTTP server
  const server = app.listen(PORT, () => {
    log.info(`Server listening on port ${PORT}`, {
      port: PORT,
      node_env: process.env.NODE_ENV ?? 'development',
    });
  });

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down gracefully...`);

    // Stop accepting new connections
    server.close(() => {
      log.info('HTTP server closed');
    });

    try {
      // Stop orchestrator worker
      await stopEngine();
      log.info('Orchestrator engine stopped');
    } catch (err) {
      log.error('Error stopping orchestrator', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      // Stop scheduled jobs
      await stopScheduler();
      log.info('Scheduled jobs stopped');
    } catch (err) {
      log.error('Error stopping scheduled jobs', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      // Close BullMQ queues
      await closeInvestigateQueue();
      await closeBatchQueue();
      await closeJiraWebhookQueue();
      await closeSlackQueue();
      await closePagerdutyQueue();
      await closeGrafanaAlertQueue();
      await closeCicdQueues();
      await closeHealthCheckQueue();
      log.info('Investigation queues closed');
    } catch (err) {
      log.error('Error closing investigation queues', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      // Disconnect MCP clients
      await mcpRegistry.disconnectAll();
      log.info('MCP clients disconnected');
    } catch (err) {
      log.error('Error disconnecting MCP clients', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      // Close database pool
      await closePool();
      log.info('Database pool closed');
    } catch (err) {
      log.error('Error closing database pool', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      // Flush pending spans and shut down the OpenTelemetry SDK
      await shutdownTracing();
      log.info('Tracing shut down');
    } catch (err) {
      log.error('Error shutting down tracing', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
}

start().catch((err) => {
  log.error('Server startup failed', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});

export { app };
