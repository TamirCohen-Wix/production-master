/**
 * Feedback endpoints:
 *   POST /api/v1/investigations/:id/feedback  — submit feedback for an investigation
 *   GET  /api/v1/investigations/:id/feedback  — list feedback for an investigation
 */

import { Router } from 'express';
import { z } from 'zod';
import { query } from '../../storage/db.js';
import * as FeedbackModel from '../../storage/models/feedback.js';
import { validateBody } from '../middleware/validation.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:feedback');

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const feedbackSchema = z.object({
  rating: z.enum(['accurate', 'partially_accurate', 'inaccurate']),
  corrected_root_cause: z.string().optional(),
  submitted_by: z.string().max(100).optional(),
});

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const feedbackRouter = Router({ mergeParams: true });

// --- POST /:id/feedback — submit feedback ---
feedbackRouter.post(
  '/:id/feedback',
  queryRateLimit,
  validateBody(feedbackSchema),
  async (req, res) => {
    try {
      const investigationId = req.params.id;

      // Validate investigation exists
      const inv = await query(
        'SELECT id FROM investigations WHERE id = $1',
        [investigationId],
      );

      if (inv.rows.length === 0) {
        res.status(404).json({ error: 'Investigation not found' });
        return;
      }

      const feedback = await FeedbackModel.create({
        investigation_id: investigationId as string,
        rating: req.body.rating,
        corrected_root_cause: req.body.corrected_root_cause,
        submitted_by: req.body.submitted_by,
      });

      log.info('Feedback submitted', {
        investigation_id: investigationId,
        feedback_id: feedback.id,
        rating: feedback.rating,
      });

      res.status(201).json({ feedback_id: feedback.id });
    } catch (err) {
      log.error('Failed to submit feedback', {
        error: err instanceof Error ? err.message : String(err),
        investigation_id: req.params.id,
      });
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// --- GET /:id/feedback — list feedback for investigation ---
feedbackRouter.get('/:id/feedback', queryRateLimit, async (req, res) => {
  try {
    const investigationId = req.params.id;

    // Validate investigation exists
    const inv = await query(
      'SELECT id FROM investigations WHERE id = $1',
      [investigationId],
    );

    if (inv.rows.length === 0) {
      res.status(404).json({ error: 'Investigation not found' });
      return;
    }

    const feedback = await FeedbackModel.getByInvestigation(investigationId as string);
    res.json({ data: feedback });
  } catch (err) {
    log.error('Failed to fetch feedback', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
