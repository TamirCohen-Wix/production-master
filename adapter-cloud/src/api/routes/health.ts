/**
 * Health check endpoints:
 *   GET /health   — liveness probe (always 200 if process is running)
 *   GET /ready    — readiness probe (checks DB + MCP connectivity)
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { McpRegistry } from '../../mcp/registry.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:health');

let registry: McpRegistry | undefined;

/**
 * Set the MCP registry used for readiness checks.
 * Must be called once during server startup.
 */
export function setHealthRegistry(r: McpRegistry): void {
  registry = r;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const healthRouter = Router();

// --- GET /health — liveness ---
healthRouter.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime_seconds: Math.floor(process.uptime()),
  });
});

// --- GET /ready — readiness ---
healthRouter.get('/ready', async (_req, res) => {
  const checks: Record<string, { healthy: boolean; error?: string }> = {};

  // Check database
  try {
    await query('SELECT 1');
    checks.database = { healthy: true };
  } catch (err) {
    checks.database = {
      healthy: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Check MCP servers
  if (registry) {
    try {
      const mcpHealth = await registry.healthCheck();
      checks.mcp = {
        healthy: mcpHealth.healthy,
        ...(mcpHealth.healthy ? {} : { error: 'One or more MCP servers unhealthy' }),
      };
    } catch (err) {
      checks.mcp = {
        healthy: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  } else {
    checks.mcp = { healthy: false, error: 'MCP registry not initialized' };
  }

  const allHealthy = Object.values(checks).every((c) => c.healthy);
  const statusCode = allHealthy ? 200 : 503;

  if (!allHealthy) {
    log.warn('Readiness check failed', { checks });
  }

  res.status(statusCode).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});
