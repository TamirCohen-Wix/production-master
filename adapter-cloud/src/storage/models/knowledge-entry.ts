import { query } from '../db.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface KnowledgeEntry {
  id: string;
  service: string;
  category: 'known_issue' | 'pattern' | 'memory_update';
  title: string;
  content: Record<string, unknown>;
  confidence: 'provisional' | 'active' | 'archived';
  source: 'human' | 'agent' | 'corroborated';
  source_recommendation_id: string | null;
  source_feedback_ids: string[];
  created_at: Date;
  last_verified_at: Date;
  archived_at: Date | null;
}

export interface CreateKnowledgeEntryInput {
  service: string;
  category: 'known_issue' | 'pattern' | 'memory_update';
  title: string;
  content?: Record<string, unknown>;
  confidence?: 'provisional' | 'active' | 'archived';
  source: 'human' | 'agent' | 'corroborated';
  source_recommendation_id?: string;
  source_feedback_ids?: string[];
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function create(input: CreateKnowledgeEntryInput): Promise<KnowledgeEntry> {
  const { rows } = await query<KnowledgeEntry>(
    `INSERT INTO knowledge_entries
       (service, category, title, content, confidence, source, source_recommendation_id, source_feedback_ids)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.service,
      input.category,
      input.title,
      JSON.stringify(input.content ?? {}),
      input.confidence ?? 'provisional',
      input.source,
      input.source_recommendation_id ?? null,
      input.source_feedback_ids ?? [],
    ],
  );
  return rows[0];
}

export async function getById(id: string): Promise<KnowledgeEntry | null> {
  const { rows } = await query<KnowledgeEntry>(
    'SELECT * FROM knowledge_entries WHERE id = $1',
    [id],
  );
  return rows[0] ?? null;
}

export async function list(
  filters: { service?: string; category?: string; confidence?: string } = {},
  limit = 50,
  offset = 0,
): Promise<{ data: KnowledgeEntry[]; total: number }> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (filters.service) {
    conditions.push(`service = $${paramIdx++}`);
    params.push(filters.service);
  }
  if (filters.category) {
    conditions.push(`category = $${paramIdx++}`);
    params.push(filters.category);
  }
  if (filters.confidence) {
    conditions.push(`confidence = $${paramIdx++}`);
    params.push(filters.confidence);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const countResult = await query<{ count: string }>(
    `SELECT COUNT(*) as count FROM knowledge_entries ${where}`,
    params,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { rows } = await query<KnowledgeEntry>(
    `SELECT * FROM knowledge_entries ${where}
     ORDER BY created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
    [...params, limit, offset],
  );

  return { data: rows, total };
}

export async function updateConfidence(
  id: string,
  confidence: 'provisional' | 'active' | 'archived',
): Promise<KnowledgeEntry | null> {
  const { rows } = await query<KnowledgeEntry>(
    `UPDATE knowledge_entries
     SET confidence = $1
     WHERE id = $2
     RETURNING *`,
    [confidence, id],
  );
  return rows[0] ?? null;
}

export async function archive(id: string): Promise<KnowledgeEntry | null> {
  const { rows } = await query<KnowledgeEntry>(
    `UPDATE knowledge_entries
     SET confidence = 'archived', archived_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

export async function verify(id: string): Promise<KnowledgeEntry | null> {
  const { rows } = await query<KnowledgeEntry>(
    `UPDATE knowledge_entries
     SET last_verified_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [id],
  );
  return rows[0] ?? null;
}

export async function exportByService(service: string): Promise<KnowledgeEntry[]> {
  const { rows } = await query<KnowledgeEntry>(
    `SELECT * FROM knowledge_entries
     WHERE service = $1 AND confidence != 'archived'
     ORDER BY category, created_at DESC`,
    [service],
  );
  return rows;
}
