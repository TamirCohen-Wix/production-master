/**
 * Standalone BullMQ Worker Entry Point
 *
 * Runs the orchestrator engine and scheduled jobs as a standalone process,
 * separate from the Express API server. This is the entry point used by
 * Dockerfile.worker and the Helm worker deployment.
 *
 * Lifecycle:
 *   1. Initialize tracing + metrics
 *   2. Create MCP registry
 *   3. Start orchestrator engine (BullMQ worker for "investigations" queue)
 *   4. Start scheduled jobs (health-check, stale-ticket-review, knowledge-lifecycle)
 *   5. Handle graceful shutdown on SIGTERM/SIGINT
 */

import { initTracing, shutdownTracing, initMetrics, createLogger } from '../observability/index.js';
import { McpRegistry } from '../mcp/registry.js';
import type { McpRegistry as McpRegistryInterface, McpServer, McpToolInfo, McpToolResult } from './tool-handler.js';
import { closePool } from '../storage/db.js';

// Orchestrator
import { startEngine, stopEngine } from '../orchestrator/engine.js';

// Scheduled jobs
import { startScheduler, stopScheduler } from '../jobs/scheduler.js';
import { registerHealthCheckJob, setHealthCheckRegistry } from '../jobs/health-check.js';
import { registerStaleTicketReviewJob } from '../jobs/stale-ticket-review.js';
import { registerKnowledgeLifecycleJob } from '../jobs/knowledge-lifecycle.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Initialize observability first (tracing must happen before other imports)
initTracing();
initMetrics();

const log = createLogger('worker');

// ---------------------------------------------------------------------------
// Registry adapter (mirrors server.ts pattern)
// ---------------------------------------------------------------------------

function adaptRegistry(registry: McpRegistry): McpRegistryInterface {
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

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

async function start(): Promise<void> {
  log.info('Worker process starting...');

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

  // Build adapted registry for the orchestrator
  const adaptedRegistry = adaptRegistry(mcpRegistry);

  // Start orchestrator engine (BullMQ worker)
  try {
    startEngine(adaptedRegistry);
    log.info('Orchestrator engine started');
  } catch (err) {
    log.warn('Orchestrator engine failed to start', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Start scheduled jobs
  try {
    setHealthCheckRegistry(mcpRegistry);
    registerHealthCheckJob();
    registerStaleTicketReviewJob();
    registerKnowledgeLifecycleJob();
    await startScheduler();
    log.info('Scheduled jobs started');
  } catch (err) {
    log.warn('Scheduled jobs failed to start', {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  log.info('Worker process ready');

  // --- Graceful shutdown ---
  const shutdown = async (signal: string) => {
    log.info(`Received ${signal}, shutting down gracefully...`);

    try {
      await stopEngine();
      log.info('Orchestrator engine stopped');
    } catch (err) {
      log.error('Error stopping orchestrator', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await stopScheduler();
      log.info('Scheduled jobs stopped');
    } catch (err) {
      log.error('Error stopping scheduled jobs', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await mcpRegistry.disconnectAll();
      log.info('MCP clients disconnected');
    } catch (err) {
      log.error('Error disconnecting MCP clients', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
      await closePool();
      log.info('Database pool closed');
    } catch (err) {
      log.error('Error closing database pool', {
        error: err instanceof Error ? err.message : String(err),
      });
    }

    try {
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
  log.error('Worker startup failed', {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
