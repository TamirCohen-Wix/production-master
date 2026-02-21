-- Migration 008: Bundle schema hardening + MCP tool call persistence
-- Align runtime schema expectations with database shape and add forward-only
-- MCP call persistence for bundle export.

-- pgcrypto extension is now enabled in migration 001

-- ---------------------------------------------------------------------------
-- investigations: align with runtime writes/reads
-- ---------------------------------------------------------------------------
ALTER TABLE investigations
  ALTER COLUMN domain DROP NOT NULL;

ALTER TABLE investigations
  ALTER COLUMN trigger_source SET DEFAULT 'api';

ALTER TABLE investigations
  ADD COLUMN IF NOT EXISTS mode TEXT DEFAULT 'balanced',
  ADD COLUMN IF NOT EXISTS callback_url TEXT,
  ADD COLUMN IF NOT EXISTS requested_by TEXT DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS batch_id UUID,
  ADD COLUMN IF NOT EXISTS current_phase TEXT DEFAULT 'intake';

UPDATE investigations
SET mode = COALESCE(mode, 'balanced'),
    requested_by = COALESCE(requested_by, 'unknown'),
    current_phase = COALESCE(current_phase, 'intake');

-- ---------------------------------------------------------------------------
-- agent_runs: keep legacy columns and add runtime metadata columns
-- ---------------------------------------------------------------------------
ALTER TABLE agent_runs
  ALTER COLUMN phase DROP NOT NULL;

ALTER TABLE agent_runs
  ADD COLUMN IF NOT EXISTS iterations INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS token_usage JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS stop_reason TEXT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Missing runtime tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS investigation_phases (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    phase             TEXT NOT NULL,
    output            TEXT NOT NULL,
    duration_ms       INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_phases_investigation_id
  ON investigation_phases (investigation_id, created_at);

CREATE TABLE IF NOT EXISTS investigation_reports (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    verdict           TEXT NOT NULL,
    confidence        REAL NOT NULL DEFAULT 0,
    summary           TEXT NOT NULL,
    evidence          JSONB NOT NULL DEFAULT '{}'::jsonb,
    recommendations   JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investigation_reports_investigation_id
  ON investigation_reports (investigation_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hypothesis_iterations (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    iteration         INTEGER NOT NULL,
    hypothesis        TEXT NOT NULL,
    confidence        REAL NOT NULL DEFAULT 0,
    evidence_summary  TEXT NOT NULL DEFAULT '',
    verified          BOOLEAN NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hypothesis_iterations_investigation_id
  ON hypothesis_iterations (investigation_id, iteration);

CREATE TABLE IF NOT EXISTS agent_outputs (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    agent_name        TEXT NOT NULL,
    content           TEXT NOT NULL,
    token_usage       JSONB NOT NULL DEFAULT '{}'::jsonb,
    iterations        INTEGER NOT NULL DEFAULT 1,
    stop_reason       TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_outputs_investigation_id
  ON agent_outputs (investigation_id, created_at);

-- ---------------------------------------------------------------------------
-- Forward-only MCP call persistence for debug bundles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mcp_tool_calls (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id  UUID REFERENCES investigations(id) ON DELETE SET NULL,
    phase             TEXT,
    agent_name        TEXT,
    tool_use_id       TEXT,
    server_name       TEXT NOT NULL,
    tool_name         TEXT NOT NULL,
    request_payload   JSONB,
    response_payload  JSONB,
    is_error          BOOLEAN NOT NULL DEFAULT FALSE,
    error_message     TEXT,
    duration_ms       INTEGER NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_investigation_id
  ON mcp_tool_calls (investigation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_mcp_tool_calls_server_tool
  ON mcp_tool_calls (server_name, tool_name, created_at);
