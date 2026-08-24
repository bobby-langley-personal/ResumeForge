-- Run in Supabase SQL editor → Dashboard → SQL Editor
-- Tracks cron job invocations: prevents overlapping runs and records last outcome.

CREATE TABLE IF NOT EXISTS cron_runs (
  name TEXT PRIMARY KEY,
  status TEXT CHECK (status IN ('running', 'succeeded', 'failed')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  sent_count INTEGER
);

ALTER TABLE cron_runs ENABLE ROW LEVEL SECURITY;
-- No policies added — service role only, same pattern as api_logs.
