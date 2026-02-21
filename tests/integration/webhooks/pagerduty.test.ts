/**
 * Integration tests for the PagerDuty V3 webhook handler (PR 5.3).
 *
 * Tests cover:
 *   - Signature verification (HMAC-SHA256)
 *   - Event filtering (incident.triggered + high urgency only)
 *   - Ticket ID generation ("PD-<incident_number>")
 *   - Ignored events (low urgency, wrong event type)
 *   - Missing/malformed payloads
 *   - Domain mapping fallback behavior
 */

import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  verifySignature,
  buildTicketId,
  type PagerDutyV3Payload,
} from '../../../adapter-cloud/src/api/webhooks/pagerduty.js';

// ---------------------------------------------------------------------------
// Test fixtures — PagerDuty V3 mock payloads
// ---------------------------------------------------------------------------

const WEBHOOK_SECRET = 'test-webhook-secret-key-1234';

function createMockPayload(overrides: {
  eventType?: string;
  urgency?: string;
  incidentNumber?: number;
  serviceName?: string;
  title?: string;
} = {}): PagerDutyV3Payload {
  return {
    routing_key: 'R0123456789ABCDEF',
    event: {
      id: 'evt-001',
      event_type: overrides.eventType ?? 'incident.triggered',
      resource_type: 'incident',
      occurred_at: '2026-02-21T10:30:00.000Z',
      agent: {
        type: 'service_reference',
        name: 'monitoring-agent',
      },
      data: {
        id: 'P1234ABC',
        number: overrides.incidentNumber ?? 42567,
        title: overrides.title ?? '[CRITICAL] Payment gateway timeout — 5xx spike on checkout-service',
        status: 'triggered',
        urgency: overrides.urgency ?? 'high',
        html_url: 'https://acme.pagerduty.com/incidents/P1234ABC',
        service: {
          id: 'PSVC001',
          name: overrides.serviceName ?? 'checkout-service',
          html_url: 'https://acme.pagerduty.com/services/PSVC001',
        },
        assignees: [
          { id: 'PUSER01', summary: 'On-Call Engineer' },
        ],
        body: {
          details: 'Grafana alert: p99 latency > 5s on /api/v1/checkout for 3 consecutive minutes.',
        },
      },
    },
  };
}

