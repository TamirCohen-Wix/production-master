-- Migration 002: Create agent_runs table
-- Records each agent execution within an investigation

CREATE TABLE IF NOT EXISTS agent_runs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    agent_name        TEXT NOT NULL,
    phase             TEXT NOT NULL,
    model             TEXT NOT NULL,
    status            TEXT NOT NULL DEFAULT 'pending',
    input_tokens      INTEGER DEFAULT 0,
    output_tokens     INTEGER DEFAULT 0,
    duration_ms       INTEGER DEFAULT 0,
    output_path       TEXT,
    error             TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retrieve all runs for a given investigation
CREATE INDEX idx_agent_runs_investigation_id ON agent_runs (investigation_id);
