/**
 * POST /api/v1/investigate/batch
 *
 * Accepts a batch of ticket IDs, creates investigation records for each,
 * enqueues all to BullMQ, and returns 202 Accepted with all investigation IDs.
 */

import { Router } from 'express';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { query } from '../../storage/db.js';
import { investigationRateLimit } from '../middleware/rate-limit.js';
import { validateBody, investigateBatchSchema, type InvestigateBatchBody } from '../middleware/validation.js';
import { createLogger } from '../../observability/index.js';
import { pmInvestigationTotal } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:batch');

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
const batchQueue = new Queue('investigations', {
  connection: { url: REDIS_URL },
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const batchRouter = Router();

batchRouter.post(
  '/',
  investigationRateLimit,
  validateBody(investigateBatchSchema),
  async (req, res) => {
    const body = req.body as InvestigateBatchBody;
    const identity = req.user?.identity ?? 'unknown';
    const batchId = randomUUID();

    try {
      const investigationIds: string[] = [];

      for (const ticketId of body.ticket_ids) {
        // --- Create DB record ---
        const insertResult = await query<{ id: string }>(
          `INSERT INTO investigations (ticket_id, domain, mode, callback_url, requested_by, status, batch_id)
           VALUES ($1, $2, 'balanced', $3, $4, 'queued', $5)
           RETURNING id`,
          [ticketId, body.domain ?? null, body.callback_url ?? null, identity, batchId],
        );

        const investigationId = insertResult.rows[0].id;
        investigationIds.push(investigationId);

        // --- Enqueue to BullMQ ---
        await batchQueue.add(
          'investigate',
          {
            investigation_id: investigationId,
            ticket_id: ticketId,
            domain: body.domain,
            mode: 'balanced',
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
        pmInvestigationTotal.inc({ domain: 'unknown', status: 'queued', trigger_source: 'batch' });
      }

      log.info('Batch investigations queued', {
        batch_id: batchId,
        count: investigationIds.length,
        ticket_ids: body.ticket_ids,
      });

      res.status(202).json({
        batch_id: batchId,
        investigation_ids: investigationIds,
        status: 'pending',
      });
    } catch (err) {
      log.error('Failed to create batch investigations', {
        error: err instanceof Error ? err.message : String(err),
        batch_id: batchId,
        ticket_ids: body.ticket_ids,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

/**
 * Gracefully close the BullMQ queue connection.
 */
export async function closeBatchQueue(): Promise<void> {
  await batchQueue.close();
}
