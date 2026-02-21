/**
 * Embedding Generator — produces vector embeddings from investigation report
 * summaries and stores them in the incident_embeddings table for semantic
 * similarity search.
 *
 * Uses OpenAI text-embedding-3-small (1536 dimensions) via the REST API.
 */

import { query } from '../storage/db.js';
import { createLogger } from '../observability/index.js';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

const log = createLogger('worker:embedding-generator');

const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Call the OpenAI embeddings API to generate a vector for the given text.
 */
async function fetchEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `OpenAI embeddings API returned ${response.status}: ${body}`,
    );
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  if (!data.data?.[0]?.embedding) {
    throw new Error('Unexpected response shape from OpenAI embeddings API');
  }

  return data.data[0].embedding;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate a vector embedding from the investigation summary and store it
 * in the incident_embeddings table.
 *
 * Call this after an investigation completes and the report summary is
 * available.
 *
 * @param investigationId - UUID of the completed investigation
 * @param summary - Plain-text report summary to embed
 */
export async function generateAndStoreEmbedding(
  investigationId: string,
  summary: string,
): Promise<void> {
  log.info('Generating embedding for investigation', { investigationId });

  const embedding = await fetchEmbedding(summary);

  // pgvector expects the vector as a string literal: '[0.1,0.2,...]'
  const vectorLiteral = `[${embedding.join(',')}]`;

  await query(
    `INSERT INTO incident_embeddings (investigation_id, embedding, summary)
     VALUES ($1, $2, $3)
     ON CONFLICT (investigation_id) DO UPDATE
       SET embedding = EXCLUDED.embedding,
           summary   = EXCLUDED.summary`,
    [investigationId, vectorLiteral, summary],
  );

  log.info('Embedding stored successfully', { investigationId });
}
