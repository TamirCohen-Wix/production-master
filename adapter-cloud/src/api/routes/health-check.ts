/**
 * POST /api/v1/health-check
 *
 * Queries error rates for primary services across monitored domains.
 * If any service exceeds the configured error-rate threshold (default:
 * 5x the baseline), an investigation is auto-triggered.
 *
 * Body: { domains?: string[] }
 *   - If domains is omitted or empty, checks all domains in domain_configs.
 *
 * Response: { checked: number, triggered: number, results: [...] }
 */

import { Router } from 'express';
import { Queue } from 'bullmq';
import { query } from '../../storage/db.js';
import { createLogger, pmInvestigationTotal } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:health-check');

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const investigationQueue = new Queue('investigations', {
  connection: { url: REDIS_URL },
});

/**
 * Error rate threshold multiplier. If a service's current error rate
 * exceeds baseline * this multiplier, an investigation is triggered.
 * Default: 5 (i.e. 5x baseline).
 */
const ERROR_RATE_THRESHOLD_MULTIPLIER = parseFloat(
  process.env.HEALTH_CHECK_THRESHOLD_MULTIPLIER ?? '5',
);

/**
 * Default baseline error rate (errors/min) used when no historical
 * data is available. Default: 1.
 */
const DEFAULT_BASELINE_ERROR_RATE = parseFloat(
  process.env.HEALTH_CHECK_DEFAULT_BASELINE ?? '1',
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DomainRow {
  name: string;
  services: string[] | string;
  settings: Record<string, unknown> | string;
}

interface ServiceCheckResult {
  service: string;
  domain: string;
  baseline_error_rate: number;
  current_error_rate: number;
  threshold: number;
  exceeded: boolean;
  investigation_id?: string;
}

interface HealthCheckRequestBody {
  domains?: string[];
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const healthCheckRouter = Router();

healthCheckRouter.post('/', async (req, res) => {
  const body = req.body as HealthCheckRequestBody;
  const requestedDomains = body.domains;

  try {
    // --- Fetch domains ---
    let domainRows: DomainRow[];

    if (requestedDomains && requestedDomains.length > 0) {
      const result = await query<DomainRow>(
        `SELECT name, services, settings FROM domain_configs
         WHERE name = ANY($1)
         ORDER BY name`,
        [requestedDomains],
      );
      domainRows = result.rows;
    } else {
      const result = await query<DomainRow>(
        'SELECT name, services, settings FROM domain_configs ORDER BY name',
      );
      domainRows = result.rows;
    }

    if (domainRows.length === 0) {
      res.status(200).json({
        checked: 0,
        triggered: 0,
        results: [],
        message: 'No domains found to check.',
      });
      return;
    }

    // --- Check each domain's services ---
    const results: ServiceCheckResult[] = [];
    let triggeredCount = 0;

    for (const domain of domainRows) {
      const services = parseServices(domain.services);
      const settings = parseSettings(domain.settings);
      const thresholdMultiplier =
        (settings.health_check_threshold as number) ?? ERROR_RATE_THRESHOLD_MULTIPLIER;

      for (const service of services) {
        const baseline = await getBaselineErrorRate(service, domain.name);
        const current = await getCurrentErrorRate(service, domain.name);
        const threshold = baseline * thresholdMultiplier;
        const exceeded = current > threshold;

        const result: ServiceCheckResult = {
          service,
          domain: domain.name,
          baseline_error_rate: baseline,
          current_error_rate: current,
          threshold,
          exceeded,
        };

        if (exceeded) {
          // --- Deduplication: skip if already investigated in last 2 hours ---
          const recentInvestigation = await query<{ id: string }>(
            `SELECT id FROM investigations
             WHERE trigger_source = 'health_check'
               AND domain = $1
               AND created_at > NOW() - INTERVAL '2 hours'
               AND status NOT IN ('failed')
             ORDER BY created_at DESC
             LIMIT 1`,
            [domain.name],
          );

          if (recentInvestigation.rows.length > 0) {
            log.info('Health check threshold exceeded but recent investigation exists', {
              service,
              domain: domain.name,
              existing_investigation: recentInvestigation.rows[0].id,
            });
            result.investigation_id = recentInvestigation.rows[0].id;
          } else {
            // --- Trigger investigation ---
            const ticketId = `HC-${domain.name}-${service}-${Date.now()}`;

            const insertResult = await query<{ id: string }>(
              `INSERT INTO investigations (ticket_id, domain, trigger_source, status, phase)
               VALUES ($1, $2, $3, 'queued', 'intake')
               RETURNING id`,
              [ticketId, domain.name, 'health_check'],
            );

            const investigationId = insertResult.rows[0].id;

            await investigationQueue.add(
              'investigate',
              {
                investigation_id: investigationId,
                ticket_id: ticketId,
                domain: domain.name,
                mode: 'fast',
                trigger_source: 'health_check',
                health_check_metadata: {
                  service,
                  baseline_error_rate: baseline,
                  current_error_rate: current,
                  threshold,
                  threshold_multiplier: thresholdMultiplier,
                },
              },
              {
                jobId: investigationId,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5_000 },
                priority: 3,
              },
            );

            pmInvestigationTotal.inc({ trigger: 'health_check' });
            triggeredCount++;

            log.info('Health check triggered investigation', {
              investigation_id: investigationId,
              service,
              domain: domain.name,
              current_error_rate: current,
              threshold,
            });

            result.investigation_id = investigationId;
          }
        }

        results.push(result);
      }
    }

    res.status(200).json({
      checked: results.length,
      triggered: triggeredCount,
      results,
    });
  } catch (err) {
    log.error('Health check failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseServices(services: string[] | string): string[] {
  if (Array.isArray(services)) return services;
  try {
    const parsed = JSON.parse(services);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSettings(settings: Record<string, unknown> | string): Record<string, unknown> {
  if (typeof settings === 'object' && settings !== null) return settings;
  try {
    return JSON.parse(settings as string);
  } catch {
    return {};
  }
}

/**
 * Get baseline error rate for a service.
 *
 * Queries the most recent completed investigation for the domain to
 * derive a baseline. Falls back to the default baseline.
 */
async function getBaselineErrorRate(
  _service: string,
  domain: string,
): Promise<number> {
  try {
    const result = await query<{ findings_summary: Record<string, unknown> }>(
      `SELECT findings_summary FROM investigations
       WHERE domain = $1
         AND status = 'completed'
         AND findings_summary->>'baseline_error_rate' IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 1`,
      [domain],
    );

    if (result.rows.length > 0) {
      const baseline = Number(result.rows[0].findings_summary?.baseline_error_rate);
      if (!isNaN(baseline) && baseline > 0) return baseline;
    }
  } catch {
    // Fall through to default
  }

  return DEFAULT_BASELINE_ERROR_RATE;
}

/**
 * Get current error rate for a service.
 *
 * In a production deployment this would query Prometheus / Grafana.
 * For now, we estimate from recent investigation frequency as a proxy.
 */
async function getCurrentErrorRate(
  _service: string,
  domain: string,
): Promise<number> {
  try {
    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM investigations
       WHERE domain = $1
         AND created_at > NOW() - INTERVAL '1 hour'`,
      [domain],
    );

    // Use investigation frequency as a proxy for error rate
    return parseInt(result.rows[0]?.count ?? '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Gracefully close the BullMQ queue connection.
 */
export async function closeHealthCheckQueue(): Promise<void> {
  await investigationQueue.close();
}
