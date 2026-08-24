-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Adds a source column to api_logs to distinguish webapp vs. Chrome extension calls.

ALTER TABLE api_logs ADD COLUMN IF NOT EXISTS source TEXT; -- 'webapp' | 'extension'
CREATE INDEX IF NOT EXISTS idx_api_logs_source ON api_logs(source) WHERE source IS NOT NULL;
