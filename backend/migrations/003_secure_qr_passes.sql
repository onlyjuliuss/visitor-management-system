ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS qr_token_hash TEXT,
  ADD COLUMN IF NOT EXISTS qr_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_revoked BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS qr_last_scanned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS qr_scan_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_visitors_qr_token_hash
  ON visitors (qr_token_hash);

CREATE INDEX IF NOT EXISTS idx_visitors_qr_expires_at
  ON visitors (qr_expires_at);
