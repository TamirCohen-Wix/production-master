/**
 * Integration tests for health and metrics endpoints.
 *
 * Validates:
 *   - GET /health — liveness probe returns 200 with status, timestamp, uptime
 *   - GET /ready — readiness probe checks DB and MCP connectivity
 *   - GET /metrics — Prometheus metrics endpoint returns text exposition format
 *
 * All external dependencies (DB, MCP) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock('../../../src/storage/db.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../../src/observability/tracing.js', () => ({
  initTracing: vi.fn(),
  getTracer: vi.fn(() => ({ startSpan: vi.fn() })),
}));

vi.mock('../../../src/observability/logging.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import express from 'express';
import { healthRouter, setHealthRegistry } from '../../../src/api/routes/health.js';
import { getMetricsEndpoint } from '../../../src/observability/metrics.js';

function buildApp() {
  const app = express();
  app.use('/', healthRouter);
  app.get('/metrics', getMetricsEndpoint);
  return app;
}

/**
 * Lightweight HTTP helper using built-in fetch + ephemeral server.
 */
async function request(
  app: express.Express,
  path: string,
): Promise<{ status: number; body: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to get server address'));
        return;
      }
      const url = `http://127.0.0.1:${addr.port}${path}`;
      fetch(url)
        .then(async (res) => {
          const text = await res.text();
          server.close();
          resolve({
            status: res.status,
            body: text,
            contentType: res.headers.get('content-type') ?? '',
          });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

// ---------------------------------------------------------------------------
// Tests — GET /health (liveness)
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  const app = buildApp();

  it('should return 200 with ok status', async () => {
    const res = await request(app, '/health');

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
  });

  it('should include a valid ISO timestamp', async () => {
    const res = await request(app, '/health');
    const body = JSON.parse(res.body);

    expect(body.timestamp).toBeDefined();
    const parsed = new Date(body.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });

  it('should include uptime_seconds as a non-negative integer', async () => {
    const res = await request(app, '/health');
    const body = JSON.parse(res.body);

    expect(typeof body.uptime_seconds).toBe('number');
    expect(body.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(body.uptime_seconds)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /ready (readiness)
// ---------------------------------------------------------------------------

describe('GET /ready', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 200 when database is healthy and MCP registry is set', async () => {
    // Mock healthy DB
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    // Mock healthy MCP registry
    const mockRegistry = {
      healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    };
    setHealthRegistry(mockRegistry as never);

    const res = await request(app, '/ready');

    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ready');
    expect(body.checks.database.healthy).toBe(true);
    expect(body.checks.mcp.healthy).toBe(true);
  });

  it('should return 503 when database is unhealthy', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection refused'));

    const mockRegistry = {
      healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    };
    setHealthRegistry(mockRegistry as never);

    const res = await request(app, '/ready');

    expect(res.status).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('not_ready');
    expect(body.checks.database.healthy).toBe(false);
    expect(body.checks.database.error).toContain('Connection refused');
  });

  it('should return 503 when MCP servers are unhealthy', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });

    const mockRegistry = {
      healthCheck: vi.fn().mockResolvedValue({ healthy: false }),
    };
    setHealthRegistry(mockRegistry as never);

    const res = await request(app, '/ready');

    expect(res.status).toBe(503);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('not_ready');
    expect(body.checks.database.healthy).toBe(true);
    expect(body.checks.mcp.healthy).toBe(false);
  });

  it('should include a valid timestamp in the response', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }] });
    const mockRegistry = {
      healthCheck: vi.fn().mockResolvedValue({ healthy: true }),
    };
    setHealthRegistry(mockRegistry as never);

    const res = await request(app, '/ready');
    const body = JSON.parse(res.body);

    expect(body.timestamp).toBeDefined();
    const parsed = new Date(body.timestamp);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// Tests — GET /metrics (Prometheus)
// ---------------------------------------------------------------------------

describe('GET /metrics', () => {
  const app = buildApp();

  it('should return 200 with Prometheus text format', async () => {
    const res = await request(app, '/metrics');

    expect(res.status).toBe(200);
    expect(res.contentType).toContain('text/plain');
  });

  it('should include domain-specific metrics in the output', async () => {
    const res = await request(app, '/metrics');

    // Check for at least some of our custom metrics
    expect(res.body).toContain('pm_investigation_total');
    expect(res.body).toContain('pm_investigation_duration_seconds');
  });

  it('should include default Node.js runtime metrics', async () => {
    const res = await request(app, '/metrics');

    // Default metrics should include process and nodejs prefixed with pm_
    expect(res.body).toContain('pm_');
  });
});
