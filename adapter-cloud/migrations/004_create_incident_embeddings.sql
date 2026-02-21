-- Migration 004: Create incident_embeddings table
-- Stores vector embeddings for semantic similarity search across incidents
-- Requires the pgvector extension (https://github.com/pgvector/pgvector)

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS incident_embeddings (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    embedding         vector(1536) NOT NULL,
    summary           TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Vector similarity index using IVFFlat for approximate nearest-neighbor search
CREATE INDEX idx_incident_embeddings_investigation_id ON incident_embeddings (investigation_id);
CREATE INDEX idx_incident_embeddings_vector ON incident_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
