-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Tracks product usage events and feature interactions for admin visibility.
-- Used for gating telemetry (paywall hits, locked-feature clicks, upgrade funnel).

CREATE TABLE IF NOT EXISTS user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  event TEXT NOT NULL,
  properties JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON user_events(event);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;
-- No policies — service role only, same pattern as api_logs and cron_runs.
