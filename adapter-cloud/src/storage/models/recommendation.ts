import { query } from '../db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Recommendation {
  id: string;
  type: string;
  target: string;
  current_value: string | null;
  proposed_value: string | null;
  rationale: string;
  expected_impact: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'applied';
  reviewer: string | null;
  review_note: string | null;
  created_at: Date;
  reviewed_at: Date | null;
  applied_at: Date | null;
}

export interface CreateRecommendationInput {
  type: string;
  target: string;
  current_value?: string;
  proposed_value?: string;
  rationale: string;
  expected_impact?: string;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function create(input: CreateRecommendationInput): Promise<Recommendation> {
  const { rows } = await query<Recommendation>(
    `INSERT INTO recommendations (type, target, current_value, proposed_value, rationale, expected_impact)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      input.type,
      input.target,
      input.current_value ?? null,
      input.proposed_value ?? null,
      input.rationale,
      input.expected_impact ?? null,
    ],
  );
  return rows[0];
}

export async function getById(id: string): Promise<Recommendation | null> {
  const { rows } = await query<Recommendation>(
    'SELECT * FROM recommendations WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function list(
  filters: { status?: string } = {},
  limit = 50,
  offset = 0,
): Promise<{ data: Recommendation[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM recommendations ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query<Recommendation>(
    `SELECT * FROM recommendations ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { data: rows, total };
}

export async function approve(
  id: string,
  reviewer: string,
  note?: string,
): Promise<Recommendation | null> {
  const { rows } = await query<Recommendation>(
    `UPDATE recommendations
     SET status = 'approved', reviewer = $1, review_note = $2, reviewed_at = NOW()
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [reviewer, note ?? null, id],
  );
  return rows[0] ?? null;
}

export async function reject(
  id: string,
  reviewer: string,
  note: string,
): Promise<Recommendation | null> {
  const { rows } = await query<Recommendation>(
    `UPDATE recommendations
     SET status = 'rejected', reviewer = $1, review_note = $2, reviewed_at = NOW()
     WHERE id = $3 AND status = 'pending'
     RETURNING *`,
    [reviewer, note, id],
  );
  return rows[0] ?? null;
}

export async function markApplied(id: string): Promise<Recommendation | null> {
  const { rows } = await query<Recommendation>(
    `UPDATE recommendations
     SET status = 'applied', applied_at = NOW()
     WHERE id = $1 AND status = 'approved'
     RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}
