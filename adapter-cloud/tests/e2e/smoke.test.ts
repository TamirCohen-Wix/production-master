/**
 * E2E smoke tests for the cloud investigation pipeline.
 *
 * Validates the full investigation flow end-to-end:
 *   1. Webhook trigger (Jira issue_created) starts an investigation
 *   2. Investigation is created in the database
 *   3. Status polling returns current phase
 *   4. Investigation completes and report is generated
 *
 * All external services (Anthropic API, MCP servers, database, BullMQ)
 * are mocked to ensure deterministic, fast execution.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available to hoisted vi.mock()
// ---------------------------------------------------------------------------

const { mockAdd, mockQueueClose, mockQuery, mockInc, mockTransaction } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue({ id: 'job-1' }),
  mockQueueClose: vi.fn().mockResolvedValue(undefined),
  mockQuery: vi.fn(),
  mockInc: vi.fn(),
  mockTransaction: vi.fn(),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: mockAdd,
    close: mockQueueClose,
  })),
}));

vi.mock('../../src/storage/db.js', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  transaction: (...args: unknown[]) => mockTransaction(...args),
}));

vi.mock('../../src/observability/index.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  initTracing: vi.fn(),
  initMetrics: vi.fn(),
  getMetricsEndpoint: vi.fn(),
  injectTraceContext: <T extends Record<string, unknown>>(carrier: T): T => carrier,
  pmInvestigationTotal: { inc: mockInc },
  pmJiraAssignmentTotal: { inc: vi.fn() },
  pmInvestigationDurationSeconds: { observe: vi.fn() },
  pmInvestigationVerdict: { inc: vi.fn() },
  pmAgentDurationSeconds: { observe: vi.fn() },
  pmAgentTokensTotal: { inc: vi.fn() },
  pmMcpCallDurationSeconds: { observe: vi.fn() },
  pmMcpCallErrorsTotal: { inc: vi.fn() },
  pmHypothesisIterations: { observe: vi.fn() },
  pmHypothesisConfidence: { observe: vi.fn() },
  pmLlmCostDollars: { inc: vi.fn() },
  pmQueueDepth: { set: vi.fn(), dec: vi.fn() },
  pmWorkerUtilization: { set: vi.fn() },
  register: { metrics: vi.fn().mockResolvedValue(''), contentType: 'text/plain' },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import express from 'express';
import { jiraWebhookRouter } from '../../src/api/webhooks/jira.js';
import { investigateRouter } from '../../src/api/routes/investigate.js';
import { investigationsRouter } from '../../src/api/routes/investigations.js';
import type { Request, Response, NextFunction } from 'express';

/** Stub auth middleware for authenticated routes. */
function stubAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = { identity: 'e2e-test-user', authMethod: 'api_key', apiKey: 'e2e-test-key-12345678' };
  next();
}

function buildApp() {
  const app = express();
  app.use(express.json());
  // Webhooks are unauthenticated (use their own signature verification)
  app.use('/api/v1/webhooks/jira', jiraWebhookRouter);
  // API routes require auth
  app.use('/api/v1', stubAuth);
  app.use('/api/v1/investigate', investigateRouter);
  app.use('/api/v1/investigations', investigationsRouter);
  return app;
}

