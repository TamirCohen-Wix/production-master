/**
 * Integration tests for the Jira webhook handler (PR 5.1).
 *
 * Validates:
 *   - issue_created events are accepted and enqueue an investigation
 *   - Non-issue_created events are ignored with 200
 *   - Project key filtering works when JIRA_PROJECT_FILTER is set
 *   - Missing issue.key returns 200 ignored
 *   - Signature verification rejects invalid signatures
 *   - Deduplication skips duplicate tickets within the window
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — vi.hoisted() ensures variables are available to hoisted vi.mock()
// ---------------------------------------------------------------------------

const { mockAdd, mockQueueClose, mockQuery, mockInc } = vi.hoisted(() => ({
  mockAdd: vi.fn().mockResolvedValue({ id: 'job-1' }),
  mockQueueClose: vi.fn().mockResolvedValue(undefined),
  mockQuery: vi.fn(),
  mockInc: vi.fn(),
}));

const { mockAutoAssignJiraIssue } = vi.hoisted(() => ({
  mockAutoAssignJiraIssue: vi.fn().mockResolvedValue({ status: 'assigned' }),
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

vi.mock('../../../src/observability/index.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  pmInvestigationTotal: { inc: mockInc },
  pmJiraAssignmentTotal: { inc: vi.fn() },
}));

vi.mock('../../../src/services/jira-auto-assign.js', () => ({
  autoAssignJiraIssue: (...args: unknown[]) => mockAutoAssignJiraIssue(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import express from 'express';
import { jiraWebhookRouter, setJiraWebhookRegistry } from '../../../src/api/webhooks/jira.js';
import crypto from 'node:crypto';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/webhooks/jira', jiraWebhookRouter);
  return app;
}

/** A valid Jira issue_created webhook payload. */
function issueCreatedPayload(issueKey = 'PROD-1234') {
  return {
    webhookEvent: 'jira:issue_created',
    issue: {
      key: issueKey,
      fields: {
        summary: 'Service xyz returning 500s in production',
        issuetype: { name: 'Bug' },
        priority: { name: 'High' },
        project: { key: issueKey.split('-')[0] },
      },
    },
  };
}

function domainConfigRow() {
  return {
    repo: 'bookings-scheduler',
    config: {
      jira_project: 'PROD',
      jira_assignment: {
        enabled: true,
        cc_bug_issue_types: ['CC Bug'],
        group_field_name: 'Group',
        rules: [
          {
            match_keywords_any: ['payment'],
            group: 'Pulse',
            assignee_email: 'pulse@wix.com',
          },
        ],
        default: {
          group: 'Bookeepers',
          assignee_email: 'triage@wix.com',
        },
      },
    },
  };
}

/**
 * Lightweight supertest-style helper using built-in fetch + ephemeral server.
 */
async function postWebhook(
  app: express.Express,
  body: unknown,
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
      const url = `http://127.0.0.1:${addr.port}/api/v1/webhooks/jira`;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
      })
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

