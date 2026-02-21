/**
 * Analytics endpoints:
 *   GET /api/v1/analytics/accuracy     — accuracy breakdown over time
 *   GET /api/v1/analytics/calibration  — confidence calibration per bracket
 */

import { Router } from 'express';
import { query } from '../../storage/db.js';
import { queryRateLimit } from '../middleware/rate-limit.js';
import { createLogger } from '../../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('api:analytics');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AccuracyPeriod {
  period: string;
  total: number;
  accurate: number;
  partially_accurate: number;
  inaccurate: number;
  accuracy_rate: number;
}

interface CalibrationBracket {
  confidence_range: string;
  predictions: number;
  actually_accurate: number;
  calibration_score: number;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

export const analyticsRouter = Router();

// --- GET /accuracy — accuracy breakdown over time ---
analyticsRouter.get('/accuracy', queryRateLimit, async (req, res) => {
  try {
    const domain = req.query.domain as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;

    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (domain) {
      conditions.push(`i.domain = $${paramIdx++}`);
      params.push(domain);
    }
    if (from) {
      conditions.push(`f.submitted_at >= $${paramIdx++}`);
      params.push(from);
    }
    if (to) {
      conditions.push(`f.submitted_at <= $${paramIdx++}`);
      params.push(to);
    }

    const where = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    const { rows } = await query<{
      period: string;
      total: string;
      accurate: string;
      partially_accurate: string;
      inaccurate: string;
    }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('week', f.submitted_at), 'YYYY-MM-DD') AS period,
         COUNT(*)::TEXT AS total,
         COUNT(*) FILTER (WHERE f.rating = 'accurate')::TEXT AS accurate,
         COUNT(*) FILTER (WHERE f.rating = 'partially_accurate')::TEXT AS partially_accurate,
         COUNT(*) FILTER (WHERE f.rating = 'inaccurate')::TEXT AS inaccurate
       FROM feedback f
       JOIN investigations i ON i.id = f.investigation_id
       ${where}
       GROUP BY DATE_TRUNC('week', f.submitted_at)
       ORDER BY DATE_TRUNC('week', f.submitted_at) ASC`,
      params,
    );

    const data: AccuracyPeriod[] = rows.map((row) => {
      const total = parseInt(row.total, 10);
      const accurate = parseInt(row.accurate, 10);
      return {
        period: row.period,
        total,
        accurate,
        partially_accurate: parseInt(row.partially_accurate, 10),
        inaccurate: parseInt(row.inaccurate, 10),
        accuracy_rate: total > 0 ? accurate / total : 0,
      };
    });

    res.json({ data });
  } catch (err) {
    log.error('Failed to compute accuracy analytics', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- GET /calibration — confidence calibration per bracket ---
analyticsRouter.get('/calibration', queryRateLimit, async (req, res) => {
  try {
    // Define confidence brackets: [lower, upper)
    const brackets: Array<[number, number]> = [
      [0.0, 0.5],
      [0.5, 0.6],
      [0.6, 0.7],
      [0.7, 0.8],
      [0.8, 0.9],
      [0.9, 1.01], // 1.01 to include confidence = 1.0
    ];

    const { rows } = await query<{
      confidence: number;
      rating: string;
    }>(
      `SELECT i.confidence, f.rating
       FROM feedback f
       JOIN investigations i ON i.id = f.investigation_id
       WHERE i.confidence IS NOT NULL`,
    );

    // Bayesian update logic: for each bracket, compute the calibration score.
    // calibration_score = |predicted_confidence - observed_accuracy|
    // A perfectly calibrated model has calibration_score = 0.
    // We use a Bayesian prior of Beta(1,1) = uniform to smooth small samples.
    const data: CalibrationBracket[] = brackets.map(([lower, upper]) => {
      const inBracket = rows.filter(
        (r) => r.confidence >= lower && r.confidence < upper,
      );

      const predictions = inBracket.length;
      const actuallyAccurate = inBracket.filter(
        (r) => r.rating === 'accurate',
      ).length;

      // Bayesian posterior mean: (successes + alpha) / (total + alpha + beta)
      // With Beta(1,1) prior (uniform): (accurate + 1) / (total + 2)
      const alpha = 1;
      const beta = 1;
      const posteriorMean = (actuallyAccurate + alpha) / (predictions + alpha + beta);

      // Midpoint of the bracket as the "predicted" confidence
      const midpoint = (lower + Math.min(upper, 1.0)) / 2;

      // Calibration score = absolute difference between predicted and observed
      const calibrationScore = predictions > 0
        ? Math.abs(midpoint - posteriorMean)
        : 0;

      return {
        confidence_range: `${lower.toFixed(1)}-${Math.min(upper, 1.0).toFixed(1)}`,
        predictions,
        actually_accurate: actuallyAccurate,
        calibration_score: Math.round(calibrationScore * 1000) / 1000,
      };
    });

    res.json({ data });
  } catch (err) {
    log.error('Failed to compute calibration analytics', {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(500).json({ error: 'Internal server error' });
  }
});
