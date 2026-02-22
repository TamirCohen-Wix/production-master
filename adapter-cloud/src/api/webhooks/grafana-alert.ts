/**
 * POST /api/v1/webhooks/grafana-alert
 *
 * Receives Grafana alerting webhook payloads, extracts alert metadata,
 * maps the service to a domain config, and auto-triggers an investigation
 * with trigger_source "grafana_alert".
 *
 * Deduplication: skips if the same service was investigated within
 * the last 2 hours.
 *
 * Returns 200 immediately to avoid Grafana retry storms.
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { createLogger, pmInvestigationTotal } from '../../observability/index.js';
import { getQueue } from '../../queues/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:webhooks:grafana-alert');

// ---------------------------------------------------------------------------
// Types — Grafana Alerting Webhook Payload
// ---------------------------------------------------------------------------

/** A single alert from the Grafana webhook payload. */
export interface GrafanaAlert {
  status: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: string;
  endsAt: string;
  generatorURL?: string;
  fingerprint: string;
  silenceURL?: string;
  dashboardURL?: string;
  panelURL?: string;
  values?: Record<string, number>;
}

/** The top-level Grafana alerting webhook payload. */
export interface GrafanaAlertPayload {
  receiver: string;
  status: string;
  alerts: GrafanaAlert[];
  groupLabels: Record<string, string>;
  commonLabels: Record<string, string>;
  commonAnnotations: Record<string, string>;
  externalURL: string;
  version: string;
  groupKey: string;
  truncatedAlerts?: number;
  title?: string;
  state?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Domain mapping
// ---------------------------------------------------------------------------

/**
 * Map a service name (from Grafana labels) to a production-master domain.
 *
 * Looks up domain_configs for a config entry whose `services` array
 * contains the service name. Falls back to the service name lowercased.
 */
async function mapServiceToDomain(serviceName: string): Promise<string> {
  try {
    const result = await query<{ name: string }>(
      `SELECT name FROM domain_configs
       WHERE services @> $1::jsonb
       LIMIT 1`,
      [JSON.stringify([serviceName])],
    );
    if (result.rows.length > 0) {
      return result.rows[0].name;
    }
  } catch (err) {
    log.warn('Domain lookup failed, using fallback', {
      service: serviceName,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  return serviceName.toLowerCase().replace(/\s+/g, '-');
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const grafanaAlertWebhookRouter = Router();

/**
 * Health-check endpoint for Grafana webhook configuration.
 */
grafanaAlertWebhookRouter.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', handler: 'grafana-alert-webhook' });
});

/**
 * POST /api/v1/webhooks/grafana-alert
 *
 * Accepts Grafana alerting webhook payloads.
 *
 * For each firing alert:
 *   1. Extracts alert name, service name, dashboard URL from labels
 *   2. Maps service to a domain config
 *   3. Deduplication: skips if same service investigated in last 2 hours
 *   4. Creates a DB investigation record
 *   5. Enqueues the job with trigger_source "grafana_alert"
 *
 * Returns 200 immediately to prevent Grafana retries.
 */
grafanaAlertWebhookRouter.post('/', async (req, res) => {
  const payload = req.body as GrafanaAlertPayload;

  if (!payload.alerts || !Array.isArray(payload.alerts)) {
    res.status(200).json({ status: 'ignored', reason: 'No alerts in payload' });
    return;
  }

  const results: Array<{
    alert: string;
    service: string;
    status: 'triggered' | 'skipped' | 'error';
    reason?: string;
    investigation_id?: string;
  }> = [];

  for (const alert of payload.alerts) {
    // Only process firing alerts
    if (alert.status !== 'firing') {
      results.push({
        alert: alert.labels?.alertname ?? 'unknown',
        service: alert.labels?.service ?? 'unknown',
        status: 'skipped',
        reason: `Alert status "${alert.status}" is not "firing"`,
      });
      continue;
    }

    const alertName = alert.labels?.alertname ?? 'unknown-alert';
    const serviceName = alert.labels?.service ?? alert.labels?.job ?? 'unknown';
    const dashboardURL = alert.dashboardURL ?? alert.labels?.dashboard_url ?? '';

    if (serviceName === 'unknown') {
      results.push({
        alert: alertName,
        service: serviceName,
        status: 'skipped',
        reason: 'No service name in alert labels',
      });
      continue;
    }

    try {
      // --- Map service to domain ---
      const domain = await mapServiceToDomain(serviceName);

      // --- Deduplication: skip if same service investigated in last 2 hours ---
      const recentInvestigation = await query<{ id: string }>(
        `SELECT id FROM investigations
         WHERE trigger_source = 'grafana_alert'
           AND domain = $1
           AND created_at > NOW() - INTERVAL '2 hours'
           AND status NOT IN ('failed')
         ORDER BY created_at DESC
         LIMIT 1`,
        [domain],
      );

      if (recentInvestigation.rows.length > 0) {
        log.info('Duplicate Grafana alert — recent investigation exists', {
          alert_name: alertName,
          service: serviceName,
          domain,
          existing_investigation: recentInvestigation.rows[0].id,
        });
        results.push({
          alert: alertName,
          service: serviceName,
          status: 'skipped',
          reason: 'Service already investigated within the last 2 hours',
          investigation_id: recentInvestigation.rows[0].id,
        });
        continue;
      }

      // --- Build synthetic ticket ID ---
      const ticketId = `GRAFANA-${alert.fingerprint}`;

      // --- Create DB record ---
      const insertResult = await query<{ id: string }>(
        `INSERT INTO investigations (ticket_id, domain, trigger_source, status, phase)
         VALUES ($1, $2, $3, 'queued', 'intake')
         RETURNING id`,
        [ticketId, domain, 'grafana_alert'],
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
          trigger_source: 'grafana_alert',
          grafana_metadata: {
            alert_name: alertName,
            service_name: serviceName,
            dashboard_url: dashboardURL,
            alert_status: alert.status,
            starts_at: alert.startsAt,
            fingerprint: alert.fingerprint,
            labels: alert.labels,
            annotations: alert.annotations,
            values: alert.values,
          },
        },
        {
          jobId: investigationId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          priority: 2,
        },
      );

      // --- Metrics ---
      pmInvestigationTotal.inc({ domain: 'unknown', status: 'queued', trigger_source: 'grafana_alert' });

      log.info('Grafana alert enqueued for investigation', {
        investigation_id: investigationId,
        ticket_id: ticketId,
        domain,
        alert_name: alertName,
        service: serviceName,
      });

      results.push({
        alert: alertName,
        service: serviceName,
        status: 'triggered',
        investigation_id: investigationId,
      });
    } catch (err) {
      log.error('Failed to process Grafana alert', {
        error: err instanceof Error ? err.message : String(err),
        alert_name: alertName,
        service: serviceName,
      });
      results.push({
        alert: alertName,
        service: serviceName,
        status: 'error',
        reason: 'Internal processing error',
      });
    }
  }

  res.status(200).json({
    status: 'processed',
    total: payload.alerts.length,
    triggered: results.filter((r) => r.status === 'triggered').length,
    skipped: results.filter((r) => r.status === 'skipped').length,
    errors: results.filter((r) => r.status === 'error').length,
    results,
  });
});

