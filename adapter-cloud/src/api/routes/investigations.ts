/**
 * Investigation read endpoints:
 *   GET /api/v1/investigations/:id         — single investigation
 *   GET /api/v1/investigations/:id/report  — investigation report
 *   GET /api/v1/investigations             — list with pagination
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:investigations');

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const investigationsRouter = Router();

// --- GET /:id — single investigation ---
investigationsRouter.get('/:id', queryRateLimit, async (req, res) => {
  try {
    const result = await query<{
      id: string;
      ticket_id: string;
      domain: string | null;
      mode: string;
      status: string;
      requested_by: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, ticket_id, domain, mode, status, requested_by, created_at, updated_at
       FROM investigations WHERE id = $1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Investigation not found' });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    log.error('Failed to fetch investigation', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /:id/report — investigation report ---
investigationsRouter.get('/:id/report', queryRateLimit, async (req, res) => {
  try {
    const result = await query<{
      id: string;
      investigation_id: string;
      verdict: string;
      confidence: number;
      summary: string;
      evidence: unknown;
      recommendations: unknown;
      created_at: string;
    }>(
      `SELECT id, investigation_id, verdict, confidence, summary, evidence, recommendations, created_at
       FROM investigation_reports WHERE investigation_id = $1
       ORDER BY created_at DESC LIMIT 1`,
      [req.params.id],
    );

    if (result.rows.length === 0) {
      // Check if the investigation exists at all
      const inv = await query(
        'SELECT id, status FROM investigations WHERE id = $1',
        [req.params.id],
      );

      if (inv.rows.length === 0) {
        res.status(404).json({ error: 'Investigation not found' });
        return;
      }

      res.status(404).json({
        error: 'Report not yet available',
        investigation_status: (inv.rows[0] as { status: string }).status,
      });
      return;
    }

    res.json(result.rows[0]);
  } catch (err) {
    log.error('Failed to fetch report', {
      error: err instanceof Error ? err.message : String(err),
      investigation_id: req.params.id,
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET / — list investigations with pagination ---
investigationsRouter.get('/', queryRateLimit, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;
    const status = req.query.status as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM investigations ${whereClause}`,
      params,
    );

    const total = parseInt(countResult.rows[0].count, 10);

    const dataResult = await query(
      `SELECT id, ticket_id, domain, mode, status, requested_by, created_at, updated_at
       FROM investigations ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    log.error('Failed to list investigations', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
