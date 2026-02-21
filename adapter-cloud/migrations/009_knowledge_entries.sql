-- Migration 009: Knowledge entries — lifecycle-managed knowledge derived from
-- approved recommendations and corroborated feedback.

CREATE TABLE IF NOT EXISTS knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('known_issue', 'pattern', 'memory_update')),
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  confidence TEXT NOT NULL DEFAULT 'provisional'
    CHECK (confidence IN ('provisional', 'active', 'archived')),
  source TEXT NOT NULL CHECK (source IN ('human', 'agent', 'corroborated')),
  source_recommendation_id UUID REFERENCES recommendations(id),
  source_feedback_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

CREATE INDEX idx_knowledge_entries_service ON knowledge_entries(service);
CREATE INDEX idx_knowledge_entries_confidence ON knowledge_entries(confidence);
CREATE UNIQUE INDEX idx_knowledge_entries_source_rec_unique
  ON knowledge_entries(source_recommendation_id) WHERE source_recommendation_id IS NOT NULL;
