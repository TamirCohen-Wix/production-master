/**
 * Integration tests for the Grafana alert webhook handler.
 *
 * Validates:
 *   - Firing alerts are accepted and enqueue an investigation
 *   - Non-firing alerts are skipped with 200
 *   - Alerts without a service label are skipped
 *   - Empty alerts array returns 200 ignored
 *   - Missing alerts field returns 200 ignored
 *   - Deduplication skips alerts for services investigated in last 2 hours
 *   - Domain mapping from Grafana alert labels
 *   - Synthetic ticket ID generation from fingerprint
 *   - Multiple alerts in a single payload are processed independently
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

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
import { grafanaAlertWebhookRouter } from '../../../src/api/webhooks/grafana-alert.js';
import type { GrafanaAlertPayload, GrafanaAlert } from '../../../src/api/webhooks/grafana-alert.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/v1/webhooks/grafana-alert', grafanaAlertWebhookRouter);
  return app;
}

/** Build a single Grafana alert object. */
function buildAlert(overrides: Partial<GrafanaAlert> = {}): GrafanaAlert {
  return {
    status: 'firing',
    labels: {
      alertname: 'HighErrorRate',
      service: 'payment-service',
      severity: 'critical',
      ...(overrides.labels ?? {}),
    },
    annotations: {
      summary: 'Error rate above 5% for payment-service',
      description: 'Payment service error rate has exceeded the threshold.',
      ...(overrides.annotations ?? {}),
    },
    startsAt: '2026-02-21T10:00:00Z',
    endsAt: '0001-01-01T00:00:00Z',
    generatorURL: 'https://grafana.example.com/alerting/grafana/abc123/view',
    fingerprint: 'fp-abc123',
    dashboardURL: 'https://grafana.example.com/d/abc123/payment-dashboard',
    panelURL: 'https://grafana.example.com/d/abc123/payment-dashboard?viewPanel=1',
    values: { A: 5.2 },
    ...overrides,
  };
}

