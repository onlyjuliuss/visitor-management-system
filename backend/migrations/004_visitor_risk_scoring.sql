ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS risk_score INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS risk_level TEXT NOT NULL DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS risk_reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS last_risk_evaluated_at TIMESTAMPTZ;

ALTER TABLE visitors
  DROP CONSTRAINT IF EXISTS visitors_risk_level_check;

ALTER TABLE visitors
  ADD CONSTRAINT visitors_risk_level_check
  CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));

CREATE INDEX IF NOT EXISTS idx_visitors_risk_level
  ON visitors (risk_level);

CREATE INDEX IF NOT EXISTS idx_visitors_risk_score
  ON visitors (risk_score DESC);
