-- Schema for visitor-management backend (PostgreSQL / Supabase)
-- Matches backend/services/visitor_service.go

CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  purpose TEXT NOT NULL,
  host_name TEXT NOT NULL,
  photo_url TEXT NOT NULL DEFAULT '',
  qr_code TEXT NOT NULL UNIQUE,
  sign_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sign_out_time TIMESTAMPTZ NULL,
  status TEXT NOT NULL DEFAULT 'in'
    CHECK (LOWER(status) IN ('in', 'out'))
);

CREATE INDEX IF NOT EXISTS idx_visitors_status_lower
  ON visitors (LOWER(status));

-- UTC calendar date: timestamptz::date is not IMMUTABLE (depends on session TZ), so Postgres rejects it in indexes.
-- Simple index (safe)
CREATE INDEX IF NOT EXISTS idx_visitors_sign_in_time
  ON visitors (sign_in_time);
