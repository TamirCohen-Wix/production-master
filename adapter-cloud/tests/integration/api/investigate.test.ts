/**
 * Integration tests for the investigation API endpoints.
 *
 * Validates:
 *   - POST /api/v1/investigate — start investigation (202 Accepted)
 *   - GET /api/v1/investigations/:id — check investigation status
 *   - GET /api/v1/investigations/:id/report — get investigation report
 *   - Error cases: missing fields, invalid domain, duplicate investigation
 *
 * All external dependencies (DB, BullMQ, Anthropic) are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import JSZip from 'jszip';

// Set required env vars before module imports
vi.hoisted(() => {
  process.env.MCP_COLLECTION_STARTED_AT = '2026-02-21T19:26:07.000Z';
});

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available to hoisted vi.mock()
// ---------------------------------------------------------------------------

const { mockAdd, mockQueueClose, mockQuery, mockInc, mockGetReport, mockLogError } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue({ id: 'job-1' }),
  mockQueueClose: vi.fn().mockResolvedValue(undefined),
  mockQuery: vi.fn(),
  mockInc: vi.fn(),
  mockGetReport: vi.fn().mockResolvedValue(null),
  mockLogError: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    close: mockQueueClose,
  })),
}));

vi.mock('../../../src/storage/db.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
}));

vi.mock('../../../src/storage/object-store.js', () => ({
  getReport: (...args: unknown[]) => mockGetReport(...args),
}));

vi.mock('../../../src/observability/index.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: mockLogError,
    debug: vi.fn(),
  }),
  pmInvestigationTotal: { inc: mockInc },
  injectTraceContext: <T extends Record<string, unknown>>(carrier: T): T => carrier,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import express from 'express';
import { investigateRouter } from '../../../src/api/routes/investigate.js';
import { investigationsRouter } from '../../../src/api/routes/investigations.js';
import { authMiddleware } from '../../../src/api/middleware/auth.js';
import type { Request, Response, NextFunction } from 'express';

/** Stub auth middleware that always sets a user context. */
function stubAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = { identity: 'test-user', authMethod: 'api_key', apiKey: 'test-key-12345678' };
  next();
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(stubAuth);
  app.use('/api/v1/investigate', investigateRouter);
  app.use('/api/v1/investigations', investigationsRouter);
  return app;
}

function buildAppWithRealAuth() {
  const app = express();
  app.use(express.json());
  app.use(authMiddleware);
  app.use('/api/v1/investigations', investigationsRouter);
  return app;
}

/**
 * Lightweight HTTP helper using built-in fetch + ephemeral server.
 */
