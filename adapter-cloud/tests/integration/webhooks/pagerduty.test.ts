/**
 * Integration tests for the PagerDuty webhook handler.
 *
 * Validates:
 *   - incident.triggered + high urgency events are accepted and enqueue an investigation
 *   - Non-incident.triggered events are ignored with 200
 *   - Low urgency incidents are ignored with 200
 *   - Missing event payload returns 400
 *   - Signature verification rejects invalid signatures
 *   - Deduplication skips duplicate incidents with active investigations
 *   - Domain mapping from PagerDuty service name
 *   - Synthetic ticket ID generation from incident number
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
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import express from 'express';
import crypto from 'node:crypto';
import { pagerdutyWebhookRouter } from '../../../src/api/webhooks/pagerduty.js';
import { verifySignature, buildTicketId } from '../../../src/api/webhooks/pagerduty.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/webhooks/pagerduty', pagerdutyWebhookRouter);
  return app;
}

/** A valid PagerDuty V3 incident.triggered webhook payload. */
function incidentTriggeredPayload(overrides: Record<string, unknown> = {}) {
  return {
    routing_key: 'R012ABC',
    event: {
      id: 'evt-001',
      event_type: 'incident.triggered',
      resource_type: 'incident',
      occurred_at: '2026-02-21T10:00:00Z',
      agent: { type: 'service_reference', name: 'Monitoring' },
      data: {
        id: 'P1234ABC',
        number: 42,
        title: 'High CPU on api-gateway',
        status: 'triggered',
        urgency: 'high',
        html_url: 'https://example.pagerduty.com/incidents/P1234ABC',
        service: {
          id: 'PSVC001',
          name: 'api-gateway',
          html_url: 'https://example.pagerduty.com/services/PSVC001',
        },
        assignees: [{ id: 'PUSER01', summary: 'Jane Doe' }],
        body: { details: 'CPU usage above 95% for 10 minutes. See ticket PROD-999.' },
        ...(overrides.data as Record<string, unknown> ?? {}),
      },
      ...(overrides.event as Record<string, unknown> ?? {}),
    },
    ...overrides,
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
      const url = `http://127.0.0.1:${addr.port}/api/v1/webhooks/pagerduty`;
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

describe('POST /api/v1/webhooks/pagerduty', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.PAGERDUTY_WEBHOOK_SECRET;

    // Default: no existing investigation (dedup passes), domain lookup falls back
    mockQuery.mockResolvedValue({ rows: [] });
  });

  afterEach(() => {
    delete process.env.PAGERDUTY_WEBHOOK_SECRET;
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('should accept a valid incident.triggered high-urgency event and enqueue an investigation', async () => {
    // First call: domain lookup (no match — fallback)
    // Second call: dedup check (no existing)
    // Third call: insert investigation
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-pd-001' }] }); // insert

    const res = await postWebhook(app, incidentTriggeredPayload());

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('queued');
    expect(res.body.investigation_id).toBe('inv-pd-001');
    expect(res.body.ticket_id).toBe('PD-42');
    expect(res.body.domain).toBe('api-gateway');

    // Verify job was enqueued
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      investigation_id: 'inv-pd-001',
      ticket_id: 'PD-42',
      mode: 'fast',
      trigger_source: 'pagerduty',
    });

    // Verify high priority
    expect(mockAdd.mock.calls[0][2]).toMatchObject({
      priority: 1,
    });

    // Verify metric was incremented
    expect(mockInc).toHaveBeenCalledWith({ trigger: 'pagerduty' });
  });

  // -------------------------------------------------------------------------
  // Event filtering
  // -------------------------------------------------------------------------

  it('should ignore non-incident.triggered events', async () => {
    const payload = incidentTriggeredPayload({
      event: { event_type: 'incident.acknowledged' },
    });
    // Override event_type at the nested level
    (payload.event as Record<string, unknown>).event_type = 'incident.acknowledged';

    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(res.body.reason).toContain('incident.acknowledged');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should ignore low urgency incidents', async () => {
    const payload = incidentTriggeredPayload();
    (payload.event.data as Record<string, unknown>).urgency = 'low';

    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(res.body.reason).toContain('not high');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should return 400 when event is missing from payload', async () => {
    const res = await postWebhook(app, { routing_key: 'R012ABC' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Missing event');
  });

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  it('should deduplicate if an active investigation exists for the same incident', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [{ id: 'existing-inv', status: 'in_progress' }] }); // dedup

    const res = await postWebhook(app, incidentTriggeredPayload());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('duplicate');
    expect(res.body.investigation_id).toBe('existing-inv');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Signature verification
  // -------------------------------------------------------------------------

  it('should reject requests with invalid signature when secret is set', async () => {
    process.env.PAGERDUTY_WEBHOOK_SECRET = 'pd-secret-xyz';

    const res = await postWebhook(app, incidentTriggeredPayload(), {
      'x-pagerduty-signature': 'v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid webhook signature');
  });

  it('should reject requests with missing signature when secret is set', async () => {
    process.env.PAGERDUTY_WEBHOOK_SECRET = 'pd-secret-xyz';

    const res = await postWebhook(app, incidentTriggeredPayload());

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Invalid webhook signature');
  });

  it('should accept requests with valid signature when secret is set', async () => {
    const secret = 'pd-secret-xyz';
    process.env.PAGERDUTY_WEBHOOK_SECRET = secret;
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-pd-sig' }] }); // insert

    const payload = incidentTriggeredPayload();
    const bodyStr = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secret)
      .update(Buffer.from(bodyStr))
      .digest('hex');

    const res = await postWebhook(app, payload, {
      'x-pagerduty-signature': `v1=${signature}`,
    });

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('queued');
  });

  it('should skip signature verification when secret is not configured', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-pd-nosig' }] }); // insert

    const res = await postWebhook(app, incidentTriggeredPayload());

    expect(res.status).toBe(202);
    expect(res.body.status).toBe('queued');
  });

  // -------------------------------------------------------------------------
  // GET health-check endpoint
  // -------------------------------------------------------------------------

  it('should respond to GET with a health check status', async () => {
    return new Promise<void>((resolve, reject) => {
      const server = app.listen(0, () => {
        const addr = server.address();
        if (!addr || typeof addr === 'string') {
          server.close();
          reject(new Error('Failed to get server address'));
          return;
        }
        const url = `http://127.0.0.1:${addr.port}/api/v1/webhooks/pagerduty`;
        fetch(url, { method: 'GET' })
          .then(async (res) => {
            const json = await res.json();
            server.close();
            expect(res.status).toBe(200);
            expect((json as Record<string, unknown>).handler).toBe('pagerduty-webhook');
            resolve();
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });
});

// ---------------------------------------------------------------------------
// Unit tests for exported helpers
// ---------------------------------------------------------------------------

describe('verifySignature', () => {
  const secret = 'test-pd-secret';

  it('should accept a valid v1 signature', () => {
    const body = Buffer.from('{"event":"test"}');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const sigHeader = `v1=${expected}`;

    expect(verifySignature(body, sigHeader, secret)).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const body = Buffer.from('{"event":"test"}');
    const sigHeader = 'v1=0000000000000000000000000000000000000000000000000000000000000000';

    expect(verifySignature(body, sigHeader, secret)).toBe(false);
  });

  it('should reject a missing signature header', () => {
    const body = Buffer.from('{"event":"test"}');
    expect(verifySignature(body, undefined, secret)).toBe(false);
  });

  it('should reject a signature with wrong version prefix', () => {
    const body = Buffer.from('{"event":"test"}');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const sigHeader = `v2=${expected}`;

    expect(verifySignature(body, sigHeader, secret)).toBe(false);
  });

  it('should handle comma-separated signatures (multiple versions)', () => {
    const body = Buffer.from('{"event":"test"}');
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');
    const sigHeader = `v0=deadbeef, v1=${expected}`;

    expect(verifySignature(body, sigHeader, secret)).toBe(true);
  });
});

describe('buildTicketId', () => {
  it('should build ticket ID from incident number', () => {
    expect(buildTicketId(42, 'P1234ABC')).toBe('PD-42');
  });

  it('should fall back to incident ID when number is undefined', () => {
    expect(buildTicketId(undefined, 'P1234ABC')).toBe('PD-P1234ABC');
  });

  it('should handle incident number of 0', () => {
    expect(buildTicketId(0, 'PXYZ')).toBe('PD-0');
  });
});
