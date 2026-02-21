/**
 * POST /api/v1/investigate
 *
 * Accepts an investigation request, deduplicates by ticket_id, creates a DB
 * record, enqueues the job to BullMQ, and returns 202 Accepted.
 */

import { Router } from 'express';
import { Queue } from 'bullmq';
import { query } from '../../storage/db.js';
import { investigationRateLimit } from '../middleware/rate-limit.js';
import { validateBody, investigateSchema, type InvestigateBody } from '../middleware/validation.js';
import { createLogger } from '../../observability/index.js';
import { pmInvestigationTotal } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:investigate');

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const investigationQueue = new Queue('investigations', {
  connection: { url: REDIS_URL },
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const investigateRouter = Router();

investigateRouter.post(
  '/',
  investigationRateLimit,
  validateBody(investigateSchema),
  async (req, res) => {
    const body = req.body as InvestigateBody;
    const identity = req.user?.identity ?? 'unknown';

    try {
      // --- Deduplication: check for active investigation on same ticket ---
      const existing = await query<{ id: string; status: string }>(
        `SELECT id, status FROM investigations
         WHERE ticket_id = $1 AND status NOT IN ('completed', 'failed')
         LIMIT 1`,
        [body.ticket_id],
      );

      if (existing.rows.length > 0) {
        const inv = existing.rows[0];
        res.status(409).json({
          error: 'Active investigation already exists for this ticket',
          investigation_id: inv.id,
          status: inv.status,
        });
        return;
      }

      // --- Create DB record ---
      const insertResult = await query<{ id: string }>(
        `INSERT INTO investigations (ticket_id, domain, mode, callback_url, requested_by, status)
         VALUES ($1, $2, $3, $4, $5, 'queued')
         RETURNING id`,
        [body.ticket_id, body.domain ?? null, body.mode, body.callback_url ?? null, identity],
      );

      const investigationId = insertResult.rows[0].id;

      // --- Enqueue to BullMQ ---
      await investigationQueue.add(
        'investigate',
        {
          investigation_id: investigationId,
          ticket_id: body.ticket_id,
          domain: body.domain,
          mode: body.mode,
          callback_url: body.callback_url,
          requested_by: identity,
        },
        {
          jobId: investigationId,
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
        },
      );

      // --- Metrics ---
      pmInvestigationTotal.inc({
        domain: body.domain ?? 'unknown',
        status: 'queued',
        trigger_source: 'api',
      });

      log.info('Investigation queued', {
        investigation_id: investigationId,
        ticket_id: body.ticket_id,
        mode: body.mode,
      });

      res.status(202).json({
        investigation_id: investigationId,
        status: 'queued',
        message: 'Investigation has been queued for processing.',
      });
    } catch (err) {
      log.error('Failed to create investigation', {
        error: err instanceof Error ? err.message : String(err),
        ticket_id: body.ticket_id,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * Gracefully close the BullMQ queue connection.
 */
export async function closeInvestigateQueue(): Promise<void> {
  await investigationQueue.close();
}
