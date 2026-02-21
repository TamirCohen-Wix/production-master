CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  target VARCHAR(200) NOT NULL,
  current_value TEXT,
  proposed_value TEXT,
  rationale TEXT NOT NULL,
  expected_impact TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'applied')),
  reviewer VARCHAR(100),
  review_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  applied_at TIMESTAMPTZ
);
CREATE INDEX idx_recommendations_status ON recommendations(status);
