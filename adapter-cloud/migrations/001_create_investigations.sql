-- Migration 001: Create investigations table
-- Tracks each investigation lifecycle from trigger to verdict

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS investigations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       TEXT NOT NULL,
    domain          TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    phase           TEXT NOT NULL DEFAULT 'intake',
    verdict         TEXT,
    confidence      REAL,
    trigger_source  TEXT NOT NULL,
    report_url      TEXT,
    findings_summary JSONB DEFAULT '{}',
    error           TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookup by ticket (most common query path)
CREATE INDEX idx_investigations_ticket_id ON investigations (ticket_id);

-- Filter/sort by status for dashboards and queue draining
CREATE INDEX idx_investigations_status ON investigations (status);
