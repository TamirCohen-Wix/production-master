import { query } from '../storage/db.js';
import { createLogger } from '../observability/index.js';
import { getEmbeddingForText } from './embedding-generator.js';

const log = createLogger('worker:incident-retrieval');

export interface SimilarIncident {
  investigation_id: string;
  ticket_id: string;
  summary: string;
  similarity_score: number;
}

/**
 * Retrieves semantically similar incidents based on an arbitrary text query.
 * Falls back gracefully when embeddings cannot be generated or pgvector
 * querying fails.
 */
export async function findSimilarIncidentsFromText(
  text: string,
  limit = 3,
): Promise<SimilarIncident[]> {
  const safeLimit = Math.min(20, Math.max(1, limit));
  const trimmed = text.trim();
  if (!trimmed) return [];

  try {
    const embedding = await getEmbeddingForText(trimmed);
    const vectorLiteral = `[${embedding.join(',')}]`;

    const result = await query<SimilarIncident>(
      `SELECT ie.investigation_id,
              i.ticket_id,
              ie.summary,
              1 - (ie.embedding <=> $1) AS similarity_score
       FROM incident_embeddings ie
       JOIN investigations i ON ie.investigation_id = i.id
       ORDER BY ie.embedding <=> $1
       LIMIT $2`,
      [vectorLiteral, safeLimit],
    );

    return result.rows.filter((row) => Number.isFinite(row.similarity_score));
  } catch (err) {
    log.warn('Failed to retrieve similar incidents from text', {
      error: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
