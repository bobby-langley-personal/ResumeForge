-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Creates the ext_logs table for Chrome extension event telemetry

CREATE TABLE IF NOT EXISTS ext_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     text,
  event       text NOT NULL,
  platform    text,
  method      text,
  severity    text NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error')),
  payload     jsonb,
  ext_version text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ext_logs_created_at_idx ON ext_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ext_logs_user_id_idx    ON ext_logs (user_id);
CREATE INDEX IF NOT EXISTS ext_logs_event_idx      ON ext_logs (event);
CREATE INDEX IF NOT EXISTS ext_logs_severity_idx   ON ext_logs (severity);
