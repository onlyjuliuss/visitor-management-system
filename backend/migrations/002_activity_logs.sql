CREATE TABLE IF NOT EXISTS activity_logs (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_identifier TEXT NOT NULL DEFAULT '',
  visitor_id INTEGER NULL REFERENCES visitors(id) ON DELETE SET NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip_address TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at_desc
  ON activity_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_event_type
  ON activity_logs (event_type);

CREATE INDEX IF NOT EXISTS idx_activity_logs_severity
  ON activity_logs (severity);

CREATE INDEX IF NOT EXISTS idx_activity_logs_visitor_id
  ON activity_logs (visitor_id);