async function request(
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to get server address'));
        return;
      }
      const url = `http://127.0.0.1:${addr.port}${path}`;
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body !== undefined) {
        opts.body = JSON.stringify(body);
      }
      fetch(url, opts)
        .then(async (res) => {
          const json = await res.json();
          server.close();
          resolve({ status: res.status, body: json as Record<string, unknown> });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

/**
 * Binary-oriented request helper for zip/download endpoints.
 */
async function requestBinary(
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; headers: Headers; bytes: Uint8Array }> {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, () => {
      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        server.close();
        reject(new Error('Failed to get server address'));
        return;
      }
      const url = `http://127.0.0.1:${addr.port}${path}`;
      const opts: RequestInit = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body !== undefined) {
        opts.body = JSON.stringify(body);
      }
      fetch(url, opts)
        .then(async (res) => {
          const buf = new Uint8Array(await res.arrayBuffer());
          server.close();
          resolve({ status: res.status, headers: res.headers, bytes: buf });
        })
        .catch((err) => {
          server.close();
          reject(err);
        });
    });
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('POST /api/v1/investigate', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('should accept a valid investigation request and return 202', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // dedup check — no existing
      .mockResolvedValueOnce({ rows: [{ id: 'inv-100' }] }); // insert

    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-1234',
      mode: 'fast',
    });

    expect(res.status).toBe(202);
    expect(res.body.investigation_id).toBe('inv-100');
    expect(res.body.status).toBe('queued');
    expect(res.body.message).toContain('queued');

    // Verify DB insert was called
    expect(mockQuery).toHaveBeenCalledTimes(2);
    const insertCall = mockQuery.mock.calls[1];
    expect(insertCall[0]).toContain('INSERT INTO investigations');
    expect(insertCall[1]).toContain('PROD-1234');

    // Verify BullMQ job enqueued
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      investigation_id: 'inv-100',
      ticket_id: 'PROD-1234',
      mode: 'fast',
    });

    // Verify metric incremented
    expect(mockInc).toHaveBeenCalledWith({ domain: 'unknown', status: 'queued', trigger_source: 'api' });
  });

  it('should default mode to balanced when not specified', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-200' }] });

    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-5678',
    });

    expect(res.status).toBe(202);
    // Verify the enqueued job uses 'balanced' mode
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      mode: 'balanced',
    });
  });

  it('should accept optional domain and callback_url', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-300' }] });

    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-9999',
      domain: 'payments',
      mode: 'deep',
      callback_url: 'https://example.com/callback',
    });

    expect(res.status).toBe(202);
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      domain: 'payments',
      callback_url: 'https://example.com/callback',
    });
  });

  // -------------------------------------------------------------------------
  // Validation errors
  // -------------------------------------------------------------------------

  it('should return 400 when ticket_id is missing', async () => {
    const res = await request(app, 'POST', '/api/v1/investigate', {
      mode: 'fast',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(res.body.details).toBeDefined();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should return 400 when ticket_id is empty string', async () => {
    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: '',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('should return 400 for invalid mode value', async () => {
    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-100',
      mode: 'turbo',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  it('should return 400 for invalid callback_url', async () => {
    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-100',
      callback_url: 'not-a-url',
    });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  it('should return 409 when an active investigation already exists for the ticket', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'existing-inv', status: 'running:gather' }],
    });

    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-1234',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Active investigation already exists');
    expect(res.body.investigation_id).toBe('existing-inv');
    expect(res.body.status).toBe('running:gather');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Server errors
  // -------------------------------------------------------------------------

  it('should return 500 when the database insert fails', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // dedup passes
      .mockRejectedValueOnce(new Error('Connection refused'));

    const res = await request(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-ERR',
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/investigations/:id
// ---------------------------------------------------------------------------

describe('GET /api/v1/investigations/:id', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return investigation details for a valid ID', async () => {
    const investigation = {
      id: 'inv-100',
      ticket_id: 'PROD-1234',
      domain: 'payments',
      mode: 'fast',
      status: 'completed',
      requested_by: 'key:test-key...',
      created_at: '2026-02-21T10:00:00Z',
      updated_at: '2026-02-21T10:05:00Z',
    };
    mockQuery.mockResolvedValueOnce({ rows: [investigation] });

    const res = await request(app, 'GET', '/api/v1/investigations/inv-100');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('inv-100');
    expect(res.body.ticket_id).toBe('PROD-1234');
    expect(res.body.status).toBe('completed');
  });

  it('should return 404 for a non-existent investigation', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app, 'GET', '/api/v1/investigations/inv-nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Investigation not found');
  });

  it('should return 500 when the database query fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('DB timeout'));

    const res = await request(app, 'GET', '/api/v1/investigations/inv-err');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/investigations/:id/report
// ---------------------------------------------------------------------------

describe('GET /api/v1/investigations/:id/report', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return the investigation report when available', async () => {
    const report = {
      id: 'rpt-1',
      investigation_id: 'inv-100',
      verdict: 'root_cause_identified',
      confidence: 0.92,
      summary: 'Database connection pool exhaustion caused cascading 500s',
      evidence: { logs: ['error at pool.ts:42'], metrics: ['p99 > 5s'] },
      recommendations: [{ action: 'Increase pool size', priority: 'high' }],
      created_at: '2026-02-21T10:05:00Z',
    };
    mockQuery.mockResolvedValueOnce({ rows: [report] });

    const res = await request(app, 'GET', '/api/v1/investigations/inv-100/report');

    expect(res.status).toBe(200);
    expect(res.body.verdict).toBe('root_cause_identified');
    expect(res.body.confidence).toBe(0.92);
    expect(res.body.summary).toContain('connection pool');
  });

  it('should return 404 with investigation status when report is not yet available', async () => {
    // First query: no report found
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Second query: investigation exists but still running
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'inv-200', status: 'running:gather' }] });

    const res = await request(app, 'GET', '/api/v1/investigations/inv-200/report');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Report not yet available');
    expect(res.body.investigation_status).toBe('running:gather');
  });

  it('should return 404 when investigation does not exist', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // no report
      .mockResolvedValueOnce({ rows: [] }); // no investigation

    const res = await request(app, 'GET', '/api/v1/investigations/inv-ghost/report');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Investigation not found');
  });

  it('should return 500 when the database query fails', async () => {
    mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

    const res = await request(app, 'GET', '/api/v1/investigations/inv-err/report');

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/investigations/:id/bundle
// ---------------------------------------------------------------------------

describe('GET /api/v1/investigations/:id/bundle', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    mockGetReport.mockReset();
    mockGetReport.mockResolvedValue(null);
  });

  it('should require authentication when auth middleware is enabled', async () => {
    const previousApiKeys = process.env.API_KEYS;
    process.env.API_KEYS = 'valid-key';

    try {
      const authedApp = buildAppWithRealAuth();
      const res = await request(authedApp, 'GET', '/api/v1/investigations/inv-100/bundle');
      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    } finally {
      if (previousApiKeys === undefined) {
        delete process.env.API_KEYS;
      } else {
        process.env.API_KEYS = previousApiKeys;
      }
    }
  });

  it('should return 404 when investigation does not exist', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app, 'GET', '/api/v1/investigations/inv-missing/bundle');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Investigation not found');
  });
  it('should return a zip bundle with expected files', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'inv-100',
            ticket_id: 'PROD-1234',
            domain: 'payments',
            mode: 'balanced',
            status: 'completed',
            error: null,
            created_at: '2026-02-21T10:00:00Z',
            updated_at: '2026-02-21T10:05:00Z',
            completed_at: '2026-02-21T10:05:00Z',
          },
        ],
      }) // investigations
      .mockResolvedValueOnce({ rows: [] }) // investigation_reports
      .mockResolvedValueOnce({ rows: [] }) // investigation_phases
      .mockResolvedValueOnce({ rows: [] }) // agent_runs
      .mockResolvedValueOnce({ rows: [] }) // feedback
      .mockResolvedValueOnce({ rows: [] }) // agent_outputs
      .mockResolvedValueOnce({ rows: [] }) // hypothesis_iterations
      .mockResolvedValueOnce({ rows: [] }) // mcp_tool_calls
      .mockResolvedValueOnce({ rows: [] }); // domain_configs

    const res = await requestBinary(app, 'GET', '/api/v1/investigations/inv-100/bundle');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type') ?? '').toContain('application/zip');
    expect(res.headers.get('content-disposition') ?? '').toContain('investigation-inv-100-bundle.zip');
    expect(res.bytes.length).toBeGreaterThan(20);

    const zip = await JSZip.loadAsync(Buffer.from(res.bytes));
    const fileNames = Object.keys(zip.files);
    expect(fileNames).toContain('bundle/metadata.json');
    expect(fileNames).toContain('bundle/report.json');
    expect(fileNames).toContain('bundle/phases.json');
    expect(fileNames).toContain('bundle/agent-runs.json');
    expect(fileNames).toContain('bundle/agent-outputs.json');
    expect(fileNames).toContain('bundle/hypothesis-iterations.json');
    expect(fileNames).toContain('bundle/mcp-tool-calls.json');
    expect(fileNames).toContain('bundle/domain-config.json');
    expect(fileNames).toContain('bundle/feedback.json');
    expect(fileNames).toContain('bundle/self-diagnostics.md');
  });

  it('should include legacy mcp not_available marker for older investigations', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'inv-legacy',
            ticket_id: 'PROD-LEGACY',
            domain: 'payments',
            mode: 'balanced',
            status: 'completed',
            error: null,
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:10:00Z',
            completed_at: '2026-01-01T00:10:00Z',
          },
        ],
      }) // investigations
      .mockResolvedValueOnce({ rows: [] }) // investigation_reports
      .mockResolvedValueOnce({ rows: [] }) // investigation_phases
      .mockResolvedValueOnce({ rows: [] }) // agent_runs
      .mockResolvedValueOnce({ rows: [] }) // feedback
      .mockResolvedValueOnce({ rows: [] }) // agent_outputs
      .mockResolvedValueOnce({ rows: [] }) // hypothesis_iterations
      .mockResolvedValueOnce({ rows: [] }) // mcp_tool_calls
      .mockResolvedValueOnce({ rows: [] }); // domain_configs

    const res = await requestBinary(app, 'GET', '/api/v1/investigations/inv-legacy/bundle');
    expect(res.status).toBe(200);

    const zip = await JSZip.loadAsync(Buffer.from(res.bytes));
    const mcpFile = zip.file('bundle/mcp-tool-calls.json');
    expect(mcpFile).toBeTruthy();
    const mcpContent = await mcpFile!.async('string');
    expect(mcpContent).toContain('"status": "not_available"');
    expect(mcpContent).toContain('collection_started_after_');
  });
});