/** Ephemeral server + fetch helper. */
async function httpRequest(
  app: express.Express,
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
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
        headers: { 'Content-Type': 'application/json', ...headers },
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
// E2E Smoke Tests
// ---------------------------------------------------------------------------

describe('E2E: Full investigation flow via Jira webhook', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JIRA_WEBHOOK_SECRET;
    delete process.env.JIRA_PROJECT_FILTER;
  });

  it('should complete the full lifecycle: webhook → investigation created → status polling → report', async () => {
    // --- Step 1: Jira webhook triggers investigation creation ---

    // Mock: dedup check returns no existing investigation
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Mock: domain config lookup by jira_project
    mockQuery.mockResolvedValueOnce({ rows: [] });
    // Mock: INSERT INTO investigations returns new ID
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'inv-e2e-001' }] });

    const webhookPayload = {
      webhookEvent: 'jira:issue_created',
      issue: {
        key: 'PROD-5555',
        fields: {
          summary: 'Users seeing 504 Gateway Timeout on checkout',
          issuetype: { name: 'Bug' },
          priority: { name: 'Critical' },
          project: { key: 'PROD' },
        },
      },
    };

    const webhookRes = await httpRequest(
      app,
      'POST',
      '/api/v1/webhooks/jira',
      webhookPayload,
    );

    expect(webhookRes.status).toBe(200);
    expect(webhookRes.body.status).toBe('accepted');
    expect(webhookRes.body.investigation_id).toBe('inv-e2e-001');
    expect(webhookRes.body.ticket_id).toBe('PROD-5555');

    // Verify a BullMQ job was enqueued
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      investigation_id: 'inv-e2e-001',
      ticket_id: 'PROD-5555',
      trigger_source: 'jira_webhook',
    });

    // --- Step 2: Poll investigation status (simulating running state) ---

    const runningInvestigation = {
      id: 'inv-e2e-001',
      ticket_id: 'PROD-5555',
      domain: 'prod',
      mode: 'balanced',
      status: 'running:gather',
      requested_by: 'jira_webhook',
      created_at: '2026-02-21T12:00:00Z',
      updated_at: '2026-02-21T12:01:00Z',
    };
    mockQuery.mockResolvedValueOnce({ rows: [runningInvestigation] });

    const statusRes = await httpRequest(
      app,
      'GET',
      '/api/v1/investigations/inv-e2e-001',
    );

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.id).toBe('inv-e2e-001');
    expect(statusRes.body.status).toBe('running:gather');
    expect(statusRes.body.ticket_id).toBe('PROD-5555');

    // --- Step 3: Poll again — now completed ---

    const completedInvestigation = {
      ...runningInvestigation,
      status: 'completed',
      updated_at: '2026-02-21T12:05:00Z',
    };
    mockQuery.mockResolvedValueOnce({ rows: [completedInvestigation] });

    const completedRes = await httpRequest(
      app,
      'GET',
      '/api/v1/investigations/inv-e2e-001',
    );

    expect(completedRes.status).toBe(200);
    expect(completedRes.body.status).toBe('completed');

    // --- Step 4: Fetch the investigation report ---

    const report = {
      id: 'rpt-e2e-001',
      investigation_id: 'inv-e2e-001',
      verdict: 'root_cause_identified',
      confidence: 0.87,
      summary: 'Database connection pool exhausted due to leaked connections in checkout service',
      evidence: {
        logs: ['ConnectionPool: max connections reached at 2026-02-21T11:58:32Z'],
        metrics: ['checkout_service_p99_latency > 10s for 15 minutes'],
        changes: ['PR #4521 removed connection release in error handler'],
      },
      recommendations: [
        { action: 'Revert PR #4521', priority: 'critical' },
        { action: 'Add connection pool monitoring alert', priority: 'high' },
      ],
      created_at: '2026-02-21T12:05:00Z',
    };
    mockQuery.mockResolvedValueOnce({ rows: [report] });

    const reportRes = await httpRequest(
      app,
      'GET',
      '/api/v1/investigations/inv-e2e-001/report',
    );

    expect(reportRes.status).toBe(200);
    expect(reportRes.body.verdict).toBe('root_cause_identified');
    expect(reportRes.body.confidence).toBe(0.87);
    expect(reportRes.body.summary).toContain('connection pool');
    expect(reportRes.body.investigation_id).toBe('inv-e2e-001');
  });

  it('should handle the full lifecycle via direct API call (not webhook)', async () => {
    // --- Step 1: Start investigation via API ---

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // dedup check
      .mockResolvedValueOnce({ rows: [{ id: 'inv-e2e-002' }] }); // insert

    const createRes = await httpRequest(
      app,
      'POST',
      '/api/v1/investigate',
      {
        ticket_id: 'INC-7890',
        domain: 'payments',
        mode: 'deep',
        callback_url: 'https://hooks.example.com/pm-callback',
      },
    );

    expect(createRes.status).toBe(202);
    expect(createRes.body.investigation_id).toBe('inv-e2e-002');
    expect(createRes.body.status).toBe('queued');

    // --- Step 2: Verify job payload includes all fields ---

    expect(mockAdd).toHaveBeenCalledTimes(1);
    const jobData = mockAdd.mock.calls[0][1];
    expect(jobData).toMatchObject({
      investigation_id: 'inv-e2e-002',
      ticket_id: 'INC-7890',
      domain: 'payments',
      mode: 'deep',
      callback_url: 'https://hooks.example.com/pm-callback',
    });

    // --- Step 3: Report not yet available ---

    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // no report yet
      .mockResolvedValueOnce({ rows: [{ id: 'inv-e2e-002', status: 'running:hypothesize' }] });

    const pendingReportRes = await httpRequest(
      app,
      'GET',
      '/api/v1/investigations/inv-e2e-002/report',
    );

    expect(pendingReportRes.status).toBe(404);
    expect(pendingReportRes.body.error).toBe('Report not yet available');
    expect(pendingReportRes.body.investigation_status).toBe('running:hypothesize');
  });
});