describe('POST /api/v1/webhooks/jira', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JIRA_PROJECT_FILTER;
    delete process.env.JIRA_WEBHOOK_SECRET;

    // Default: no existing investigation (dedup passes)
    mockQuery.mockResolvedValue({ rows: [] });
    mockAutoAssignJiraIssue.mockResolvedValue({ status: 'assigned' });
    setJiraWebhookRegistry({
      getClient: vi.fn(),
      listServers: vi.fn().mockReturnValue([]),
      healthCheck: vi.fn(),
      disconnectAll: vi.fn(),
    } as unknown as import('../../../src/mcp/registry.js').McpRegistry);
  });

  afterEach(() => {
    delete process.env.JIRA_PROJECT_FILTER;
    delete process.env.JIRA_WEBHOOK_SECRET;
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('should accept a valid issue_created event and enqueue an investigation', async () => {
    // First call: dedup check (no existing)
    // Second call: domain config lookup
    // Third call: insert investigation
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [domainConfigRow()] }) // domain lookup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-001' }] }); // insert

    const res = await postWebhook(app, issueCreatedPayload());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.investigation_id).toBe('inv-001');
    expect(res.body.ticket_id).toBe('PROD-1234');

    // Verify investigation was inserted
    expect(mockQuery).toHaveBeenCalledTimes(3);
    const insertCall = mockQuery.mock.calls[2];
    expect(insertCall[0]).toContain('INSERT INTO investigations');
    expect(insertCall[1]).toContain('PROD-1234');

    // Verify job was enqueued
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      investigation_id: 'inv-001',
      ticket_id: 'PROD-1234',
      domain: 'bookings-scheduler',
      trigger_source: 'jira_webhook',
    });

    // Verify metric was incremented
    expect(mockInc).toHaveBeenCalledWith({ domain: 'unknown', status: 'queued', trigger_source: 'jira_webhook' });
    expect(mockAutoAssignJiraIssue).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Event filtering
  // -------------------------------------------------------------------------

  it('should ignore non-issue_created events', async () => {
    const payload = { webhookEvent: 'jira:issue_updated', issue: { key: 'PROD-100' } };
    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should ignore payloads without webhookEvent', async () => {
    const res = await postWebhook(app, { issue: { key: 'PROD-100' } });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
  });

  it('should ignore issue_created without issue.key', async () => {
    const payload = { webhookEvent: 'jira:issue_created', issue: {} };
    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(res.body.reason).toContain('missing issue.key');
  });

  // -------------------------------------------------------------------------
  // Project filter
  // -------------------------------------------------------------------------

  it('should filter out projects not in JIRA_PROJECT_FILTER', async () => {
    process.env.JIRA_PROJECT_FILTER = 'SRE,INFRA';

    const res = await postWebhook(app, issueCreatedPayload('PROD-555'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(res.body.reason).toContain('project PROD not in filter');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('should accept projects that ARE in JIRA_PROJECT_FILTER', async () => {
    process.env.JIRA_PROJECT_FILTER = 'PROD,SRE';
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [domainConfigRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-002' }] });

    const res = await postWebhook(app, issueCreatedPayload('PROD-999'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  it('should accept all projects when JIRA_PROJECT_FILTER is unset', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [domainConfigRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-003' }] });

    const res = await postWebhook(app, issueCreatedPayload('RANDOM-42'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  it('should deduplicate if an investigation exists within the dedup window', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 'existing-inv' }] });

    const res = await postWebhook(app, issueCreatedPayload('PROD-1234'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('deduplicated');
    expect(res.body.existing_investigation_id).toBe('existing-inv');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Signature verification
  // -------------------------------------------------------------------------

  it('should reject requests with invalid signature when secret is set', async () => {
    process.env.JIRA_WEBHOOK_SECRET = 'my-secret-123';

    const res = await postWebhook(app, issueCreatedPayload(), {
      'x-hub-signature': 'sha256=deadbeef',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid webhook signature');
  });

  it('should reject requests with missing signature when secret is set', async () => {
    process.env.JIRA_WEBHOOK_SECRET = 'my-secret-123';

    const res = await postWebhook(app, issueCreatedPayload());

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid webhook signature');
  });

  it('should accept requests with valid signature when secret is set', async () => {
    const secret = 'my-secret-123';
    process.env.JIRA_WEBHOOK_SECRET = secret;
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [domainConfigRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-sig' }] });

    const payload = issueCreatedPayload();
    const bodyStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(bodyStr))
      .digest('hex');

    const res = await postWebhook(app, payload, {
      'x-hub-signature': `sha256=${signature}`,
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
  });

  // -------------------------------------------------------------------------
  // Domain mapping
  // -------------------------------------------------------------------------

  it('should map the project key to a lowercase domain', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }) // no matching domain config, fallback to lowercase
      .mockResolvedValueOnce({ rows: [{ id: 'inv-dom' }] });

    await postWebhook(app, issueCreatedPayload('SRE-42'));

    const insertCall = mockQuery.mock.calls[2];
    // Second param in the INSERT should be the domain
    expect(insertCall[1]).toContain('sre');
  });

  it('should skip auto-assignment for non-CC Bug issue types while still enqueueing', async () => {
    mockAutoAssignJiraIssue.mockResolvedValueOnce({
      status: 'skipped',
      reason: 'issue type not configured for CC bug auto-assignment',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [domainConfigRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-skip' }] });

    const payload = issueCreatedPayload('PROD-321');
    payload.issue.fields.issuetype.name = 'Task';
    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.assignment).toBe('skipped');
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('should continue investigation enqueue when assignment fails', async () => {
    mockAutoAssignJiraIssue.mockResolvedValueOnce({
      status: 'failed',
      reason: 'jira update-issue returned an error',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [domainConfigRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-fail-safe' }] });

    const res = await postWebhook(app, issueCreatedPayload('PROD-654'));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.assignment).toBe('failed');
    expect(mockAdd).toHaveBeenCalledTimes(1);
  });

  it('should report fallback assignment when default route is used', async () => {
    mockAutoAssignJiraIssue.mockResolvedValueOnce({
      status: 'fallback_assigned',
      reason: 'matched default route',
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [domainConfigRow()] })
      .mockResolvedValueOnce({ rows: [{ id: 'inv-fallback' }] });

    const res = await postWebhook(app, issueCreatedPayload('PROD-741'));

    expect(res.status).toBe(200);
    expect(res.body.assignment).toBe('fallback_assigned');
  });
});