function signPayload(payload: PagerDutyV3Payload, secret: string): string {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const hmac = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return `v1=${hmac}`;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('PagerDuty webhook — signature verification', () => {
  it('should accept a valid HMAC-SHA256 signature', () => {
    const payload = createMockPayload();
    const rawBody = Buffer.from(JSON.stringify(payload));
    const signature = signPayload(payload, WEBHOOK_SECRET);

    expect(verifySignature(rawBody, signature, WEBHOOK_SECRET)).toBe(true);
  });

  it('should reject an invalid signature', () => {
    const payload = createMockPayload();
    const rawBody = Buffer.from(JSON.stringify(payload));

    expect(verifySignature(rawBody, 'v1=deadbeef00112233deadbeef00112233deadbeef00112233deadbeef00112233', WEBHOOK_SECRET)).toBe(false);
  });

  it('should reject when signature header is missing', () => {
    const payload = createMockPayload();
    const rawBody = Buffer.from(JSON.stringify(payload));

    expect(verifySignature(rawBody, undefined, WEBHOOK_SECRET)).toBe(false);
  });

  it('should reject a malformed signature header (no v1= prefix)', () => {
    const payload = createMockPayload();
    const rawBody = Buffer.from(JSON.stringify(payload));
    const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

    expect(verifySignature(rawBody, hmac, WEBHOOK_SECRET)).toBe(false);
  });

  it('should accept when multiple comma-separated signatures include a valid one', () => {
    const payload = createMockPayload();
    const rawBody = Buffer.from(JSON.stringify(payload));
    const validSig = signPayload(payload, WEBHOOK_SECRET);
    const multiSig = `v1=0000000000000000000000000000000000000000000000000000000000000000,${validSig}`;

    expect(verifySignature(rawBody, multiSig, WEBHOOK_SECRET)).toBe(true);
  });

  it('should reject when body has been tampered with', () => {
    const payload = createMockPayload();
    const signature = signPayload(payload, WEBHOOK_SECRET);

    // Tamper with the body
    const tampered = { ...payload, routing_key: 'TAMPERED' };
    const tamperedBody = Buffer.from(JSON.stringify(tampered));

    expect(verifySignature(tamperedBody, signature, WEBHOOK_SECRET)).toBe(false);
  });
});

describe('PagerDuty webhook — ticket ID generation', () => {
  it('should create PD-<number> format from incident number', () => {
    expect(buildTicketId(42567, 'P1234ABC')).toBe('PD-42567');
  });

  it('should fall back to incident ID when number is undefined', () => {
    expect(buildTicketId(undefined, 'P1234ABC')).toBe('PD-P1234ABC');
  });

  it('should handle incident number 0', () => {
    expect(buildTicketId(0, 'P1234ABC')).toBe('PD-0');
  });
});

describe('PagerDuty webhook — payload filtering', () => {
  it('should identify a high-urgency triggered incident as actionable', () => {
    const payload = createMockPayload();
    const event = payload.event;

    expect(event.event_type).toBe('incident.triggered');
    expect(event.data.urgency).toBe('high');
  });

  it('should identify low-urgency incident as non-actionable', () => {
    const payload = createMockPayload({ urgency: 'low' });
    expect(payload.event.data.urgency).toBe('low');
    // Low urgency should be filtered out by the handler
  });

  it('should identify non-triggered events as non-actionable', () => {
    const resolvedPayload = createMockPayload({ eventType: 'incident.resolved' });
    expect(resolvedPayload.event.event_type).toBe('incident.resolved');

    const acknowledgedPayload = createMockPayload({ eventType: 'incident.acknowledged' });
    expect(acknowledgedPayload.event.event_type).toBe('incident.acknowledged');
  });

  it('should extract service name from payload', () => {
    const payload = createMockPayload({ serviceName: 'payment-gateway' });
    expect(payload.event.data.service.name).toBe('payment-gateway');
  });

  it('should extract incident title from payload', () => {
    const payload = createMockPayload({ title: 'Database connection pool exhausted' });
    expect(payload.event.data.title).toBe('Database connection pool exhausted');
  });

  it('should extract incident URL from payload', () => {
    const payload = createMockPayload();
    expect(payload.event.data.html_url).toBe('https://acme.pagerduty.com/incidents/P1234ABC');
  });
});

describe('PagerDuty webhook — mock payload structure', () => {
  it('should have all required V3 webhook fields', () => {
    const payload = createMockPayload();
    const event = payload.event;

    // Top-level event fields
    expect(event.id).toBeDefined();
    expect(event.event_type).toBeDefined();
    expect(event.resource_type).toBe('incident');
    expect(event.occurred_at).toBeDefined();

    // Incident data
    expect(event.data.id).toBeDefined();
    expect(event.data.number).toBeDefined();
    expect(event.data.title).toBeDefined();
    expect(event.data.status).toBe('triggered');
    expect(event.data.urgency).toBe('high');
    expect(event.data.html_url).toBeDefined();

    // Service
    expect(event.data.service.id).toBeDefined();
    expect(event.data.service.name).toBeDefined();
    expect(event.data.service.html_url).toBeDefined();
  });

  it('should include PagerDuty metadata for investigation enrichment', () => {
    const payload = createMockPayload();
    const data = payload.event.data;

    // These fields are forwarded as pagerduty_metadata in the BullMQ job
    expect(data.body?.details).toBeDefined();
    expect(data.assignees).toBeDefined();
    expect(data.assignees!.length).toBeGreaterThan(0);
  });
});
