/**
 * POST /api/v1/webhooks/deploy
 *
 * Receives post-deploy webhook payloads from CI/CD pipelines, stores the
 * deploy event, schedules a delayed health check (5 minutes), and
 * auto-triggers an investigation if error rates increased after deploy.
 *
 * Returns 200 immediately.
 */

import { Router } from 'express';
import { Queue } from 'bullmq';
import { query } from '../../storage/db.js';
import { createLogger, pmInvestigationTotal } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:webhooks:cicd');

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const investigationQueue = new Queue('investigations', {
  connection: { url: REDIS_URL },
});
const healthCheckQueue = new Queue('health-checks', {
  connection: { url: REDIS_URL },
});

/** Delay before post-deploy health check (ms). Default: 5 minutes. */
const POST_DEPLOY_CHECK_DELAY_MS = parseInt(
  process.env.POST_DEPLOY_CHECK_DELAY_MS ?? '300000',
  10,
);

// ---------------------------------------------------------------------------
// Types — Deploy Webhook Payload
// ---------------------------------------------------------------------------

export interface DeployWebhookPayload {
  /** Name of the deployed service. */
  service: string;
  /** Version or git SHA that was deployed. */
  version: string;
  /** Who triggered the deploy. */
  deployer?: string;
  /** Target environment (e.g. "production", "staging"). */
  environment?: string;
  /** ISO timestamp of deploy completion. */
  deployed_at?: string;
  /** Optional link to the deploy pipeline run. */
  pipeline_url?: string;
  /** Optional link to the commit / PR. */
  commit_url?: string;
  /** Additional metadata. */
  metadata?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Domain mapping
// ---------------------------------------------------------------------------

/**
 * Map a service name to a production-master domain.
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

export const cicdWebhookRouter = Router();

/**
 * Health-check endpoint for CI/CD webhook configuration.
 */
cicdWebhookRouter.get('/', (_req, res) => {
  res.status(200).json({ status: 'ok', handler: 'cicd-deploy-webhook' });
});

/**
 * POST /api/v1/webhooks/deploy
 *
 * Accepts post-deploy webhook payloads.
 *
 * Steps:
 *   1. Validates required fields (service, version)
 *   2. Stores the deploy event in the database
 *   3. Schedules a delayed health check (5 min) via BullMQ
 *   4. The delayed job checks error rates; if they increased,
 *      it auto-triggers an investigation with trigger_source "post_deploy"
 *   5. Returns 200 immediately
 */
cicdWebhookRouter.post('/', async (req, res) => {
  const payload = req.body as DeployWebhookPayload;

  // --- Validate required fields ---
  if (!payload.service || !payload.version) {
    res.status(200).json({
      status: 'ignored',
      reason: 'Missing required fields: service, version',
    });
    return;
  }

  const serviceName = payload.service;
  const version = payload.version;
  const deployer = payload.deployer ?? 'unknown';
  const environment = payload.environment ?? 'production';
  const deployedAt = payload.deployed_at ?? new Date().toISOString();

  log.info('Deploy webhook received', {
    service: serviceName,
    version,
    deployer,
    environment,
  });

  try {
    // --- Map service to domain ---
    const domain = await mapServiceToDomain(serviceName);

    // --- Store deploy event ---
    await query(
      `INSERT INTO investigations (ticket_id, domain, trigger_source, status, phase, findings_summary)
       VALUES ($1, $2, $3, 'pending', 'deploy_watch', $4)
       RETURNING id`,
      [
        `DEPLOY-${serviceName}-${version}`,
        domain,
        'post_deploy',
        JSON.stringify({
          type: 'deploy_event',
          service: serviceName,
          version,
          deployer,
          environment,
          deployed_at: deployedAt,
          pipeline_url: payload.pipeline_url ?? null,
          commit_url: payload.commit_url ?? null,
          metadata: payload.metadata ?? {},
        }),
      ],
    );

    // --- Schedule delayed health check ---
    await healthCheckQueue.add(
      'post-deploy-check',
      {
        service: serviceName,
        version,
        domain,
        deployer,
        environment,
        deployed_at: deployedAt,
        pipeline_url: payload.pipeline_url,
        trigger_source: 'post_deploy',
      },
      {
        delay: POST_DEPLOY_CHECK_DELAY_MS,
        attempts: 2,
        backoff: { type: 'exponential', delay: 30_000 },
        jobId: `deploy-check-${serviceName}-${version}-${Date.now()}`,
      },
    );

    log.info('Post-deploy health check scheduled', {
      service: serviceName,
      version,
      domain,
      delay_ms: POST_DEPLOY_CHECK_DELAY_MS,
    });

    res.status(200).json({
      status: 'accepted',
      service: serviceName,
      version,
      domain,
      health_check_delay_ms: POST_DEPLOY_CHECK_DELAY_MS,
      message: `Deploy recorded. Health check scheduled in ${POST_DEPLOY_CHECK_DELAY_MS / 1000}s.`,
    });
  } catch (err) {
    log.error('Failed to process deploy webhook', {
      error: err instanceof Error ? err.message : String(err),
      service: serviceName,
      version,
    });
    res.status(200).json({
      status: 'error',
      reason: 'Internal processing error — deploy event may not have been stored',
    });
  }
});

/**
 * Gracefully close the BullMQ queue connections.
 */
export async function closeCicdQueues(): Promise<void> {
  await investigationQueue.close();
  await healthCheckQueue.close();
}
