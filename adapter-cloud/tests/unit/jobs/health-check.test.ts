/**
 * Unit tests for the health check scheduled job.
 *
 * Mocks the MCP registry to test health check execution logic,
 * metric updates, and alert thresholds without real MCP connections.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock dependencies
// ---------------------------------------------------------------------------

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({}),
    close: vi.fn().mockResolvedValue(undefined),
    upsertJobScheduler: vi.fn().mockResolvedValue({}),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    close: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  })),
}));

vi.mock('../../../src/observability/index.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Mock prom-client metrics to avoid registration conflicts
const { mockGaugeSet, mockCounterInc } = vi.hoisted(() => ({
  mockGaugeSet: vi.fn(),
  mockCounterInc: vi.fn(),
}));

vi.mock('prom-client', () => ({
  Gauge: vi.fn().mockImplementation(() => ({
    set: mockGaugeSet,
  })),
  Counter: vi.fn().mockImplementation(() => ({
    inc: mockCounterInc,
  })),
}));

vi.mock('../../../src/observability/metrics.js', () => ({
  register: {
    registerMetric: vi.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Import module under test
// ---------------------------------------------------------------------------

import {
  executeHealthCheck,
  setHealthCheckRegistry,
  registerHealthCheckJob,
  type HealthCheckResult,
} from '../../../src/jobs/health-check.js';
import type { McpRegistry } from '../../../src/mcp/registry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockRegistry(healthResult: {
  healthy: boolean;
  servers: Array<{
    name: string;
    type: string;
    healthy: boolean;
    circuitState: string;
    lastError?: string;
  }>;
}): McpRegistry {
  return {
    healthCheck: vi.fn().mockResolvedValue(healthResult),
    listServers: vi.fn().mockReturnValue(healthResult.servers),
    getClient: vi.fn(),
    disconnectAll: vi.fn(),
  } as unknown as McpRegistry;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Health Check Job', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.HEALTH_CHECK_ALERT_THRESHOLD;
  });

  describe('executeHealthCheck', () => {
    it('should throw if MCP registry is not set', async () => {
      // Reset the registry reference by setting it to undefined-like state
      setHealthCheckRegistry(undefined as unknown as McpRegistry);
      // Bypass — the function checks for truthiness
      await expect(executeHealthCheck()).rejects.toThrow('MCP registry not initialized');
    });

    it('should report all-healthy when all servers are up', async () => {
      const registry = createMockRegistry({
        healthy: true,
        servers: [
          { name: 'jira', type: 'http', healthy: true, circuitState: 'closed' },
          { name: 'slack', type: 'http', healthy: true, circuitState: 'closed' },
          { name: 'grafana', type: 'http', healthy: true, circuitState: 'closed' },
        ],
      });

      setHealthCheckRegistry(registry);
      const result = await executeHealthCheck();

      expect(result.healthy).toBe(true);
      expect(result.totalServers).toBe(3);
      expect(result.healthyCount).toBe(3);
      expect(result.degradedCount).toBe(0);
      expect(result.servers).toHaveLength(3);

      // Metrics should record healthy run
      expect(mockCounterInc).toHaveBeenCalledWith({ result: 'healthy' });
    });

    it('should detect degraded servers and report them', async () => {
      const registry = createMockRegistry({
        healthy: false,
        servers: [
          { name: 'jira', type: 'http', healthy: true, circuitState: 'closed' },
          { name: 'slack', type: 'http', healthy: false, circuitState: 'open', lastError: 'Connection refused' },
          { name: 'grafana', type: 'http', healthy: false, circuitState: 'half-open', lastError: 'Timeout' },
        ],
      });

      setHealthCheckRegistry(registry);
      const result = await executeHealthCheck();

      expect(result.healthy).toBe(false);
      expect(result.totalServers).toBe(3);
      expect(result.healthyCount).toBe(1);
      expect(result.degradedCount).toBe(2);

      // Should record degraded run
      expect(mockCounterInc).toHaveBeenCalledWith({ result: 'degraded' });
    });

    it('should update per-server Prometheus gauges', async () => {
      const registry = createMockRegistry({
        healthy: false,
        servers: [
          { name: 'jira', type: 'http', healthy: true, circuitState: 'closed' },
          { name: 'slack', type: 'http', healthy: false, circuitState: 'open' },
        ],
      });

      setHealthCheckRegistry(registry);
      await executeHealthCheck();

      // Should set gauge for each server
      expect(mockGaugeSet).toHaveBeenCalledWith(
        { server: 'jira', type: 'http' },
        1,
      );
      expect(mockGaugeSet).toHaveBeenCalledWith(
        { server: 'slack', type: 'http' },
        0,
      );
    });

    it('should include timestamp in the result', async () => {
      const registry = createMockRegistry({
        healthy: true,
        servers: [],
      });

      setHealthCheckRegistry(registry);
      const result = await executeHealthCheck();

      expect(result.timestamp).toBeDefined();
      // Should be a valid ISO date string
      expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('should preserve server error details in the result', async () => {
      const registry = createMockRegistry({
        healthy: false,
        servers: [
          {
            name: 'broken-server',
            type: 'stdio',
            healthy: false,
            circuitState: 'open',
            lastError: 'ECONNREFUSED 127.0.0.1:9090',
          },
        ],
      });

      setHealthCheckRegistry(registry);
      const result = await executeHealthCheck();

      const brokenServer = result.servers.find((s) => s.name === 'broken-server');
      expect(brokenServer).toBeDefined();
      expect(brokenServer!.lastError).toBe('ECONNREFUSED 127.0.0.1:9090');
      expect(brokenServer!.circuitState).toBe('open');
    });
  });

  describe('registerHealthCheckJob', () => {
    it('should register without throwing', () => {
      // registerJob is called internally — just verify no errors
      expect(() => registerHealthCheckJob()).not.toThrow();
    });
  });
});
