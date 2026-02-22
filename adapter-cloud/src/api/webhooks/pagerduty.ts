/**
 * POST /api/v1/webhooks/pagerduty
 *
 * Receives PagerDuty V3 webhook events, filters for high-urgency
 * incident.triggered events (P1/P2), maps the PagerDuty service to a
 * domain config, and enqueues an investigation with trigger_source
 * "pagerduty".
 *
 * Validates the PagerDuty webhook signature (HMAC-SHA256) before
 * processing any event payload.
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { query } from '../../storage/db.js';
import { createLogger, pmInvestigationTotal } from '../../observability/index.js';
import { getQueue } from '../../queues/index.js';
import { getPagerdutyWebhookSecret } from '../../config/wix-config.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:webhooks:pagerduty');

// ---------------------------------------------------------------------------
// Types — PagerDuty V3 Webhook Payload
// ---------------------------------------------------------------------------

/** Subset of PagerDuty V3 webhook event we care about. */
export interface PagerDutyV3Event {
  id: string;
  event: {
    id: string;
    event_type: string;
    resource_type: string;
    occurred_at: string;
    agent?: {
      type: string;
      name?: string;
    };
    data: {
      id: string;
      number?: number;
      title: string;
      status: string;
      urgency: string;
      html_url: string;
      service: {
        id: string;
        name: string;
        html_url: string;
      };
      assignees?: Array<{
        id: string;
        summary: string;
      }>;
      body?: {
        details?: string;
      };
    };
  };
}

export interface PagerDutyV3Payload {
  routing_key?: string;
  event: PagerDutyV3Event['event'];
}

// ---------------------------------------------------------------------------
// Signature verification
// ---------------------------------------------------------------------------

// Removed module-level read; resolved lazily via getPagerdutyWebhookSecret()

/**
 * Verify the PagerDuty V3 webhook HMAC-SHA256 signature.
 *
 * PagerDuty sends the signature in the `x-pagerduty-signature` header
 * as `v1=<hex-digest>`. The digest is computed over the raw request body
 * using the shared webhook signing secret.
 */
export function verifySignature(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  secret: string,
): boolean {
  if (!signatureHeader) return false;

  // PagerDuty sends: "v1=<hex>"
  const signatures = signatureHeader.split(',').map((s) => s.trim());
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return signatures.some((sig) => {
    const parts = sig.split('=');
    if (parts.length !== 2 || parts[0] !== 'v1') return false;
    return crypto.timingSafeEqual(
      Buffer.from(parts[1], 'hex'),
      Buffer.from(expected, 'hex'),
    );
  });
}

// ---------------------------------------------------------------------------
// Domain mapping
// ---------------------------------------------------------------------------

/**
 * Map a PagerDuty service name to a production-master domain.
 *
 * Looks up domain_configs for a config entry whose `services` array
 * contains the PagerDuty service name (case-insensitive match).
 * Falls back to the service name lowercased if no mapping exists.
 */
