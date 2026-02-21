/**
 * POST /api/v1/webhooks/jira
 *
 * Receives Jira webhook payloads, filters by configured project keys,
 * deduplicates against recent investigations, maps to domain config,
 * enqueues an investigation job, and returns 200 immediately.
 *
 * Environment variables:
 *   JIRA_PROJECT_FILTER — comma-separated Jira project keys to accept (e.g. "PROD,SRE,INFRA")
 *   JIRA_WEBHOOK_SECRET — optional shared secret for HMAC-SHA256 signature verification
 *   REDIS_URL — Redis connection string for BullMQ
 */

import { Router } from 'express';
import crypto from 'node:crypto';
import { Queue } from 'bullmq';
import { query } from '../../storage/db.js';
import { createLogger, pmInvestigationTotal } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:webhook:jira');

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const investigationQueue = new Queue('investigations', {
  connection: { url: REDIS_URL },
});

/** Deduplication window: skip if same ticket investigated in last hour. */
const DEDUP_WINDOW_MINUTES = 60;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Load allowed Jira project keys from JIRA_PROJECT_FILTER env var.
 * Returns an empty set if unset (meaning accept all projects).
 */
function loadProjectFilter(): Set<string> {
  const raw = process.env.JIRA_PROJECT_FILTER ?? '';
  const keys = raw
    .split(',')
    .map((k) => k.trim().toUpperCase())
    .filter(Boolean);
  return new Set(keys);
}

/**
 * Verify the Jira webhook HMAC-SHA256 signature if JIRA_WEBHOOK_SECRET is set.
 * Returns true when the signature is valid or when no secret is configured.
 */
function verifySignature(rawBody: Buffer, signatureHeader: string | undefined): boolean {
  const secret = process.env.JIRA_WEBHOOK_SECRET;
  if (!secret) {
    // No secret configured — skip verification
    return true;
  }

  if (!signatureHeader) {
    log.warn('Jira webhook signature missing but JIRA_WEBHOOK_SECRET is set');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // Jira sends the signature as the raw hex digest
  const providedSignature = signatureHeader.replace(/^sha256=/, '');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, 'hex'),
      Buffer.from(providedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Extract the Jira project key from an issue key (e.g. "PROD-1234" -> "PROD").
 */
function extractProjectKey(issueKey: string): string {
  const idx = issueKey.lastIndexOf('-');
  return idx > 0 ? issueKey.slice(0, idx).toUpperCase() : issueKey.toUpperCase();
}

/**
 * Map a Jira project key to a domain identifier for investigation routing.
 * Uses a simple lowercase conversion; domain_configs table stores the mapping.
 */
function mapProjectToDomain(projectKey: string): string {
  return projectKey.toLowerCase();
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const jiraWebhookRouter = Router();

/**
 * Capture raw body for signature verification.
 * Express json() middleware already parsed the body, but we need the raw
 * bytes for HMAC verification. We store it via a verify callback on a
 * secondary json parser scoped to this router.
 *
 * NOTE: The server-level `express.json()` already parses before this
 * router is reached. For signature verification to work, the server must
 * be configured to preserve the raw body. As a pragmatic fallback, if
 * raw body is not available we rely on re-serialization (acceptable for
 * webhook verification where the payload is not modified in transit).
 */

jiraWebhookRouter.post('/', async (req, res) => {
  try {
    // --- Signature verification ---
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody
      ?? Buffer.from(JSON.stringify(req.body));
    const signature = req.headers['x-hub-signature'] as string | undefined;

    if (!verifySignature(rawBody, signature)) {
      log.warn('Jira webhook signature verification failed');
      res.status(401).json({ error: 'Invalid webhook signature' });
      return;
    }

    // --- Extract event type ---
    const webhookEvent: string | undefined = req.body?.webhookEvent;
    if (!webhookEvent) {
      log.debug('Jira webhook received without webhookEvent field — ignoring');
      res.status(200).json({ status: 'ignored', reason: 'no webhookEvent field' });
      return;
    }

    // Only process issue_created events
    if (webhookEvent !== 'jira:issue_created') {
      log.debug('Jira webhook event ignored', { webhookEvent });
      res.status(200).json({ status: 'ignored', reason: `event type ${webhookEvent} not handled` });
      return;
    }

    // --- Extract issue key ---
    const issueKey: string | undefined = req.body?.issue?.key;
    if (!issueKey) {
      log.warn('Jira issue_created event missing issue.key');
      res.status(200).json({ status: 'ignored', reason: 'missing issue.key' });
      return;
    }

    // --- Project key filter ---
    const projectKey = extractProjectKey(issueKey);
    const allowedProjects = loadProjectFilter();

    if (allowedProjects.size > 0 && !allowedProjects.has(projectKey)) {
      log.debug('Jira webhook project filtered out', { projectKey, issueKey });
      res.status(200).json({ status: 'ignored', reason: `project ${projectKey} not in filter` });
      return;
    }

    // --- Deduplication: skip if same ticket investigated recently ---
    const existing = await query<{ id: string }>(
      `SELECT id FROM investigations
       WHERE ticket_id = $1
         AND created_at > NOW() - INTERVAL '${DEDUP_WINDOW_MINUTES} minutes'
       LIMIT 1`,
      [issueKey],
    );

    if (existing.rows.length > 0) {
      log.info('Jira webhook deduplicated — recent investigation exists', {
        ticket_id: issueKey,
        existing_id: existing.rows[0].id,
      });
      res.status(200).json({
        status: 'deduplicated',
        existing_investigation_id: existing.rows[0].id,
      });
      return;
    }

    // --- Map project to domain ---
    const domain = mapProjectToDomain(projectKey);

    // --- Create investigation record ---
    const insertResult = await query<{ id: string }>(
      `INSERT INTO investigations (ticket_id, domain, mode, trigger_source, status)
       VALUES ($1, $2, 'balanced', 'jira_webhook', 'queued')
       RETURNING id`,
      [issueKey, domain],
    );

    const investigationId = insertResult.rows[0].id;

    // --- Enqueue to BullMQ ---
    await investigationQueue.add(
      'investigate',
      {
        investigation_id: investigationId,
        ticket_id: issueKey,
        domain,
        mode: 'balanced',
        trigger_source: 'jira_webhook',
      },
      {
        jobId: investigationId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5_000 },
      },
    );

    // --- Metrics ---
    pmInvestigationTotal.inc({ trigger: 'jira_webhook' });

    log.info('Jira webhook processed — investigation queued', {
      investigation_id: investigationId,
      ticket_id: issueKey,
      project: projectKey,
      domain,
    });

    res.status(200).json({
      status: 'accepted',
      investigation_id: investigationId,
      ticket_id: issueKey,
    });
  } catch (err) {
    log.error('Jira webhook handler error', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Gracefully close the BullMQ queue connection (for tests / shutdown).
 */
export async function closeJiraWebhookQueue(): Promise<void> {
  await investigationQueue.close();
}
