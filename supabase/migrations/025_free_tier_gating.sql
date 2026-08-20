-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Adds free-tier gating counters to users table, chat_enabled flag to applications,
-- and user_events table for product telemetry

-- users: lifetime counters for gated features
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS chat_unlocked_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interview_prep_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS experience_interview_count INTEGER NOT NULL DEFAULT 0;

-- applications: whether this specific application has AI chat enabled
-- Set to true for the first 3 applications generated per user (lifetime)
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS chat_enabled BOOLEAN NOT NULL DEFAULT false;

-- user_events: product telemetry (frustration signals, upgrade funnel, feature usage)
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