export async function mapServiceToDomain(
  serviceName: string,
): Promise<string> {
  try {
    const result = await query<{ repo: string }>(
      `SELECT repo FROM domain_configs
       WHERE config->'services' ? $1
          OR config->'pagerduty_services' ? $1
       LIMIT 1`,
      [serviceName],
    );
    if (result.rows.length > 0) {
      return result.rows[0].repo;
    }
  } catch (err) {
    log.warn('Domain lookup failed, using fallback', {
      service: serviceName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Fallback: use the PagerDuty service name, normalized
  return serviceName.toLowerCase().replace(/\s+/g, '-');
}

// ---------------------------------------------------------------------------
// Ticket ID extraction
// ---------------------------------------------------------------------------

/**
 * Generate a synthetic ticket ID from the PagerDuty incident number.
 * Format: "PD-<incident_number>"
 */
export function buildTicketId(incidentNumber: number | undefined, incidentId: string): string {
  if (incidentNumber !== undefined) {
    return `PD-${incidentNumber}`;
  }
  // Fallback to the incident ID if number is missing
  return `PD-${incidentId}`;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const pagerdutyWebhookRouter = Router();

/**
 * Health-check / verification endpoint for PagerDuty webhook configuration.
 * PagerDuty sends a GET to verify the endpoint during setup.
 */
pagerdutyWebhookRouter.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', handler: 'pagerduty-webhook' });
});

/**
 * POST /api/v1/webhooks/pagerduty
 *
 * Accepts PagerDuty V3 webhook events.
 *
 * Filter criteria:
 *   - event_type === "incident.triggered"
 *   - urgency === "high" (P1/P2 incidents only)
 *
 * On match:
 *   1. Maps PagerDuty service to a domain config
 *   2. Creates a synthetic ticket_id "PD-<incident_number>"
 *   3. Creates a DB investigation record
 *   4. Enqueues the job to BullMQ with trigger_source "pagerduty"
 *   5. Returns 202 Accepted
 *
 * Non-matching events return 200 OK (acknowledged but ignored).
 */
pagerdutyWebhookRouter.post('/', async (req, res) => {
  // --- Signature verification ---
  const secret = getPagerdutyWebhookSecret();
  if (secret) {
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
    const sigHeader = req.headers['x-pagerduty-signature'] as string | undefined;

    if (!verifySignature(rawBody, sigHeader, secret)) {
      log.warn('PagerDuty webhook signature verification failed');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }
  } else {
    log.warn('PAGERDUTY_WEBHOOK_SECRET not configured — skipping signature verification');
  }

  // --- Parse event ---
  const payload = req.body as PagerDutyV3Payload;
  const event = payload.event;

  if (!event) {
    res.status(400).json({ error: 'Missing event in payload' });
    return;
  }

  const eventType = event.event_type;
  const urgency = event.data?.urgency;

  log.info('PagerDuty webhook received', {
    event_type: eventType,
    incident_id: event.data?.id,
    urgency,
    service: event.data?.service?.name,
  });

  // --- Filter: only incident.triggered + high urgency ---
  if (eventType !== 'incident.triggered') {
    res.status(200).json({
      status: 'ignored',
      reason: `Event type "${eventType}" is not handled. Only "incident.triggered" is processed.`,
    });
    return;
  }

  if (urgency !== 'high') {
    res.status(200).json({
      status: 'ignored',
      reason: `Urgency "${urgency}" is not high. Only P1/P2 (high urgency) incidents are processed.`,
    });
    return;
  }

  try {
    // --- Extract fields ---
    const incidentData = event.data;
    const serviceName = incidentData.service.name;
    const incidentTitle = incidentData.title;
    const incidentUrl = incidentData.html_url;
    const ticketId = buildTicketId(incidentData.number, incidentData.id);

    // --- Map service to domain ---
    const domain = await mapServiceToDomain(serviceName);

    // --- Deduplication: check for active investigation on same ticket ---
    const existing = await query<{ id: string; status: string }>(
      `SELECT id, status FROM investigations
       WHERE ticket_id = $1 AND status NOT IN ('completed', 'failed')
       LIMIT 1`,
      [ticketId],
    );

    if (existing.rows.length > 0) {
      const inv = existing.rows[0];
      log.info('Duplicate PagerDuty incident — investigation already exists', {
        ticket_id: ticketId,
        investigation_id: inv.id,
        status: inv.status,
      });
      res.status(200).json({
        status: 'duplicate',
        investigation_id: inv.id,
        ticket_id: ticketId,
        message: 'Active investigation already exists for this incident.',
      });
      return;
    }

    // --- Create DB record ---
    const insertResult = await query<{ id: string }>(
      `INSERT INTO investigations (ticket_id, domain, trigger_source, status, phase)
       VALUES ($1, $2, $3, 'queued', 'intake')
       RETURNING id`,
      [ticketId, domain, 'pagerduty'],
    );

    const investigationId = insertResult.rows[0].id;

    // --- Enqueue to BullMQ ---
    await getQueue('investigations').add(
      'investigate',
      {
        investigation_id: investigationId,
        ticket_id: ticketId,
        domain,
        mode: 'fast',
        trigger_source: 'pagerduty',
        pagerduty_metadata: {
          incident_id: incidentData.id,
          incident_number: incidentData.number,
          incident_title: incidentTitle,
          incident_url: incidentUrl,
          service_id: incidentData.service.id,
          service_name: serviceName,
          urgency,
          occurred_at: event.occurred_at,
        },
      },
      {
        jobId: investigationId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
        priority: 1, // High priority for PD incidents
      },
    );

    // --- Metrics ---
    pmInvestigationTotal.inc({ domain: 'unknown', status: 'queued', trigger_source: 'pagerduty' });

    log.info('PagerDuty incident enqueued for investigation', {
      investigation_id: investigationId,
      ticket_id: ticketId,
      domain,
      service: serviceName,
      incident_title: incidentTitle,
    });

    res.status(202).json({
      investigation_id: investigationId,
      ticket_id: ticketId,
      domain,
      status: 'queued',
      message: 'PagerDuty incident has been enqueued for investigation.',
    });
  } catch (err) {
    log.error('Failed to process PagerDuty webhook', {
      error: err instanceof Error ? err.message : String(err),
      event_type: eventType,
      incident_id: event.data?.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

