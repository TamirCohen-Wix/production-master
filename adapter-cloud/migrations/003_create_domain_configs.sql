-- Migration 003: Create domain_configs table
-- Stores per-repo domain configuration and Claude instructions

CREATE TABLE IF NOT EXISTS domain_configs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo        TEXT NOT NULL UNIQUE,
    config      JSONB NOT NULL DEFAULT '{}',
    claude_md   TEXT DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
