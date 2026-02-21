/**
 * Health Check Job — Hourly MCP server connectivity verification.
 *
 * Probes all registered MCP servers via the McpRegistry.healthCheck() method,
 * records results to Prometheus metrics, and logs alerts for degraded services.
 *
 * Environment variables:
 *   HEALTH_CHECK_CRON             — Override schedule (default: hourly)
 *   HEALTH_CHECK_ALERT_THRESHOLD  — Minimum degraded servers to trigger alert (default: 1)
 */

import type { Job } from 'bullmq';
import type { McpRegistry } from '../mcp/registry.js';
import { createLogger } from '../observability/index.js';
import { Gauge, Counter } from 'prom-client';
import { register } from '../observability/metrics.js';
import { registerJob } from './scheduler.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HealthCheckResult {
  timestamp: string;
  healthy: boolean;
  totalServers: number;
  healthyCount: number;
  degradedCount: number;
  servers: ServerStatus[];
}

export interface ServerStatus {
  name: string;
  type: string;
  healthy: boolean;
  circuitState: string;
  lastError?: string;
}

// ---------------------------------------------------------------------------
// Metrics
// ---------------------------------------------------------------------------

/** Gauge tracking the health status of each MCP server (1 = healthy, 0 = degraded). */
export const pmMcpServerHealth = new Gauge({
  name: 'pm_mcp_server_health',
  help: 'MCP server health status (1 = healthy, 0 = degraded)',
  labelNames: ['server', 'type'] as const,
  registers: [register],
});

/** Counter for health check executions. */
export const pmHealthCheckRunsTotal = new Counter({
  name: 'pm_health_check_runs_total',
  help: 'Total scheduled health check executions',
  labelNames: ['result'] as const,
  registers: [register],
});

/** Counter for degraded server alerts. */
export const pmHealthCheckAlertsTotal = new Counter({
  name: 'pm_health_check_alerts_total',
  help: 'Total health check alerts for degraded MCP servers',
  registers: [register],
});

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('jobs:health-check');

const ALERT_THRESHOLD = parseInt(process.env.HEALTH_CHECK_ALERT_THRESHOLD ?? '1', 10);

// ---------------------------------------------------------------------------
// Job handler
// ---------------------------------------------------------------------------

let mcpRegistryRef: McpRegistry | undefined;

/**
 * Set the MCP registry reference used by the health check job.
 * Must be called before the scheduler starts.
 */
export function setHealthCheckRegistry(registry: McpRegistry): void {
  mcpRegistryRef = registry;
}

/**
 * Execute a health check against all registered MCP servers.
 *
 * Exported for direct invocation in tests and the API health-check route.
 */
export async function executeHealthCheck(): Promise<HealthCheckResult> {
  if (!mcpRegistryRef) {
    throw new Error('MCP registry not initialized for health check job');
  }

  const result = await mcpRegistryRef.healthCheck();

  const servers: ServerStatus[] = result.servers.map((s) => ({
    name: s.name,
    type: s.type,
    healthy: s.healthy,
    circuitState: s.circuitState,
    lastError: s.lastError,
  }));

  const healthyCount = servers.filter((s) => s.healthy).length;
  const degradedCount = servers.filter((s) => !s.healthy).length;

  // Update per-server Prometheus gauges
  for (const server of servers) {
    pmMcpServerHealth.set(
      { server: server.name, type: server.type },
      server.healthy ? 1 : 0,
    );
  }

  const checkResult: HealthCheckResult = {
    timestamp: new Date().toISOString(),
    healthy: result.healthy,
    totalServers: servers.length,
    healthyCount,
    degradedCount,
    servers,
  };

  // Log results
  if (result.healthy) {
    pmHealthCheckRunsTotal.inc({ result: 'healthy' });
    log.info('Health check passed — all MCP servers healthy', {
      total: servers.length,
      healthy: healthyCount,
    });
  } else {
    pmHealthCheckRunsTotal.inc({ result: 'degraded' });

    const degradedServers = servers.filter((s) => !s.healthy);

    log.warn('Health check detected degraded MCP servers', {
      total: servers.length,
      healthy: healthyCount,
      degraded: degradedCount,
      degraded_servers: degradedServers.map((s) => s.name),
    });

    // Alert if degraded count meets threshold
    if (degradedCount >= ALERT_THRESHOLD) {
      pmHealthCheckAlertsTotal.inc();

      for (const server of degradedServers) {
        log.error('ALERT: MCP server degraded', {
          server: server.name,
          type: server.type,
          circuit_state: server.circuitState,
          last_error: server.lastError,
        });
      }
    }
  }

  return checkResult;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

/**
 * Register the health check job with the scheduler.
 */
export function registerHealthCheckJob(): void {
  registerJob({
    name: 'health-check',
    defaultCron: '0 * * * *', // Every hour
    cronEnvVar: 'HEALTH_CHECK_CRON',
    handler: async (_job: Job) => {
      await executeHealthCheck();
    },
  });
}
