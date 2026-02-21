/**
 * Similar-investigations endpoint:
 *   GET /api/v1/investigations/:id/similar?limit=5
 *
 * Uses pgvector cosine distance (<=> operator) to find the most
 * semantically similar past investigations based on report summary
 * embeddings.
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:similar');

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const similarRouter = Router();

// --- GET /:id/similar — find similar investigations ---
similarRouter.get('/:id/similar', queryRateLimit, async (req, res) => {
  try {
    const investigationId = req.params.id;
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string, 10) || 5));

    // Fetch the embedding for the requested investigation
    const embeddingResult = await query<{ embedding: string }>(
      `SELECT embedding FROM incident_embeddings WHERE investigation_id = $1`,
      [investigationId],
    );

    if (embeddingResult.rows.length === 0) {
      // Check if the investigation exists at all
      const inv = await query(
        'SELECT id FROM investigations WHERE id = $1',
        [investigationId],
      );

      if (inv.rows.length === 0) {
        res.status(404).json({ error: 'Investigation not found' });
        return;
      }

      res.status(404).json({ error: 'No embedding found for this investigation' });
      return;
    }

    const sourceEmbedding = embeddingResult.rows[0].embedding;

    // Find similar investigations using cosine distance, excluding the
    // source investigation itself.
    const similarResult = await query<{
      investigation_id: string;
      ticket_id: string;
      similarity_score: number;
      summary: string;
    }>(
      `SELECT ie.investigation_id,
              i.ticket_id,
              1 - (ie.embedding <=> $1) AS similarity_score,
              ie.summary
       FROM incident_embeddings ie
       JOIN investigations i ON ie.investigation_id = i.id
       WHERE ie.investigation_id != $2
       ORDER BY ie.embedding <=> $1
       LIMIT $3`,
      [sourceEmbedding, investigationId, limit],
    );

    res.json(similarResult.rows);
  } catch (err) {
    log.error('Failed to find similar investigations', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