/** Build a valid Grafana alerting webhook payload. */
function buildGrafanaPayload(overrides: Partial<GrafanaAlertPayload> = {}): GrafanaAlertPayload {
  const alerts = overrides.alerts ?? [buildAlert()];
  return {
    receiver: 'production-master',
    status: 'firing',
    alerts,
    groupLabels: { alertname: 'HighErrorRate' },
    commonLabels: { alertname: 'HighErrorRate', service: 'payment-service' },
    commonAnnotations: { summary: 'Error rate above 5%' },
    externalURL: 'https://grafana.example.com/',
    version: '4',
    groupKey: 'group-key-001',
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
      const url = `http://127.0.0.1:${addr.port}/api/v1/webhooks/grafana-alert`;
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

describe('POST /api/v1/webhooks/grafana-alert', () => {
  const app = buildApp();

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: no existing investigation (dedup passes), domain lookup falls back
    mockQuery.mockResolvedValue({ rows: [] });
  });

  // -------------------------------------------------------------------------
  // Happy path
  // -------------------------------------------------------------------------

  it('should accept a firing alert and enqueue an investigation', async () => {
    // First call: domain lookup (no match — fallback)
    // Second call: dedup check (no existing)
    // Third call: insert investigation
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-graf-001' }] }); // insert

    const res = await postWebhook(app, buildGrafanaPayload());

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
    expect(res.body.triggered).toBe(1);
    expect(res.body.skipped).toBe(0);
    expect(res.body.errors).toBe(0);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe('triggered');
    expect(results[0].investigation_id).toBe('inv-graf-001');
    expect(results[0].alert).toBe('HighErrorRate');
    expect(results[0].service).toBe('payment-service');

    // Verify job was enqueued
    expect(mockAdd).toHaveBeenCalledTimes(1);
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      investigation_id: 'inv-graf-001',
      ticket_id: 'GRAFANA-fp-abc123',
      mode: 'fast',
      trigger_source: 'grafana_alert',
    });

    // Verify priority 2 (lower than PagerDuty)
    expect(mockAdd.mock.calls[0][2]).toMatchObject({
      priority: 2,
    });

    // Verify metric was incremented
    expect(mockInc).toHaveBeenCalledWith({ trigger: 'grafana_alert' });
  });

  // -------------------------------------------------------------------------
  // Alert filtering
  // -------------------------------------------------------------------------

  it('should skip non-firing alerts', async () => {
    const payload = buildGrafanaPayload({
      alerts: [buildAlert({ status: 'resolved' })],
    });

    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
    expect(res.body.triggered).toBe(0);
    expect(res.body.skipped).toBe(1);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('not "firing"');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should skip alerts without a service label', async () => {
    const alert = buildAlert();
    delete alert.labels.service;
    // Also remove job label so it falls back to "unknown"
    delete alert.labels.job;

    const payload = buildGrafanaPayload({ alerts: [alert] });

    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(1);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('No service name');
  });

  it('should use job label as fallback when service label is missing', async () => {
    const alert = buildAlert({
      labels: { alertname: 'HighLatency', job: 'order-processor', severity: 'warning' },
    });
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-graf-job' }] }); // insert

    const payload = buildGrafanaPayload({ alerts: [alert] });
    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.triggered).toBe(1);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results[0].service).toBe('order-processor');
  });

  it('should ignore payloads without alerts field', async () => {
    const res = await postWebhook(app, {
      receiver: 'production-master',
      status: 'firing',
    });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ignored');
    expect(res.body.reason).toContain('No alerts');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it('should handle empty alerts array', async () => {
    const res = await postWebhook(app, buildGrafanaPayload({ alerts: [] }));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('processed');
    expect(res.body.total).toBe(0);
    expect(res.body.triggered).toBe(0);
  });

  // -------------------------------------------------------------------------
  // Multiple alerts
  // -------------------------------------------------------------------------

  it('should process multiple alerts independently in a single payload', async () => {
    const alerts = [
      buildAlert({ fingerprint: 'fp-001', labels: { alertname: 'HighCPU', service: 'svc-a' } }),
      buildAlert({ status: 'resolved', fingerprint: 'fp-002', labels: { alertname: 'LowDisk', service: 'svc-b' } }),
      buildAlert({ fingerprint: 'fp-003', labels: { alertname: 'HighMem', service: 'svc-c' } }),
    ];

    // For first firing alert (svc-a): domain lookup, dedup, insert
    // Second alert is resolved — skipped, no DB calls
    // For third firing alert (svc-c): domain lookup, dedup, insert
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // svc-a domain lookup
      .mockResolvedValueOnce({ rows: [] }) // svc-a dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-a' }] }) // svc-a insert
      .mockResolvedValueOnce({ rows: [] }) // svc-c domain lookup
      .mockResolvedValueOnce({ rows: [] }) // svc-c dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-c' }] }); // svc-c insert

    const payload = buildGrafanaPayload({ alerts });
    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.triggered).toBe(2);
    expect(res.body.skipped).toBe(1);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results[0].status).toBe('triggered');
    expect(results[0].investigation_id).toBe('inv-a');
    expect(results[1].status).toBe('skipped');
    expect(results[2].status).toBe('triggered');
    expect(results[2].investigation_id).toBe('inv-c');

    expect(mockAdd).toHaveBeenCalledTimes(2);
    expect(mockInc).toHaveBeenCalledTimes(2);
  });

  // -------------------------------------------------------------------------
  // Deduplication
  // -------------------------------------------------------------------------

  it('should deduplicate if a recent investigation exists for the same service domain', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [{ id: 'existing-inv' }] }); // dedup — found recent

    const res = await postWebhook(app, buildGrafanaPayload());

    expect(res.status).toBe(200);
    expect(res.body.skipped).toBe(1);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results[0].status).toBe('skipped');
    expect(results[0].reason).toContain('already investigated');
    expect(results[0].investigation_id).toBe('existing-inv');
    expect(mockAdd).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Domain mapping
  // -------------------------------------------------------------------------

  it('should map service to domain from domain_configs when available', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ name: 'payments-domain' }] }) // domain lookup — found
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-mapped' }] }); // insert

    const res = await postWebhook(app, buildGrafanaPayload());

    expect(res.status).toBe(200);

    // Verify the domain passed to BullMQ
    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      domain: 'payments-domain',
    });
  });

  it('should fall back to lowercase service name when domain lookup fails', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup — not found
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-fallback' }] }); // insert

    const res = await postWebhook(app, buildGrafanaPayload());

    expect(res.status).toBe(200);

    expect(mockAdd.mock.calls[0][1]).toMatchObject({
      domain: 'payment-service',
    });
  });

  // -------------------------------------------------------------------------
  // Grafana metadata in job payload
  // -------------------------------------------------------------------------

  it('should include grafana_metadata in the enqueued job', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup
      .mockResolvedValueOnce({ rows: [] }) // dedup
      .mockResolvedValueOnce({ rows: [{ id: 'inv-meta' }] }); // insert

    const res = await postWebhook(app, buildGrafanaPayload());

    expect(res.status).toBe(200);

    const jobData = mockAdd.mock.calls[0][1];
    expect(jobData.grafana_metadata).toMatchObject({
      alert_name: 'HighErrorRate',
      service_name: 'payment-service',
      dashboard_url: 'https://grafana.example.com/d/abc123/payment-dashboard',
      alert_status: 'firing',
      fingerprint: 'fp-abc123',
    });
    expect(jobData.grafana_metadata.labels).toBeDefined();
    expect(jobData.grafana_metadata.annotations).toBeDefined();
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
        const url = `http://127.0.0.1:${addr.port}/api/v1/webhooks/grafana-alert`;
        fetch(url, { method: 'GET' })
          .then(async (res) => {
            const json = await res.json();
            server.close();
            expect(res.status).toBe(200);
            expect((json as Record<string, unknown>).handler).toBe('grafana-alert-webhook');
            resolve();
          })
          .catch((err) => {
            server.close();
            reject(err);
          });
      });
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it('should report errors per-alert without failing the entire request', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [] }) // domain lookup for first alert
      .mockRejectedValueOnce(new Error('DB connection lost')); // dedup fails

    const payload = buildGrafanaPayload({
      alerts: [buildAlert()],
    });

    const res = await postWebhook(app, payload);

    expect(res.status).toBe(200);
    expect(res.body.errors).toBe(1);

    const results = res.body.results as Array<Record<string, unknown>>;
    expect(results[0].status).toBe('error');
    expect(results[0].reason).toContain('Internal processing error');
  });
});
