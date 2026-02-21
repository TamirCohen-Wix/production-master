/**
 * Integration tests for the knowledge API endpoints.
 *
 * Validates:
 *   - GET /api/v1/knowledge — list knowledge entries (paginated)
 *   - GET /api/v1/knowledge/:id — single entry
 *   - GET /api/v1/knowledge/export/:service — export by service
 *   - POST /api/v1/knowledge/:id/verify — verify an entry
 *   - POST /api/v1/knowledge/:id/archive — archive an entry
 *
 * All external dependencies (DB) are mocked.
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

vi.mock('../../../src/observability/index.js', () => ({
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
import { knowledgeRouter } from '../../../src/api/routes/knowledge.js';
import type { Request, Response, NextFunction } from 'express';

function stubAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = { identity: 'test-user', authMethod: 'api_key', apiKey: 'test-key-12345678' };
  next();
}

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(stubAuth);
  app.use('/api/v1/knowledge', knowledgeRouter);
  return app;
}

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('GET /api/v1/knowledge', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should list knowledge entries with pagination', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // count
      .mockResolvedValueOnce({
        rows: [
          { id: 'ke-1', service: 'bookings-service', category: 'known_issue', title: 'Test 1' },
          { id: 'ke-2', service: 'bookings-service', category: 'pattern', title: 'Test 2' },
        ],
      });

    const res = await request(app, 'GET', '/api/v1/knowledge');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.pagination).toBeDefined();
    expect((res.body.pagination as Record<string, unknown>).total).toBe(2);
  });

  it('should filter by service', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({
        rows: [{ id: 'ke-1', service: 'payments', category: 'pattern', title: 'Pay pattern' }],
      });

    const res = await request(app, 'GET', '/api/v1/knowledge?service=payments');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });
});

describe('GET /api/v1/knowledge/:id', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return a knowledge entry by ID', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'ke-1', service: 'bookings-service', category: 'known_issue', title: 'Pool exhaustion' }],
    });

    const res = await request(app, 'GET', '/api/v1/knowledge/ke-1');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ke-1');
  });

  it('should return 404 for non-existent entry', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app, 'GET', '/api/v1/knowledge/ke-missing');

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Knowledge entry not found');
  });
});

describe('GET /api/v1/knowledge/export/:service', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should export entries for a service', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        { id: 'ke-1', service: 'bookings-service', category: 'known_issue', title: 'Issue 1' },
        { id: 'ke-2', service: 'bookings-service', category: 'pattern', title: 'Pattern 1' },
      ],
    });

    const res = await request(app, 'GET', '/api/v1/knowledge/export/bookings-service');

    expect(res.status).toBe(200);
    expect(res.body.service).toBe('bookings-service');
    expect(res.body.count).toBe(2);
    expect(res.body.entries).toHaveLength(2);
  });
});

describe('POST /api/v1/knowledge/:id/verify', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should verify a knowledge entry', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'ke-1', last_verified_at: new Date().toISOString() }],
    });

    const res = await request(app, 'POST', '/api/v1/knowledge/ke-1/verify');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('ke-1');
  });

  it('should return 404 when verifying non-existent entry', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app, 'POST', '/api/v1/knowledge/ke-missing/verify');

    expect(res.status).toBe(404);
  });
});

describe('POST /api/v1/knowledge/:id/archive', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should archive a knowledge entry', async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'ke-1', confidence: 'archived', archived_at: new Date().toISOString() }],
    });

    const res = await request(app, 'POST', '/api/v1/knowledge/ke-1/archive');

    expect(res.status).toBe(200);
    expect(res.body.confidence).toBe('archived');
  });

  it('should return 404 when archiving non-existent entry', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await request(app, 'POST', '/api/v1/knowledge/ke-missing/archive');

    expect(res.status).toBe(404);
  });
});