// ---------------------------------------------------------------------------
// E2E: Deduplication across triggers
// ---------------------------------------------------------------------------

describe('E2E: Deduplication prevents duplicate investigations', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JIRA_WEBHOOK_SECRET;
    delete process.env.JIRA_PROJECT_FILTER;
  });

  it('should deduplicate when a Jira webhook fires for an already-active investigation', async () => {
    // First webhook — accepted
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // dedup: no existing
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-dedup-001' }] }); // insert

    const first = await httpRequest(app, 'POST', '/api/v1/webhooks/jira', {
      webhookEvent: 'jira:issue_created',
      issue: {
        key: 'PROD-DUP',
        fields: {
          summary: 'Service down',
          issuetype: { name: 'Bug' },
          priority: { name: 'High' },
          project: { key: 'PROD' },
        },
      },
    });

    expect(first.status).toBe(200);
    expect(first.body.status).toBe('accepted');

    // Second webhook for same ticket — deduplicated
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'inv-dedup-001' }] }); // dedup: existing found

    const second = await httpRequest(app, 'POST', '/api/v1/webhooks/jira', {
      webhookEvent: 'jira:issue_created',
      issue: {
        key: 'PROD-DUP',
        fields: {
          summary: 'Service down',
          issuetype: { name: 'Bug' },
          priority: { name: 'High' },
          project: { key: 'PROD' },
        },
      },
    });

    expect(second.status).toBe(200);
    expect(second.body.status).toBe('deduplicated');
    expect(second.body.existing_investigation_id).toBe('inv-dedup-001');

    // Only one BullMQ job should have been enqueued
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('should also deduplicate via the API route (409 Conflict)', async () => {
    // API request when active investigation already exists
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 'inv-dedup-002', status: 'running:analyze' }],
    });

    const res = await httpRequest(app, 'POST', '/api/v1/investigate', {
      ticket_id: 'PROD-DUP',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('Active investigation already exists');
    expect(res.body.investigation_id).toBe('inv-dedup-002');
    expect(mockAdd).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// E2E: Error handling across the pipeline
// ---------------------------------------------------------------------------

describe('E2E: Error handling and resilience', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JIRA_WEBHOOK_SECRET;
  });

  it('should return 404 for polling a non-existent investigation', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    const res = await httpRequest(
      app,
      'GET',
      '/api/v1/investigations/inv-nonexistent',
    );

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Investigation not found');
  });

  it('should gracefully handle database failures during webhook processing', async () => {
    // Dedup check fails due to DB error
    mockQuery.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const res = await httpRequest(app, 'POST', '/api/v1/webhooks/jira', {
      webhookEvent: 'jira:issue_created',
      issue: {
        key: 'PROD-ERR',
        fields: {
          summary: 'Error test',
          issuetype: { name: 'Bug' },
          priority: { name: 'High' },
          project: { key: 'PROD' },
        },
      },
    });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Internal server error');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should ignore non-issue_created Jira events in the E2E flow', async () => {
    const res = await httpRequest(app, 'POST', '/api/v1/webhooks/jira', {
      webhookEvent: 'jira:issue_updated',
      issue: { key: 'PROD-100' },
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should validate request body on the API route', async () => {
    const res = await httpRequest(app, 'POST', '/api/v1/investigate', {});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
