import { query } from '../db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Feedback {
  id: string;
  investigation_id: string;
  rating: 'accurate' | 'partially_accurate' | 'inaccurate';
  corrected_root_cause: string | null;
  submitted_by: string | null;
  submitted_at: Date;
}

export interface CreateFeedbackInput {
  investigation_id: string;
  rating: 'accurate' | 'partially_accurate' | 'inaccurate';
  corrected_root_cause?: string;
  submitted_by?: string;
}

export interface AccuracyStats {
  total: number;
  accurate: number;
  partially_accurate: number;
  inaccurate: number;
  accuracy_rate: number;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function create(input: CreateFeedbackInput): Promise<Feedback> {
  const { rows } = await query<Feedback>(
    `INSERT INTO feedback (investigation_id, rating, corrected_root_cause, submitted_by)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [
      input.investigation_id,
      input.rating,
      input.corrected_root_cause ?? null,
      input.submitted_by ?? null,
    ],
  );
  return rows[0];
}

export async function getByInvestigation(investigationId: string): Promise<Feedback[]> {
  const { rows } = await query<Feedback>(
    `SELECT * FROM feedback
     WHERE investigation_id = $1
     ORDER BY submitted_at DESC`,
    [investigationId],
  );
  return rows;
}

export async function getAccuracyStats(
  filters: { domain?: string; from?: string; to?: string } = {},
): Promise<AccuracyStats> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.domain) {
    conditions.push(`i.domain = $${paramIdx++}`);
    params.push(filters.domain);
  }
  if (filters.from) {
    conditions.push(`f.submitted_at >= $${paramIdx++}`);
    params.push(filters.from);
  }
  if (filters.to) {
    conditions.push(`f.submitted_at <= $${paramIdx++}`);
    params.push(filters.to);
  }

  const where = conditions.length > 0
    ? `WHERE ${conditions.join(' AND ')}`
    : '';

  const { rows } = await query<{
    total: string;
    accurate: string;
    partially_accurate: string;
    inaccurate: string;
  }>(
    `SELECT
       COUNT(*)::TEXT AS total,
       COUNT(*) FILTER (WHERE f.rating = 'accurate')::TEXT AS accurate,
       COUNT(*) FILTER (WHERE f.rating = 'partially_accurate')::TEXT AS partially_accurate,
       COUNT(*) FILTER (WHERE f.rating = 'inaccurate')::TEXT AS inaccurate
     FROM feedback f
     JOIN investigations i ON i.id = f.investigation_id
     ${where}`,
    params,
  );

  const total = parseInt(rows[0].total, 10);
  const accurate = parseInt(rows[0].accurate, 10);
  const partiallyAccurate = parseInt(rows[0].partially_accurate, 10);
  const inaccurate = parseInt(rows[0].inaccurate, 10);

  return {
    total,
    accurate,
    partially_accurate: partiallyAccurate,
    inaccurate,
    accuracy_rate: total > 0 ? accurate / total : 0,
  };
}
