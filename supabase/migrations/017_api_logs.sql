-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Stores API request/response logs for admin monitoring and debugging

CREATE TABLE IF NOT EXISTS api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,                       -- NULL for unauthenticated requests
  route TEXT NOT NULL,                -- e.g. /api/generate-documents
  method TEXT NOT NULL DEFAULT 'POST',
  status_code INTEGER,
  request_body JSONB,                 -- sanitized (long strings truncated)
  response_summary JSONB,             -- small summary, not full response
  error TEXT,                         -- error message if status >= 400
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_logs_user_id ON api_logs(user_id);
CREATE INDEX idx_api_logs_created_at ON api_logs(created_at DESC);
CREATE INDEX idx_api_logs_route ON api_logs(route);
CREATE INDEX idx_api_logs_status_code ON api_logs(status_code);
CREATE INDEX idx_api_logs_error ON api_logs(error) WHERE error IS NOT NULL;

-- Enable RLS — only the service role (used server-side) can access this table.
-- No policies are added, so anon/authenticated keys are blocked entirely.
ALTER TABLE api_logs ENABLE ROW LEVEL SECURITY;
