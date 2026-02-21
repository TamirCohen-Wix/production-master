import { query } from '../db.js';

export interface Investigation {
  id: string;
  ticket_id: string;
  domain: string;
  status: string;
  phase: string;
  verdict: string | null;
  confidence: number | null;
  trigger_source: string;
  report_url: string | null;
  findings_summary: Record<string, unknown>;
  error: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateInvestigationInput {
  ticket_id: string;
  domain: string;
  trigger_source: string;
  status?: string;
  phase?: string;
}

export async function create(input: CreateInvestigationInput): Promise<Investigation> {
  const { rows } = await query<Investigation>(
    `INSERT INTO investigations (ticket_id, domain, trigger_source, status, phase)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      input.ticket_id,
      input.domain,
      input.trigger_source,
      input.status ?? 'pending',
      input.phase ?? 'intake',
    ],
  );
  return rows[0];
}

export async function getById(id: string): Promise<Investigation | null> {
  const { rows } = await query<Investigation>(
    'SELECT * FROM investigations WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function updatePhase(id: string, phase: string): Promise<Investigation | null> {
  const { rows } = await query<Investigation>(
    `UPDATE investigations SET phase = $1, updated_at = NOW()
     WHERE id = $2 RETURNING *`,
    [phase, id],
  );
  return rows[0] ?? null;
}

export async function updateVerdict(
  id: string,
  verdict: string,
  confidence: number,
  findingsSummary: Record<string, unknown>,
): Promise<Investigation | null> {
  const { rows } = await query<Investigation>(
    `UPDATE investigations
     SET verdict = $1, confidence = $2, findings_summary = $3, updated_at = NOW()
     WHERE id = $4 RETURNING *`,
    [verdict, confidence, JSON.stringify(findingsSummary), id],
  );
  return rows[0] ?? null;
}

export async function updateStatus(
  id: string,
  status: string,
  error?: string,
): Promise<Investigation | null> {
  const { rows } = await query<Investigation>(
    `UPDATE investigations
     SET status = $1, error = $2, updated_at = NOW()
     WHERE id = $3 RETURNING *`,
    [status, error ?? null, id],
  );
  return rows[0] ?? null;
}

export async function list(
  filters: { status?: string; domain?: string } = {},
  limit = 50,
  offset = 0,
): Promise<Investigation[]> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.status) {
    conditions.push(`status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters.domain) {
    conditions.push(`domain = $${paramIdx++}`);
    params.push(filters.domain);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query<Investigation>(
    `SELECT * FROM investigations ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );
  return rows;
}
