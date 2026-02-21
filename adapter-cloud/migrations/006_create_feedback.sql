-- Migration 006: Create feedback table
-- Tracks user feedback on investigation accuracy for calibration

CREATE TABLE feedback (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investigation_id    UUID REFERENCES investigations(id) NOT NULL,
    rating              VARCHAR(30) NOT NULL CHECK (rating IN ('accurate', 'partially_accurate', 'inaccurate')),
    corrected_root_cause TEXT,
    submitted_by        VARCHAR(100),
    submitted_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_feedback_investigation ON feedback(investigation_id);
CREATE INDEX idx_feedback_rating ON feedback(rating);
