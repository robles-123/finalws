-- Migration: add seminar time and certificate columns
-- Run this in Supabase SQL editor to add missing columns to existing installations

ALTER TABLE IF EXISTS seminars
  ADD COLUMN IF NOT EXISTS start_datetime timestamptz NULL,
  ADD COLUMN IF NOT EXISTS end_datetime timestamptz NULL,
  ADD COLUMN IF NOT EXISTS start_time text NULL,
  ADD COLUMN IF NOT EXISTS end_time text NULL,
  ADD COLUMN IF NOT EXISTS certificate_template_url text NULL;

-- Optional: create an index on start_datetime for ordering
CREATE INDEX IF NOT EXISTS idx_seminars_start_datetime ON seminars(start_datetime);

-- Note: run this in Supabase SQL (SQL editor) or apply via your DB migration tooling.
